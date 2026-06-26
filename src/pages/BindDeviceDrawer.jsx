/**
 * BindDeviceDrawer.jsx
 * Admin-side device activation: admin identifies a physical TPE by scanning its
 * printed QR sticker (serial number) or entering its 6-digit activation code,
 * then the device is immediately bound to the selected agent.
 */

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'

const ERROR_MAP = [
  { match: /introuvable|not found/i, fr: 'Appareil introuvable. Vérifiez le code ou le QR.' },
  {
    match: /déjà assigné|already (assigned|claimed)/i,
    fr: 'Cet appareil est déjà lié à un agent.',
  },
  {
    match: /agent.*déjà.*appareil/i,
    fr: "Cet agent a déjà un appareil. Désactivez l'ancien d'abord.",
  },
  { match: /hors service|maintenance|lost/i, fr: 'Appareil hors service — contactez le support.' },
  { match: /hors agence|unauthorized/i, fr: 'Appareil ou agent hors agence.' },
  { match: /network|fetch|NetworkError/i, fr: 'Erreur réseau. Vérifiez votre connexion.' },
]

function localizeError(err, fallback) {
  const raw = err?.message ?? ''
  if (raw) console.warn('[BindDeviceDrawer] raw error:', raw)
  const entry = ERROR_MAP.find(({ match }) => match.test(raw) || match.test(err?.name ?? ''))
  return entry ? entry.fr : fallback
}

export function BindDeviceDrawer({ agent, onClose }) {
  const activateDevice = useMutation(api.devices.activateForAgent)

  const [activeTab, setActiveTab] = useState('code') // 'code' | 'qr'
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null) // { serialNumber }

  // Activation code inputs
  const codeInputs = useRef([])
  const [codeDigits, setCodeDigits] = useState(['', '', '', '', '', ''])

  // QR scanner
  const videoRef = useRef(null)
  const [cameraError, setCameraError] = useState(null)
  const scanningRef = useRef(false)
  const processingRef = useRef(false)

  const branchLabel = typeof agent.branch === 'string' ? agent.branch : (agent.branch?.name ?? '—')

  const handleActivate = useCallback(
    async (identifier) => {
      if (processingRef.current || success) return
      processingRef.current = true
      setLoading(true)
      setError(null)
      try {
        const result = await activateDevice({ agentId: agent.id, ...identifier })
        setSuccess({ serialNumber: result.serialNumber })
        setTimeout(onClose, 1600)
      } catch (err) {
        setError(localizeError(err, "Erreur lors de l'activation"))
        if (identifier.activationCode) {
          setCodeDigits(['', '', '', '', '', ''])
          codeInputs.current[0]?.focus()
        } else {
          // Resume QR scanning on serial-lookup failure
          scanningRef.current = true
        }
      } finally {
        setLoading(false)
        processingRef.current = false
      }
    },
    [success, activateDevice, agent.id, onClose]
  )

  // Keep a stable ref so the QR loop never captures a stale handleActivate
  const handleActivateRef = useRef(handleActivate)
  useEffect(() => {
    handleActivateRef.current = handleActivate
  }, [handleActivate])

  // QR scanner effect — depends only on activeTab so camera doesn't restart on loading changes
  useEffect(() => {
    if (activeTab !== 'qr') return
    scanningRef.current = true
    const hasBD = 'BarcodeDetector' in window
    let localStream
    const localVideo = videoRef.current

    async function start() {
      try {
        localStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        })
        if (localVideo) localVideo.srcObject = localStream
        if (!hasBD) {
          setCameraError('Scanner natif indisponible sur ce navigateur.')
          setActiveTab('code')
          return
        }
        const detector = new BarcodeDetector({ formats: ['qr_code', 'code_128', 'code_39'] })
        const loop = async () => {
          if (!scanningRef.current || !localVideo) return
          try {
            const results = await detector.detect(localVideo)
            if (results?.length > 0) {
              const raw = results[0].rawValue
              let serialNumber = raw.trim()
              try {
                const parsed = JSON.parse(raw)
                serialNumber = parsed.serialNumber || parsed.sn || parsed.serial || raw.trim()
              } catch {
                /* plain-text serial */
              }
              if (serialNumber) {
                scanningRef.current = false
                await handleActivateRef.current({ serialNumber })
                return
              }
            }
          } catch (err) {
            setCameraError(localizeError(err, 'Erreur de lecture'))
            scanningRef.current = false
            return
          }
          requestAnimationFrame(loop)
        }
        requestAnimationFrame(loop)
      } catch (err) {
        setCameraError(
          err?.name === 'NotAllowedError'
            ? "Permission caméra refusée — passez au code d'activation"
            : localizeError(err, 'Erreur caméra')
        )
        setActiveTab('code')
      }
    }

    start()

    return () => {
      scanningRef.current = false
      if (localVideo?.srcObject) {
        localVideo.srcObject.getTracks().forEach((t) => t.stop())
        localVideo.srcObject = null
      }
    }
  }, [activeTab])

  // Auto-focus first code input when tab is active
  useEffect(() => {
    if (activeTab === 'code') {
      codeInputs.current[0]?.focus()
    }
  }, [activeTab])

  const handleSwitchTab = (tab) => {
    setActiveTab(tab)
    setCameraError(null)
    setError(null)
  }

  const focusCode = (idx) => codeInputs.current[idx]?.focus()

  const handleCodeChange = async (e, idx) => {
    const v = e.target.value.replace(/[^0-9]/g, '')
    const next = [...codeDigits]
    if (!v) {
      next[idx] = ''
      setCodeDigits(next)
      return
    }
    next[idx] = v.slice(-1)
    setCodeDigits(next)
    if (idx < 5) focusCode(idx + 1)
    const combined = next.join('')
    if (combined.length === 6 && !next.includes('')) {
      await handleActivate({ activationCode: combined })
    }
  }

  const handleCodeKeyDown = (e, idx) => {
    if (e.key === 'Backspace' && !codeDigits[idx] && idx > 0) focusCode(idx - 1)
  }

  const handleCodePaste = async (e) => {
    const pasted = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    const next = ['', '', '', '', '', '']
    for (let i = 0; i < pasted.length; i++) next[i] = pasted[i]
    setCodeDigits(next)
    if (pasted.length === 6) await handleActivate({ activationCode: pasted })
    else focusCode(pasted.length)
  }

  return (
    <>
      <div className="bdd-scrim" onClick={onClose} />
      <div className="bdd-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="bdd-head">
          <div>
            <div className="bdd-head__title">Activer l&apos;appareil</div>
            <div className="bdd-head__sub">
              {agent.name} · {branchLabel}
            </div>
          </div>
          <button className="btn ghost sm bdd-head__close" onClick={onClose} aria-label="Fermer">
            ×
          </button>
        </div>

        <div className="bdd-body">
          {success ? (
            <div className="bdd-success-banner">
              <span className="bdd-success-banner__icon">✓</span>
              Appareil <strong>{success.serialNumber}</strong> activé pour{' '}
              <strong>{agent.name}</strong> — fermeture en cours…
            </div>
          ) : (
            <>
              <div className="bdd-tabs">
                <button
                  className={`bdd-tab${activeTab === 'code' ? ' on' : ''}`}
                  onClick={() => handleSwitchTab('code')}
                >
                  Code d&apos;activation
                </button>
                <button
                  className={`bdd-tab${activeTab === 'qr' ? ' on' : ''}`}
                  onClick={() => handleSwitchTab('qr')}
                >
                  Scanner le QR
                </button>
              </div>

              {error && (
                <div className="bdd-error" role="alert" style={{ margin: '12px 0' }}>
                  {error}
                </div>
              )}

              {activeTab === 'code' && (
                <section className="bdd-section">
                  <div className="bdd-cred-label" style={{ marginBottom: 16 }}>
                    Saisissez le code à 6 chiffres imprimé sur le boîtier de l&apos;appareil.
                  </div>
                  <div
                    onPaste={handleCodePaste}
                    style={{ display: 'flex', gap: 8, justifyContent: 'center' }}
                  >
                    {codeDigits.map((d, i) => (
                      <input
                        key={i}
                        ref={(el) => (codeInputs.current[i] = el)}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        value={d}
                        onChange={(e) => handleCodeChange(e, i)}
                        onKeyDown={(e) => handleCodeKeyDown(e, i)}
                        aria-label={`Chiffre ${i + 1}`}
                        className="bdd-pin-input"
                        disabled={loading}
                      />
                    ))}
                  </div>
                  {loading && (
                    <div className="bdd-cred-note" style={{ marginTop: 14, textAlign: 'center' }}>
                      Activation en cours…
                    </div>
                  )}
                  <div className="bdd-cred-note" style={{ marginTop: 14 }}>
                    Le code est imprimé sur l&apos;étiquette du boîtier TPE. Il est également
                    visible dans la liste des appareils enregistrés.
                  </div>
                </section>
              )}

              {activeTab === 'qr' && (
                <section className="bdd-section">
                  <div className="bdd-cred-label" style={{ marginBottom: 12 }}>
                    Pointez la caméra vers le code QR imprimé sur l&apos;appareil.
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'center', margin: '0 0 12px' }}>
                    <video
                      ref={videoRef}
                      autoPlay
                      muted
                      playsInline
                      style={{
                        width: 220,
                        height: 220,
                        borderRadius: 10,
                        background: '#000',
                        display: 'block',
                      }}
                    />
                  </div>
                  {loading && (
                    <div className="bdd-cred-note" style={{ textAlign: 'center', marginBottom: 8 }}>
                      Activation en cours…
                    </div>
                  )}
                  {cameraError && (
                    <div className="bdd-error" role="alert">
                      {cameraError}
                      <div style={{ marginTop: 6 }}>
                        <button className="btn ghost sm" onClick={() => handleSwitchTab('code')}>
                          Passer au code
                        </button>
                      </div>
                    </div>
                  )}
                </section>
              )}
            </>
          )}
        </div>

        <div className="bdd-foot">
          <button className="btn" onClick={onClose}>
            {success ? 'OK' : 'Annuler'}
          </button>
        </div>
      </div>
    </>
  )
}
