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

const ERROR_MAP = [
  { match: /not found|introuvable/i, fr: 'Appareil introuvable.' },
  { match: /already (claimed|bound)|déjà lié/i, fr: 'Cet appareil est déjà lié à un agent.' },
  { match: /expired|expiré/i, fr: 'Les identifiants ont expiré. Veuillez regénérer.' },
  { match: /unauthorized|non autorisé/i, fr: 'Action non autorisée.' },
  { match: /network|fetch|NetworkError/i, fr: 'Erreur réseau. Vérifiez votre connexion.' },
  { match: /overcapacity|rate.?limit/i, fr: 'Trop de tentatives. Réessayez dans un moment.' },
]

function localizeError(err, fallback) {
  const raw = err?.message ?? ''
  if (raw) console.warn('[BindDeviceDrawer] raw error:', raw)
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
  const unboundDevices =
    useQuery(api.devices.listUnbound, isLoaded && tenantId ? { branchId: tenantId } : 'skip') ?? []

  const generateCreds = useMutation(api.devices.generateBindingCredentials)

  const [selectedDeviceId, setSelectedDeviceId] = useState('')
  const [creds, setCreds] = useState(null)
  const [loading, setLoading] = useState(false)
  const [genError, setGenError] = useState(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [successBanner, setSuccessBanner] = useState(false)
  const [copied, setCopied] = useState(false)

  const timerRef = useRef(null)
  const expired = secondsLeft <= 0 && creds != null

  // watch agent doc — auto-close when mobile app assigns the device
  const agentDoc = useQuery(
    api.agents.getById,
    isLoaded && agent?.id ? { userId: agent.id } : 'skip'
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
  }, [agentDoc?.device?.serialNumber, agent.device?.serialNumber, creds, onClose])

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

  const handleCopyPin = useCallback(async () => {
    if (!creds?.pin || copied) return
    try {
      await navigator.clipboard.writeText(creds.pin)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // clipboard not available
    }
  }, [creds, copied])

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

          {/* State A — device picker */}
          {!creds && (
            <section className="bdd-section">
              <div className="bdd-section__title">Sélectionner un TPE disponible</div>
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
                {loading ? 'Génération…' : 'Démarrer la liaison'}
              </button>
            </section>
          )}

          {/* State B — QR display (manager shows this to the agent) */}
          {creds && (
            <>
              <div className="bdd-device-pill">
                <span
                  className={`bdd-device-pill__dot${expired ? ' bdd-device-pill__dot--expired' : ''}`}
                />
                TPE&nbsp;: <strong>{creds.deviceSerial}</strong>
              </div>

              <div className="bdd-qr-center">
                <div className={`bdd-qr-card${expired ? ' bdd-qr-card--expired' : ''}`}>
                  <div className={`bdd-qr-wrap${expired ? ' bdd-qr-wrap--expired' : ''}`}>
                    <QRCodeSVG value={qrValue} size={220} level="H" />
                  </div>

                  <Countdown secondsLeft={secondsLeft} expired={expired} />

                  <div className="bdd-cred-label" style={{ marginTop: 16 }}>
                    PIN secours
                  </div>
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
                    {copied ? 'Copié ✓' : "Cliquer pour copier · à communiquer à l'agent"}
                  </div>
                </div>

                {expired && (
                  <div className="bdd-expiry-banner" style={{ marginTop: 12 }}>
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
              </div>
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
