/**
 * BindDeviceDrawer.jsx
 * QR scanner + 6-digit PIN flow for agents to claim a device.
 * Accessibility-friendly and feature-detected (BarcodeDetector fallback to PIN).
 */

import React, { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { QRCodeSVG } from 'qrcode.react'

const VALIDITY_SECONDS = 600 // 10 minutes

function fmtCountdown(secs) {
  if (secs <= 0) return '0:00'
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

/**
 * Maps known backend error codes / message substrings to French UI strings.
 * Always logs the raw message for debugging, never surfaces it to the user.
 */
const ERROR_MAP = [
  { match: /not found|introuvable/i, fr: 'Appareil introuvable.' },
  { match: /already (claimed|bound)|déjà lié/i, fr: 'Cet appareil est déjà lié à un agent.' },
  { match: /expired|expiré/i, fr: 'Les identifiants ont expiré. Veuillez regénérer.' },
  { match: /invalid.*(pin|token)|pin.*invalid/i, fr: 'Code PIN invalide ou expiré.' },
  { match: /unauthorized|non autorisé/i, fr: 'Action non autorisée.' },
  { match: /network|fetch|NetworkError/i, fr: 'Erreur réseau. Vérifiez votre connexion.' },
  { match: /permission|NotAllowedError/i, fr: 'Permission refusée.' },
  { match: /overcapacity|rate.?limit/i, fr: 'Trop de tentatives. Réessayez dans un moment.' },
]

function localizeError(err, fallback) {
  const raw = err?.message ?? ''
  if (raw) console.debug('[BindDeviceDrawer] raw error:', raw)
  const entry = ERROR_MAP.find(({ match }) => match.test(raw) || match.test(err?.name ?? ''))
  return entry ? entry.fr : fallback
}

function Countdown({ secondsLeft, expired }) {
  const pct = Math.max(0, secondsLeft / VALIDITY_SECONDS) * 100
  const arcColor = expired
    ? 'var(--border-strong)'
    : secondsLeft < 60
      ? 'var(--neg)'
      : secondsLeft < 180
        ? 'var(--warn)'
        : 'var(--pos)'
  const circumference = 2 * Math.PI * 18
  return (
    <div className="bdd-countdown">
      <svg className="bdd-countdown__ring" width={44} height={44}>
        <circle cx={22} cy={22} r={18} fill="none" stroke="var(--border)" strokeWidth={3} />
        <circle
          cx={22}
          cy={22}
          r={18}
          fill="none"
          stroke={arcColor}
          strokeWidth={3}
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - pct / 100)}
          strokeLinecap="round"
          className="bdd-countdown__arc"
        />
      </svg>
      <span className={`bdd-countdown__label${expired ? ' bdd-countdown__label--expired' : ''}`}>
        {expired ? 'Expiré' : fmtCountdown(secondsLeft)}
      </span>
    </div>
  )
}

export function BindDeviceDrawer({ agent, tenantId, isLoaded, onClose }) {
  const _unbound = useQuery(
    api.devices.listUnbound,
    isLoaded && tenantId ? { branchId: tenantId } : 'skip'
  )
  const unboundDevices = _unbound ?? []

  // manager actions
  const generateCreds = useMutation(api.devices.generateBindingCredentials)

  // agent claim mutations
  const claimByToken = useMutation(api.devices.claimDeviceByToken)
  const claimByPin = useMutation(api.devices.claimDeviceByPin)

  const [selectedDeviceId, setSelectedDeviceId] = useState('')
  const [creds, setCreds] = useState(null)
  const [loading, setLoading] = useState(false)
  const [genError, setGenError] = useState(null)

  const [secondsLeft, setSecondsLeft] = useState(0)
  const timerRef = useRef(null)
  const expired = secondsLeft <= 0 && creds != null

  // scanner state
  const [activeTab, setActiveTab] = useState('qr')
  const [cameraError, setCameraError] = useState(null)
  const videoRef = useRef(null)
  const detectorRef = useRef(null)
  const scanningRef = useRef(false)

  // PIN inputs
  const pinInputs = useRef([])
  const [pinDigits, setPinDigits] = useState(['', '', '', '', '', ''])
  const [pinError, setPinError] = useState(null)

  // success banner
  const [successBanner, setSuccessBanner] = useState(false)

  // copy PIN feedback
  const [copied, setCopied] = useState(false)
  const handleCopyPin = useCallback(async () => {
    if (!creds?.pin || copied) return
    try {
      await navigator.clipboard.writeText(creds.pin)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* fallback: select text */
    }
  }, [creds, copied])

  // watch for agent doc changes (assigned device) to auto-close
  const agentDoc = useQuery(
    api.agents.getById,
    isLoaded && agent?.id ? { agentId: agent.id } : 'skip'
  )
  useEffect(() => {
    if (
      creds &&
      agentDoc?.device?.serialNumber === creds.deviceSerial &&
      agentDoc?.device?.serialNumber !== agent.device?.serialNumber
    ) {
      const tBanner = setTimeout(() => setSuccessBanner(true), 0)
      const tClose = setTimeout(onClose, 1400)
      return () => {
        clearTimeout(tBanner)
        clearTimeout(tClose)
      }
    }
  }, [agentDoc?.device?.serialNumber, creds, onClose])

  // timer
  function startTimer(expiresAt) {
    clearInterval(timerRef.current)
    const tick = () => {
      const remaining = Math.max(0, Math.round((expiresAt - Date.now()) / 1000))
      setSecondsLeft(remaining)
      if (remaining <= 0) clearInterval(timerRef.current)
    }
    tick()
    timerRef.current = setInterval(tick, 1000)
  }
  useEffect(() => () => clearInterval(timerRef.current), [])

  const handleGenerate = useCallback(async () => {
    if (!selectedDeviceId) return
    setLoading(true)
    setGenError(null)
    try {
      const res = await generateCreds({ deviceId: selectedDeviceId })
      const normalized = {
        token: res?.token ?? '',
        pin: res?.pin ?? '------',
        deviceSerial: res?.deviceSerial ?? selectedDeviceId,
        expiresAt: res?.expiresAt ?? Date.now() + VALIDITY_SECONDS * 1000,
      }
      setCreds(normalized)
      startTimer(normalized.expiresAt)
    } catch (err) {
      setGenError(localizeError(err, 'Erreur lors de la génération'))
    } finally {
      setLoading(false)
    }
  }, [selectedDeviceId, generateCreds])

  // QR scanner effect
  useEffect(() => {
    if (!creds || activeTab !== 'qr') return
    queueMicrotask(() => setCameraError(null))
    const hasBD = 'BarcodeDetector' in window
    let stream
    const localVideo = videoRef.current
    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        if (localVideo) localVideo.srcObject = stream
        if (!hasBD) {
          setCameraError('Appareil compatible mais Scanner natif indisponible; basculez vers PIN')
          setActiveTab('pin')
          return
        }
        detectorRef.current = new BarcodeDetector({ formats: ['qr_code'] })
        scanningRef.current = true
        const loop = async () => {
          if (!scanningRef.current) return
          try {
            const results = await detectorRef.current.detect(localVideo)
            if (results && results.length > 0) {
              for (const r of results) {
                try {
                  const raw = r.rawValue
                  const payload = JSON.parse(raw)
                  const token = payload?.token
                  if (token) {
                    setLoading(true)
                    try {
                      await claimByToken({ token })
                      setSuccessBanner(true)
                      setTimeout(onClose, 1200)
                      return
                    } catch (err) {
                      setGenError(localizeError(err, 'Erreur de liaison'))
                    } finally {
                      setLoading(false)
                    }
                  }
                } catch {
                  // ignore non-JSON QR payloads
                }
              }
            }
          } catch (err) {
            setCameraError(localizeError(err, 'Erreur caméra'))
            setActiveTab('pin')
            return
          }
          requestAnimationFrame(loop)
        }
        requestAnimationFrame(loop)
      } catch (err) {
        setCameraError(
          err?.name === 'NotAllowedError'
            ? 'Permission caméra refusée'
            : localizeError(err, 'Erreur caméra')
        )
        setActiveTab('pin')
      }
    }
    start()
    return () => {
      scanningRef.current = false
      if (detectorRef.current) detectorRef.current = null
      if (localVideo && localVideo.srcObject) {
        const tracks = localVideo.srcObject.getTracks()
        tracks.forEach((t) => t.stop())
        localVideo.srcObject = null
      }
    }
  }, [creds, activeTab, claimByToken, onClose])

  // PIN handling
  useEffect(() => {
    queueMicrotask(() => {
      setPinDigits(['', '', '', '', '', ''])
      setPinError(null)
    })
  }, [creds])

  const focusInput = (idx) => {
    const el = pinInputs.current[idx]
    if (el) el.focus()
  }

  const handlePinChange = async (e, idx) => {
    const v = e.target.value.replace(/[^0-9]/g, '')
    const next = [...pinDigits]
    if (v === '') {
      next[idx] = ''
      setPinDigits(next)
      return
    }
    const digit = v.slice(-1)
    next[idx] = digit
    setPinDigits(next)
    if (idx < 5) focusInput(idx + 1)
    const combined = next.join('')
    if (combined.length === 6 && !next.includes('')) {
      setLoading(true)
      setPinError(null)
      try {
        await claimByPin({ pin: combined })
        setSuccessBanner(true)
        setTimeout(onClose, 1200)
      } catch (err) {
        setPinError(localizeError(err, 'Code PIN invalide ou expiré'))
        setPinDigits(['', '', '', '', '', ''])
        focusInput(0)
      } finally {
        setLoading(false)
      }
    }
  }

  const handlePinKeyDown = (e, idx) => {
    if (e.key === 'Backspace' && pinDigits[idx] === '' && idx > 0) focusInput(idx - 1)
  }

  const handlePinPaste = (e) => {
    const pasted = (e.clipboardData.getData('text') || '').replace(/\D/g, '').slice(0, 6)
    if (!pasted) return
    const arr = pasted.split('')
    const next = ['', '', '', '', '', '']
    for (let i = 0; i < arr.length; i++) next[i] = arr[i]
    setPinDigits(next)
    if (arr.length === 6) {
      ;(async () => {
        setLoading(true)
        setPinError(null)
        try {
          await claimByPin({ pin: arr.join('') })
          setSuccessBanner(true)
          setTimeout(onClose, 1200)
        } catch (err) {
          setPinError(localizeError(err, 'Code PIN invalide ou expiré'))
          setPinDigits(['', '', '', '', '', ''])
        } finally {
          setLoading(false)
        }
      })()
    } else focusInput(arr.length)
  }

  const qrValue = creds
    ? JSON.stringify({ token: creds.token, deviceSerial: creds.deviceSerial, branchId: tenantId })
    : ''

  const branchLabel = typeof agent.branch === 'string' ? agent.branch : (agent.branch?.name ?? '—')
  const drawerTitle = agent.device?.serialNumber ? "Changer d'appareil" : 'Lier un appareil'

  return (
    <>
      <div className="bdd-scrim" onClick={onClose} />
      <div className="bdd-drawer" onClick={(e) => e.stopPropagation()}>
        <div className="bdd-head">
          <div>
            <div className="bdd-head__title">{drawerTitle}</div>
            <div className="bdd-head__sub">
              {agent.name} · {branchLabel}
            </div>
          </div>
          <button className="btn ghost sm bdd-head__close" onClick={onClose} aria-label="Fermer">
            ×
          </button>
        </div>

        <div className="bdd-body">
          {successBanner && (
            <div className="bdd-success-banner">
              <span className="bdd-success-banner__icon">✓</span>
              Appareil lié avec succès — fermeture en cours…
            </div>
          )}

          {!creds && (
            <section className="bdd-section">
              <div className="bdd-section__title">1. Sélectionner un appareil disponible</div>
              {unboundDevices.length === 0 ? (
                <div className="bdd-empty-devices">
                  Aucun TPE non-assigné actif dans cette agence.
                </div>
              ) : (
                <select
                  className="filter-select bdd-device-select"
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                >
                  <option value="">— Choisir un TPE —</option>
                  {unboundDevices.map((d) => (
                    <option key={d._id} value={d._id}>
                      {d.serialNumber} · {d.model}
                    </option>
                  ))}
                </select>
              )}

              {genError && (
                <div className="bdd-error" role="alert">
                  {genError}
                </div>
              )}

              <button
                className="btn brand bdd-generate-btn"
                disabled={!selectedDeviceId || loading}
                onClick={handleGenerate}
              >
                {loading ? 'Génération…' : 'Générer les identifiants de liaison'}
              </button>
            </section>
          )}

          {creds && (
            <>
              <div className="bdd-device-pill">
                <span
                  className={`bdd-device-pill__dot${expired ? ' bdd-device-pill__dot--expired' : ''}`}
                />
                TPE : <strong>{creds.deviceSerial}</strong>
              </div>

              <div className="bdd-tabs">
                <button
                  className={`bdd-tab${activeTab === 'qr' ? ' on' : ''}`}
                  onClick={() => setActiveTab('qr')}
                >
                  Scanner le QR
                </button>
                <button
                  className={`bdd-tab${activeTab === 'pin' ? ' on' : ''}`}
                  onClick={() => setActiveTab('pin')}
                >
                  Saisir le code PIN
                </button>
              </div>

              <div className="bdd-creds-grid">
                <div className={`bdd-cred-panel${expired ? ' bdd-cred-panel--expired' : ''}`}>
                  <div className="bdd-qr-scanner">
                    {activeTab === 'qr' && (
                      <div>
                        <div className="bdd-video-wrap">
                          <video
                            ref={videoRef}
                            autoPlay
                            muted
                            playsInline
                            style={{ width: 180, height: 180, borderRadius: 8, background: '#000' }}
                          />
                        </div>
                        <div style={{ marginTop: 8, textAlign: 'center' }}>
                          <div className="bdd-cred-label">Ouvrez la caméra et scannez le QR</div>
                          {cameraError && (
                            <div className="bdd-error" role="alert">
                              {cameraError}
                              <div style={{ marginTop: 6 }}>
                                <button
                                  className="btn ghost sm"
                                  onClick={() => setActiveTab('pin')}
                                >
                                  Passer au PIN
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div
                      className={`bdd-qr-wrap${expired ? ' bdd-qr-wrap--expired' : ''}`}
                      aria-hidden
                    >
                      <QRCodeSVG value={qrValue} size={128} level="M" />
                    </div>
                  </div>

                  <Countdown secondsLeft={secondsLeft} expired={expired} />
                </div>

                <div className={`bdd-cred-panel${expired ? ' bdd-cred-panel--expired' : ''}`}>
                  <div className="bdd-cred-label">Code PIN à communiquer à l'agent</div>
                  <div
                    className={`bdd-pin-code${copied ? ' bdd-pin-code--copied' : ''}`}
                    onClick={handleCopyPin}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        handleCopyPin()
                      }
                    }}
                    role="button"
                    tabIndex={0}
                    title="Cliquer pour copier"
                  >
                    <span>{creds.pin.slice(0, 3)}</span>
                    <span className="bdd-pin-code__sep">–</span>
                    <span>{creds.pin.slice(3)}</span>
                    <span className="bdd-pin-code__copy">{copied ? '✓' : '⧉'}</span>
                  </div>
                  <div className="bdd-pin-code__hint">
                    {copied ? 'Copié dans le presse-papiers' : 'Cliquer pour copier'}
                  </div>
                  <div className="bdd-cred-label" style={{ marginTop: 16 }}>
                    Entrez le PIN à 6 chiffres
                  </div>
                  <div
                    onPaste={handlePinPaste}
                    style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 8 }}
                  >
                    {pinDigits.map((d, i) => (
                      <input
                        key={i}
                        ref={(el) => (pinInputs.current[i] = el)}
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength={1}
                        value={d}
                        onChange={(e) => handlePinChange(e, i)}
                        onKeyDown={(e) => handlePinKeyDown(e, i)}
                        aria-label={`Chiffre ${i + 1}`}
                        className="bdd-pin-input"
                      />
                    ))}
                  </div>
                  {pinError && (
                    <div className="bdd-error" role="alert" style={{ marginTop: 8 }}>
                      {pinError}
                    </div>
                  )}
                  <div className="bdd-cred-note" style={{ marginTop: 10 }}>
                    Vous n'avez pas de code ? Demandez à votre responsable.
                  </div>

                  <Countdown secondsLeft={secondsLeft} expired={expired} />
                </div>
              </div>

              {expired && (
                <div className="bdd-expiry-banner">
                  <span className="bdd-expiry-banner__icon">⏱</span>
                  <div className="bdd-expiry-banner__body">
                    <div className="bdd-expiry-banner__title">Code expiré</div>
                    <div className="bdd-expiry-banner__sub">
                      Les identifiants ne sont plus valides. Générez-en de nouveaux.
                    </div>
                  </div>
                  <button className="btn brand" onClick={handleGenerate} disabled={loading}>
                    {loading ? 'Génération…' : 'Regénérer'}
                  </button>
                </div>
              )}

              {!expired && (
                <button
                  className="btn ghost sm bdd-back-btn"
                  onClick={() => {
                    setCreds(null)
                    clearInterval(timerRef.current)
                  }}
                >
                  ← Choisir un autre appareil
                </button>
              )}
            </>
          )}
        </div>

        <div className="bdd-foot">
          <button className="btn" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </>
  )
}
