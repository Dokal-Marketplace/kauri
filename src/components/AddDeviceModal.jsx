// src/components/AddDeviceModal.jsx
import { useState, useEffect, useCallback } from 'react'
import { useMutation, useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { QRCodeSVG } from 'qrcode.react'
import { I } from '../icons'

const TPE_MODELS = [
  'Ingenico iWL250',
  'Ingenico iCT250',
  'Ingenico Move/5000',
  'PAX A920',
  'PAX A80',
  'Verifone VX520',
  'Verifone VX680',
  'Castles S1F2',
]

function fmtCountdown(secs) {
  if (secs <= 0) return '0:00'
  const m = Math.floor(secs / 60)
  const s = secs % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function AddDeviceModal({ isOpen, onClose, onSuccess }) {
  const createDevice = useMutation(api.devices.createDevice)
  const generateCreds = useMutation(api.devices.generateRegistrationCredentials)

  // Mode selection
  const [mode, setMode] = useState(null) // null | 'manual' | 'tpe'

  // Manual mode state
  const [form, setForm] = useState({
    serialNumber: '',
    model: '',
    isLoading: false,
    errors: { form: null, serialNumber: null, model: null },
    successMsg: null,
  })

  // TPE mode state
  const [creds, setCreds] = useState(null) // { registrationId, token, pin, expiresAt }
  const [isGenerating, setIsGenerating] = useState(false)
  const [genError, setGenError] = useState(null)
  const [secondsLeft, setSecondsLeft] = useState(0)
  const [copied, setCopied] = useState(false)

  // Polling pour vérifier le statut d'enregistrement
  const registrationStatus = useQuery(
    api.devices.checkRegistrationStatus,
    creds?.registrationId ? { registrationId: creds.registrationId } : 'skip'
  )

  const { serialNumber, model, isLoading, errors, successMsg } = form
  const expired = secondsLeft <= 0 && creds != null
  const isCompleted = registrationStatus?.status === 'completed'

  // ── Reset ──────────────────────────────────────────────────────────────────
  const resetAll = useCallback(() => {
    setMode(null)
    setForm({
      serialNumber: '',
      model: '',
      isLoading: false,
      errors: { form: null, serialNumber: null, model: null },
      successMsg: null,
    })
    setCreds(null)
    setIsGenerating(false)
    setGenError(null)
    setSecondsLeft(0)
  }, [])

  const handleClose = useCallback(() => {
    resetAll()
    onClose()
  }, [onClose, resetAll])

  // ── Escape key ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isLoading && !isGenerating) handleClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isLoading, isGenerating, handleClose])

  // ── Countdown timer ────────────────────────────────────────────────────────
  useEffect(() => {
    if (!creds) return
    const tick = () => {
      const remaining = Math.max(0, Math.round((creds.expiresAt - Date.now()) / 1000))
      setSecondsLeft(remaining)
    }
    tick()
    const interval = setInterval(tick, 1000)
    return () => clearInterval(interval)
  }, [creds])

  // ── Auto-close quand l'enregistrement est terminé ──────────────────────────
  useEffect(() => {
    if (isCompleted) {
      const t = setTimeout(() => {
        onSuccess?.()
        handleClose()
      }, 2000)
      return () => clearTimeout(t)
    }
  }, [isCompleted, onSuccess, handleClose])

  // ── Validation mode manuel ─────────────────────────────────────────────────
  const validate = () => {
    const next = { form: null, serialNumber: null, model: null }
    let valid = true

    if (!serialNumber.trim()) {
      next.serialNumber = 'Le numéro de série est obligatoire.'
      valid = false
    } else if (serialNumber.trim().length < 3) {
      next.serialNumber = 'Le numéro de série doit contenir au moins 3 caractères.'
      valid = false
    }

    if (!model.trim()) {
      next.model = 'Le modèle est obligatoire.'
      valid = false
    }

    setForm((prev) => ({ ...prev, errors: next }))
    return valid
  }

  // ── Submit mode manuel ─────────────────────────────────────────────────────
  const handleSubmitManual = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setForm((prev) => ({
      ...prev,
      isLoading: true,
      errors: { form: null, serialNumber: null, model: null },
      successMsg: null,
    }))

    try {
      await createDevice({
        serialNumber: serialNumber.trim(),
        model: model.trim(),
      })
    } catch (err) {
      const raw = typeof err?.message === 'string' ? err.message : ''
      let nextErrors = {
        form: 'Une erreur est survenue lors de la création du TPE.',
        serialNumber: null,
        model: null,
      }

      if (/existe déjà|already exists|duplicate|serial/i.test(raw)) {
        nextErrors = {
          form: null,
          serialNumber: 'Ce numéro de série est déjà enregistré.',
          model: null,
        }
      }

      setForm((prev) => ({ ...prev, isLoading: false, errors: nextErrors }))
      return
    }

    setForm((prev) => ({
      ...prev,
      isLoading: false,
      successMsg: `TPE "${serialNumber.trim()}" ajouté avec succès.`,
      serialNumber: '',
      model: '',
    }))

    onSuccess?.()
    setTimeout(handleClose, 1500)
  }

  // ── Générer les credentials (mode TPE) ─────────────────────────────────────
  const handleGenerateCreds = async () => {
    setIsGenerating(true)
    setGenError(null)
    try {
      const result = await generateCreds()
      setCreds({
        registrationId: result.registrationId,
        token: result.token,
        pin: result.pin,
        expiresAt: result.expiresAt,
      })
    } catch (err) {
      setGenError(err?.message ?? 'Erreur lors de la génération des identifiants')
    } finally {
      setIsGenerating(false)
    }
  }

  // ── Copier le PIN ──────────────────────────────────────────────────────────
  const handleCopyPin = async () => {
    if (!creds?.pin || copied) return
    try {
      await navigator.clipboard.writeText(creds.pin)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* fallback */
    }
  }

  if (!isOpen) return null

  // ── Payload du QR code ─────────────────────────────────────────────────────
  const qrValue = creds ? JSON.stringify({ token: creds.token, type: 'device-registration' }) : ''

  return (
    <>
      {/* Scrim */}
      <div className="modal-scrim" onClick={isLoading || isGenerating ? undefined : handleClose} />

      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-device-modal-title"
      >
        {/* Header */}
        <div className="modal-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: 8,
                background: 'var(--brand-softer)',
                display: 'grid',
                placeItems: 'center',
                color: 'var(--brand-ink)',
                flexShrink: 0,
              }}
            >
              <I.Terminal size={16} />
            </span>
            <div>
              <h2 id="add-device-modal-title" style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>
                Ajouter un TPE
              </h2>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 1 }}>
                {mode === null
                  ? "Choisissez le mode d'enregistrement"
                  : mode === 'manual'
                    ? 'Saisie manuelle des informations'
                    : 'Enregistrement via le terminal'}
              </div>
            </div>
          </div>
          <button
            className="btn ghost sm"
            onClick={handleClose}
            disabled={isLoading || isGenerating}
            aria-label="Fermer"
            style={{ padding: 6 }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="modal-body">
          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* ÉTAPE 1 : Choix du mode                                        */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {mode === null && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <p style={{ fontSize: 13, color: 'var(--ink-2)', margin: '0 0 8px' }}>
                Comment souhaitez-vous enregistrer ce TPE ?
              </p>

              <button
                type="button"
                className="btn"
                onClick={() => setMode('tpe')}
                style={{
                  padding: '16px',
                  height: 'auto',
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 12,
                  textAlign: 'left',
                  justifyContent: 'flex-start',
                }}
              >
                <span
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: 'var(--brand-softer)',
                    display: 'grid',
                    placeItems: 'center',
                    color: 'var(--brand-ink)',
                    flexShrink: 0,
                  }}
                >
                  <I.Terminal size={18} />
                </span>
                <span style={{ flex: 1 }}>
                  <span
                    style={{ fontWeight: 600, fontSize: 14, display: 'block', marginBottom: 2 }}
                  >
                    Via le TPE (recommandé)
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.4 }}>
                    Un QR code et un code PIN seront générés. La personne sur le TPE choisit sa
                    méthode et les infos de l'appareil sont récupérées automatiquement.
                  </span>
                </span>
              </button>

              <button
                type="button"
                className="btn"
                onClick={() => setMode('manual')}
                style={{
                  padding: '16px',
                  height: 'auto',
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  gap: 12,
                  textAlign: 'left',
                  justifyContent: 'flex-start',
                }}
              >
                <span
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 8,
                    background: 'var(--surface-inset)',
                    display: 'grid',
                    placeItems: 'center',
                    color: 'var(--ink-2)',
                    flexShrink: 0,
                  }}
                >
                  <I.Edit size={18} />
                </span>
                <span style={{ flex: 1 }}>
                  <span
                    style={{ fontWeight: 600, fontSize: 14, display: 'block', marginBottom: 2 }}
                  >
                    Saisie manuelle
                  </span>
                  <span style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.4 }}>
                    Saisissez directement le numéro de série et le modèle du TPE.
                  </span>
                </span>
              </button>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* MODE MANUEL                                                     */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {mode === 'manual' && (
            <form onSubmit={handleSubmitManual} noValidate>
              {successMsg && (
                <div
                  role="status"
                  style={{
                    padding: 12,
                    marginBottom: 16,
                    backgroundColor: 'var(--green-1, #e6f9ed)',
                    border: '1px solid var(--green-2, #b2e5c2)',
                    borderRadius: 6,
                    fontSize: 13,
                    color: 'var(--green-6, #15803d)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <I.Check size={14} />
                  {successMsg}
                </div>
              )}

              {errors.form && (
                <div
                  role="alert"
                  style={{
                    padding: 12,
                    marginBottom: 16,
                    backgroundColor: 'var(--red-1)',
                    border: '1px solid var(--red-2)',
                    borderRadius: 6,
                    fontSize: 13,
                    color: 'var(--red-6)',
                  }}
                >
                  {errors.form}
                </div>
              )}

              <div className="form-group">
                <label className="form-label" htmlFor="device-serial">
                  Numéro de série
                </label>
                <input
                  id="device-serial"
                  type="text"
                  className={`form-input${errors.serialNumber ? ' input-error' : ''}`}
                  value={serialNumber}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      serialNumber: e.target.value.toUpperCase(),
                      errors: { ...prev.errors, serialNumber: null },
                    }))
                  }
                  placeholder="Ex: TPE-AG-0042"
                  disabled={isLoading}
                  autoFocus
                  autoComplete="off"
                />
                {errors.serialNumber && (
                  <p style={{ marginTop: 4, fontSize: 12, color: 'var(--red-6)' }}>
                    {errors.serialNumber}
                  </p>
                )}
              </div>

              <div className="form-group">
                <label className="form-label" htmlFor="device-model">
                  Modèle
                </label>
                <input
                  id="device-model"
                  type="text"
                  list="tpe-models-list"
                  className={`form-input${errors.model ? ' input-error' : ''}`}
                  value={model}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      model: e.target.value,
                      errors: { ...prev.errors, model: null },
                    }))
                  }
                  placeholder="Ex: Ingenico iWL250"
                  disabled={isLoading}
                  autoComplete="off"
                />
                <datalist id="tpe-models-list">
                  {TPE_MODELS.map((m) => (
                    <option key={m} value={m} />
                  ))}
                </datalist>
                {errors.model && (
                  <p style={{ marginTop: 4, fontSize: 12, color: 'var(--red-6)' }}>
                    {errors.model}
                  </p>
                )}
              </div>

              <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
                <button
                  type="button"
                  className="btn"
                  onClick={() => setMode(null)}
                  disabled={isLoading}
                >
                  ← Retour
                </button>
                <button type="submit" className="btn brand" disabled={isLoading || !!successMsg}>
                  {isLoading ? (
                    <>
                      <span className="btn-spinner" />
                      Création…
                    </>
                  ) : successMsg ? (
                    <>
                      <I.Check size={13} />
                      Ajouté
                    </>
                  ) : (
                    <>
                      <I.Plus size={13} />
                      Ajouter le TPE
                    </>
                  )}
                </button>
              </div>
            </form>
          )}

          {/* ═══════════════════════════════════════════════════════════════ */}
          {/* MODE VIA TPE                                                    */}
          {/* ═══════════════════════════════════════════════════════════════ */}
          {mode === 'tpe' && (
            <>
              {/* Erreur de génération */}
              {genError && (
                <div
                  role="alert"
                  style={{
                    padding: 12,
                    marginBottom: 16,
                    backgroundColor: 'var(--red-1)',
                    border: '1px solid var(--red-2)',
                    borderRadius: 6,
                    fontSize: 13,
                    color: 'var(--red-6)',
                  }}
                >
                  {genError}
                </div>
              )}

              {/* ── Avant génération ──────────────────────────────────────── */}
              {!creds && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  <div
                    style={{
                      padding: 14,
                      background: 'var(--surface-inset)',
                      borderRadius: 8,
                      fontSize: 13,
                      color: 'var(--ink-2)',
                      lineHeight: 1.5,
                    }}
                  >
                    <strong style={{ display: 'block', marginBottom: 6, color: 'var(--ink)' }}>
                      📋 Comment ça marche ?
                    </strong>
                    <ol style={{ margin: 0, paddingLeft: 20 }}>
                      <li>Un QR code et un code PIN seront générés (valides 10 min)</li>
                      <li>Communiquez les deux à la personne qui a le TPE en main</li>
                      <li>Elle choisit sa méthode préférée dans l'app TontiPro</li>
                      <li>Les informations du TPE sont récupérées automatiquement</li>
                    </ol>
                  </div>

                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    <button
                      type="button"
                      className="btn"
                      onClick={() => setMode(null)}
                      disabled={isGenerating}
                    >
                      ← Retour
                    </button>
                    <button
                      type="button"
                      className="btn brand"
                      onClick={handleGenerateCreds}
                      disabled={isGenerating}
                    >
                      {isGenerating ? (
                        <>
                          <span className="btn-spinner" />
                          Génération…
                        </>
                      ) : (
                        <>
                          <I.Terminal size={14} />
                          Générer les identifiants
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

              {/* ── Après génération : QR + PIN affichés ─────────────────── */}
              {creds && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {/* Bandeau de statut */}
                  {isCompleted && registrationStatus?.device && (
                    <div
                      style={{
                        padding: 14,
                        background: 'var(--green-1, #e6f9ed)',
                        border: '1px solid var(--green-2, #86efac)',
                        borderRadius: 8,
                        color: 'var(--green-8, #166534)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                      }}
                    >
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          background: 'var(--green-6, #16a34a)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <I.Check size={16} stroke="white" />
                      </div>
                      <div>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>
                          TPE enregistré avec succès !
                        </div>
                        <div style={{ fontSize: 12, marginTop: 2 }}>
                          {registrationStatus.device.serialNumber} ·{' '}
                          {registrationStatus.device.model}
                        </div>
                      </div>
                    </div>
                  )}

                  {expired && !isCompleted && (
                    <div
                      style={{
                        padding: 14,
                        background: 'var(--red-1, #fef2f2)',
                        border: '1px solid var(--red-2, #fecaca)',
                        borderRadius: 8,
                        color: 'var(--red-8, #991b1b)',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                      }}
                    >
                      <div
                        style={{
                          width: 28,
                          height: 28,
                          borderRadius: '50%',
                          background: 'var(--red-6, #dc2626)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          flexShrink: 0,
                        }}
                      >
                        <I.Close size={16} stroke="white" />
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 600, fontSize: 13 }}>
                          Les identifiants ont expiré
                        </div>
                        <div style={{ fontSize: 12, marginTop: 2 }}>
                          Veuillez en générer de nouveaux.
                        </div>
                      </div>
                      <button
                        type="button"
                        className="btn brand"
                        onClick={handleGenerateCreds}
                        disabled={isGenerating}
                        style={{ fontSize: 12 }}
                      >
                        Regénérer
                      </button>
                    </div>
                  )}

                  {/* QR Code + PIN côte à côte */}
                  {!expired && !isCompleted && (
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: 16,
                      }}
                    >
                      {/* QR Code */}
                      <div
                        style={{
                          padding: 16,
                          background: 'var(--surface-inset)',
                          borderRadius: 10,
                          textAlign: 'center',
                        }}
                      >
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: 'var(--ink-2)',
                            textTransform: 'uppercase',
                            letterSpacing: 0.5,
                            marginBottom: 12,
                          }}
                        >
                          Option 1 — QR Code
                        </div>
                        <div
                          style={{
                            background: 'white',
                            padding: 12,
                            borderRadius: 8,
                            display: 'inline-block',
                            border: '1px solid var(--border)',
                          }}
                        >
                          <QRCodeSVG value={qrValue} size={140} level="M" />
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: 'var(--ink-3)',
                            marginTop: 10,
                            lineHeight: 1.4,
                          }}
                        >
                          La personne scanne ce QR code dans l'app TontiPro
                        </div>
                      </div>

                      {/* PIN */}
                      <div
                        style={{
                          padding: 16,
                          background: 'var(--surface-inset)',
                          borderRadius: 10,
                          textAlign: 'center',
                        }}
                      >
                        <div
                          style={{
                            fontSize: 11,
                            fontWeight: 600,
                            color: 'var(--ink-2)',
                            textTransform: 'uppercase',
                            letterSpacing: 0.5,
                            marginBottom: 12,
                          }}
                        >
                          Option 2 — Code PIN
                        </div>
                        <div
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
                          style={{
                            background: 'white',
                            padding: '16px 20px',
                            borderRadius: 8,
                            border: '1px solid var(--border)',
                            fontFamily: 'var(--font-mono)',
                            fontSize: 28,
                            fontWeight: 700,
                            letterSpacing: 4,
                            color: 'var(--brand-ink)',
                            cursor: 'pointer',
                            display: 'inline-block',
                            userSelect: 'none',
                          }}
                        >
                          {creds.pin.slice(0, 3)} – {creds.pin.slice(3)}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: copied ? 'var(--green-6, #16a34a)' : 'var(--ink-3)',
                            marginTop: 10,
                            lineHeight: 1.4,
                          }}
                        >
                          {copied ? '✓ Copié dans le presse-papiers' : 'Cliquer pour copier'}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Countdown + statut d'attente */}
                  {!isCompleted && (
                    <div
                      style={{
                        padding: 14,
                        background: expired ? 'var(--surface-inset)' : 'var(--brand-softer)',
                        borderRadius: 8,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 12,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                        {!expired && (
                          <div
                            style={{
                              width: 8,
                              height: 8,
                              borderRadius: '50%',
                              background: 'var(--brand)',
                              animation: 'pulse 1.5s infinite',
                            }}
                          />
                        )}
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 500, color: 'var(--ink)' }}>
                            {expired
                              ? 'Identifiants expirés'
                              : isCompleted
                                ? 'Enregistrement terminé'
                                : "En attente de l'enregistrement sur le TPE..."}
                          </div>
                          <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
                            {expired
                              ? 'Générez de nouveaux identifiants'
                              : 'La personne sur le TPE choisit sa méthode (QR ou PIN)'}
                          </div>
                        </div>
                      </div>
                      {!expired && (
                        <div
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: 18,
                            fontWeight: 600,
                            color: secondsLeft < 60 ? 'var(--neg)' : 'var(--brand-ink)',
                            fontVariantNumeric: 'tabular-nums',
                          }}
                        >
                          {fmtCountdown(secondsLeft)}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Boutons d'action */}
                  <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
                    {!isCompleted && (
                      <button
                        type="button"
                        className="btn"
                        onClick={() => {
                          setCreds(null)
                          setSecondsLeft(0)
                        }}
                      >
                        ← Retour
                      </button>
                    )}
                    {isCompleted && (
                      <button type="button" className="btn brand" onClick={handleClose}>
                        Fermer
                      </button>
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  )
}
