/**
 * BindDeviceDrawer.jsx
 * Liaison TPE/agent via QR code ou PIN à 6 chiffres.
 * Tous les styles sont dans kauri.css (classes préfixées .bdd-*)
 */

import { useState, useEffect, useCallback, useRef } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { QRCodeSVG } from 'qrcode.react'

// ─── constantes ───────────────────────────────────────────────────────────────
const VALIDITY_SECONDS = 600 // 10 min

// ─── helpers ──────────────────────────────────────────────────────────────────
function fmtCountdown(secs) {
  if (secs <= 0) return '0:00'
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

// ─── PinDisplay ───────────────────────────────────────────────────────────────
function PinDisplay({ pin, expired }) {
  const digits = (pin ?? '------').split('')
  return (
    <div className={`bdd-pin${expired ? ' bdd-pin--expired' : ''}`}>
      {digits.map((d, i) => (
        <span key={i} className="bdd-pin__digit">
          {d}
          {i < digits.length - 1 && <span className="bdd-pin__sep">·</span>}
        </span>
      ))}
    </div>
  )
}

// ─── Countdown ring ───────────────────────────────────────────────────────────
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

// ─── Composant principal ──────────────────────────────────────────────────────
export function BindDeviceDrawer({ agent, tenantId, isLoaded, onClose }) {
  // ── sélection appareil ──
  const unboundDevices =
    useQuery(api.devices.listUnbound, isLoaded && tenantId ? { branchId: tenantId } : 'skip') ?? []
  const [selectedDeviceId, setSelectedDeviceId] = useState('')

  // ── identifiants ──
  const generateCreds = useMutation(api.agents.generateBindingCredentials)
  const [creds, setCreds] = useState(null)
  const [loading, setLoading] = useState(false)
  const [genError, setGenError] = useState(null)

  // ── minuterie ──
  const [secondsLeft, setSecondsLeft] = useState(0)
  const timerRef = useRef(null)
  const expired = secondsLeft <= 0 && creds != null

  // ── bannière succès ──
  const [successBanner, setSuccessBanner] = useState(false)

  // ── fermeture réactive quand l'agent reçoit un appareil ──
  const agentDoc = useQuery(
    api.agents.getById,
    isLoaded && agent?.id ? { agentId: agent.id } : 'skip'
  )
  useEffect(() => {
    if (agentDoc?.device?.serialNumber && creds) {
      // setTimeout(0) sort le setState du cycle de rendu synchrone de l'effet
      const tBanner = setTimeout(() => setSuccessBanner(true), 0)
      const tClose = setTimeout(onClose, 2200)
      return () => {
        clearTimeout(tBanner)
        clearTimeout(tClose)
      }
    }
  }, [agentDoc?.device?.serialNumber, creds, onClose])

  // ── démarrage/relance minuterie ──
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

  // ── génération / regénération ──
  const handleGenerate = useCallback(async () => {
    if (!selectedDeviceId) return
    setLoading(true)
    setGenError(null)
    try {
      const result = await generateCreds({ agentId: agent.id, deviceId: selectedDeviceId })
      // Validation défensive : le backend doit retourner ces champs.
      // On les normalise ici pour ne pas casser le rendu si l'un est absent.
      const normalized = {
        token: result?.token ?? '',
        pin: result?.pin ?? '------',
        deviceSerial: result?.deviceSerial ?? selectedDeviceId,
        expiresAt: result?.expiresAt ?? Date.now() + VALIDITY_SECONDS * 1000,
      }
      if (!result?.expiresAt || !result?.deviceSerial) {
        console.warn(
          '[BindDeviceDrawer] generateBindingCredentials: expiresAt ou deviceSerial absent,' +
            ' valeurs de fallback utilisées. Vérifier issue #89.'
        )
      }
      setCreds(normalized)
      startTimer(normalized.expiresAt)
    } catch (err) {
      setGenError(err?.message ?? 'Erreur lors de la génération')
    } finally {
      setLoading(false)
    }
  }, [agent.id, selectedDeviceId, generateCreds])

  // ── payload QR ──
  const qrValue = creds
    ? JSON.stringify({ token: creds.token, deviceSerial: creds.deviceSerial, branchId: tenantId })
    : ''

  const drawerTitle = agent.device?.id !== '—' ? "Changer d'appareil" : 'Lier un appareil'

  return (
    <>
      {/* fond semi-transparent */}
      <div className="bdd-scrim" onClick={onClose} />

      {/* tiroir */}
      <div className="bdd-drawer" onClick={(e) => e.stopPropagation()}>
        {/* ── en-tête ── */}
        <div className="bdd-head">
          <div>
            <div className="bdd-head__title">{drawerTitle}</div>
            <div className="bdd-head__sub">
              {agent.name} · {agent.branch}
            </div>
          </div>
          <button className="btn ghost sm bdd-head__close" onClick={onClose} aria-label="Fermer">
            ×
          </button>
        </div>

        {/* ── corps scrollable ── */}
        <div className="bdd-body">
          {/* bannière succès */}
          {successBanner && (
            <div className="bdd-success-banner">
              <span className="bdd-success-banner__icon">✓</span>
              Appareil lié avec succès — fermeture en cours…
            </div>
          )}

          {/* étape 1 — sélection appareil */}
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

              {genError && <div className="bdd-error">{genError}</div>}

              <button
                className="btn brand bdd-generate-btn"
                disabled={!selectedDeviceId || loading}
                onClick={handleGenerate}
              >
                {loading ? 'Génération…' : 'Générer les identifiants de liaison'}
              </button>
            </section>
          )}

          {/* étape 2 — panneaux QR + PIN */}
          {creds && (
            <>
              {/* pilule TPE actif */}
              <div className="bdd-device-pill">
                <span
                  className={`bdd-device-pill__dot${expired ? ' bdd-device-pill__dot--expired' : ''}`}
                />
                TPE : <strong>{creds.deviceSerial}</strong>
              </div>

              {/* grille QR | PIN */}
              <div className="bdd-creds-grid">
                {/* panneau QR */}
                <div className={`bdd-cred-panel${expired ? ' bdd-cred-panel--expired' : ''}`}>
                  <div className={`bdd-qr-wrap${expired ? ' bdd-qr-wrap--expired' : ''}`}>
                    <QRCodeSVG value={qrValue} size={128} level="M" />
                  </div>
                  <div className="bdd-cred-label">Scanner avec l'application agent</div>
                  <Countdown secondsLeft={secondsLeft} expired={expired} />
                </div>

                {/* panneau PIN */}
                <div className={`bdd-cred-panel${expired ? ' bdd-cred-panel--expired' : ''}`}>
                  <div className="bdd-pin-wrap">
                    <PinDisplay pin={creds.pin} expired={expired} />
                  </div>
                  <div className="bdd-cred-label">Ou saisir ce code sur l'appareil</div>
                  <Countdown secondsLeft={secondsLeft} expired={expired} />
                </div>
              </div>

              {/* message + bouton regénérer */}
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

              {/* retour sélection */}
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

        {/* ── pied ── */}
        <div className="bdd-foot">
          <button className="btn" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </>
  )
}
