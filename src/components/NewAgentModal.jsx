// src/components/NewAgentModal.jsx
import { useState, useEffect } from 'react'
import { useMutation, useAction } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { I } from '../icons'

const ROLE_KEY_TO_LABEL = {
  admin: 'Administrateur',
  supervisor: 'Superviseure',
  field_agent: 'Agent terrain',
  accountant: 'Caissière',
  it_admin: 'Admin IT',
}

const ASSIGNABLE_ROLES = [
  { value: 'field_agent', label: 'Agent terrain' },
  { value: 'supervisor', label: 'Superviseure' },
  { value: 'accountant', label: 'Caissière' },
  { value: 'it_admin', label: 'Admin IT' },
]

const PHONE_REGEX = /^\+?[0-9\s-]{8,15}$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function NewAgentModal({ isOpen, onClose, onSuccess }) {
  const createAgent = useMutation(api.agents.createAgent)
  const sendActivationCode = useAction(api.otp.sendActivationCode)

  // États de succès
  const [showSuccess, setShowSuccess] = useState(false)
  const [createdAgentInfo, setCreatedAgentInfo] = useState(null)
  const [isSendingCode, setIsSendingCode] = useState(false)
  const [sendResult, setSendResult] = useState(null) // null | { channel } | { error }

  // Formulaire
  const [formState, setFormState] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    role: 'field_agent',
    isLoading: false,
    errors: { form: null, email: null, phoneNumber: null },
  })

  const { fullName, email, phoneNumber, role, isLoading, errors } = formState

  // ── Reset ──────────────────────────────────────────────────────────────────
  const resetState = () => {
    setShowSuccess(false)
    setCreatedAgentInfo(null)
    setSendResult(null)
    setFormState({
      fullName: '',
      email: '',
      phoneNumber: '',
      role: 'field_agent',
      isLoading: false,
      errors: { form: null, email: null, phoneNumber: null },
    })
  }

  // ── Escape key handler ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isLoading) {
        resetState()
        onClose()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isLoading])

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = () => {
    const next = { form: null, email: null, phoneNumber: null }
    let valid = true

    if (!fullName.trim() || !email.trim() || !phoneNumber.trim() || !role) {
      next.form = 'Tous les champs sont obligatoires.'
      valid = false
    }

    if (email.trim() && !EMAIL_REGEX.test(email.trim())) {
      next.email = "Format d'email invalide. Exemple : agent@dokal.com"
      valid = false
    }

    if (phoneNumber.trim() && !PHONE_REGEX.test(phoneNumber.trim())) {
      next.phoneNumber = 'Format invalide. Exemple : +226 XX XX XX XX'
      valid = false
    }

    setFormState((prev) => ({ ...prev, errors: next }))
    return valid
  }

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return

    setFormState((prev) => ({
      ...prev,
      isLoading: true,
      errors: { form: null, email: null, phoneNumber: null },
    }))

    try {
      const result = await createAgent({
        fullName: fullName.trim(),
        email: email.trim(),
        phoneNumber: phoneNumber.trim(),
        role,
      })

      // Afficher le modal de succès au lieu de fermer
      setCreatedAgentInfo({
        userId: result.userId,
        fullName: fullName.trim(),
        email: email.trim(),
        phoneNumber: phoneNumber.trim(),
        role: ROLE_KEY_TO_LABEL[role] ?? 'Agent terrain',
      })
      setShowSuccess(true)

      // Réinitialiser le formulaire (mais pas le modal)
      setFormState({
        fullName: '',
        email: '',
        phoneNumber: '',
        role: 'field_agent',
        isLoading: false,
        errors: { form: null, email: null, phoneNumber: null },
      })

      // Envoyer immédiatement le code d'activation (WhatsApp, repli SMS)
      setIsSendingCode(true)
      try {
        const codeResult = await sendActivationCode({ userId: result.userId })
        setSendResult({ channel: codeResult.channel })
      } catch (sendErr) {
        setSendResult({ error: sendErr?.message ?? 'Une erreur est survenue.' })
      } finally {
        setIsSendingCode(false)
      }
    } catch (err) {
      const rawMessage = typeof err?.message === 'string' ? err.message : ''
      let nextErrors = {
        form: 'Une erreur est survenue. Veuillez réessayer.',
        email: null,
        phoneNumber: null,
      }

      if (/email/i.test(rawMessage)) {
        nextErrors = { form: null, email: 'Cet email est déjà enregistré.', phoneNumber: null }
      } else if (/phone|téléphone/i.test(rawMessage)) {
        nextErrors = { form: null, email: null, phoneNumber: 'Ce numéro est déjà enregistré.' }
      }

      setFormState((prev) => ({ ...prev, isLoading: false, errors: nextErrors }))
    }
  }

  // ── Renvoyer le code ───────────────────────────────────────────────────────
  const handleResendCode = async () => {
    if (!createdAgentInfo?.userId) return

    setIsSendingCode(true)
    setSendResult(null)
    try {
      const codeResult = await sendActivationCode({ userId: createdAgentInfo.userId })
      setSendResult({ channel: codeResult.channel })
    } catch (err) {
      setSendResult({ error: err?.message ?? 'Une erreur est survenue.' })
    } finally {
      setIsSendingCode(false)
    }
  }

  // ── Fermer le modal de succès ───────────────────────────────────────────────
  const handleCloseSuccess = () => {
    resetState()
    onClose()
    onSuccess?.()
  }

  // ── Créer un nouvel agent ───────────────────────────────────────────────────
  const handleNewAgent = () => {
    setShowSuccess(false)
    setCreatedAgentInfo(null)
    setSendResult(null)
  }

  if (!isOpen) return null

  return (
    <>
      <div className="modal-scrim" onClick={isLoading ? undefined : handleCloseSuccess} />

      {showSuccess && createdAgentInfo ? (
        // ─── MODAL DE SUCCÈS ────────────────────────────────────────────────────
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="success-title">
          <div className="modal-head" style={{ borderBottom: 'none' }}>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 24,
                background: 'var(--green-1, #e6f9ed)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginRight: 12,
              }}
            >
              <I.Check size={24} style={{ color: 'var(--green-6, #15803d)' }} />
            </div>
            <div>
              <h2 id="success-title" style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
                Agent créé avec succès !
              </h2>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
                Les informations de connexion sont prêtes
              </div>
            </div>
            <button
              className="btn ghost sm"
              onClick={handleCloseSuccess}
              aria-label="Fermer"
              style={{ padding: 6, marginLeft: 'auto' }}
            >
              ✕
            </button>
          </div>

          <div className="modal-body" style={{ paddingTop: 0 }}>
            {/* Résumé de l'agent */}
            <div
              style={{
                padding: 16,
                background: 'var(--surface-inset)',
                borderRadius: 8,
                marginBottom: 20,
              }}
            >
              <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 8 }}>
                {createdAgentInfo.fullName}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: 'var(--ink-2)',
                  display: 'flex',
                  gap: 16,
                  flexWrap: 'wrap',
                }}
              >
                <span>📧 {createdAgentInfo.email}</span>
                <span>📱 {createdAgentInfo.phoneNumber}</span>
              </div>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 8 }}>
                Rôle : {createdAgentInfo.role}
              </div>
            </div>

            {/* Bouton renvoi du code */}
            <button
              type="button"
              className="btn brand"
              onClick={handleResendCode}
              disabled={isSendingCode}
              style={{
                width: '100%',
                marginBottom: 12,
                opacity: isSendingCode ? 0.6 : 1,
              }}
            >
              {isSendingCode ? (
                <>
                  <span className="btn-spinner" />
                  Envoi en cours...
                </>
              ) : (
                <>
                  <I.Phone size={16} />
                  {sendResult ? 'Renvoyer le code' : 'Envoyer le code (WhatsApp/SMS)'}
                </>
              )}
            </button>

            {/* Statut d'envoi */}
            {sendResult && !sendResult.error && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: 14,
                  marginBottom: 12,
                  background: 'var(--green-1, #e6f9ed)',
                  border: '1px solid var(--green-2, #86efac)',
                  borderRadius: 8,
                  color: 'var(--green-8, #166534)',
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
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 13 }}>
                    {sendResult.channel === 'whatsapp'
                      ? 'Code envoyé par WhatsApp'
                      : 'Code envoyé par SMS (WhatsApp indisponible)'}
                  </div>
                  <div style={{ fontSize: 12, marginTop: 2 }}>
                    Au numéro {createdAgentInfo.phoneNumber}
                  </div>
                </div>
              </div>
            )}

            {sendResult?.error && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: 14,
                  marginBottom: 12,
                  background: 'var(--red-1, #fef2f2)',
                  border: '1px solid var(--red-2, #fecaca)',
                  borderRadius: 8,
                  color: 'var(--red-8, #991b1b)',
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
                  <div style={{ fontWeight: 600, fontSize: 13 }}>Échec de l'envoi</div>
                  <div style={{ fontSize: 12, marginTop: 2 }}>{sendResult.error}</div>
                </div>
                <button
                  type="button"
                  onClick={handleResendCode}
                  disabled={isSendingCode}
                  style={{
                    padding: '6px 12px',
                    background: 'var(--red-6)',
                    color: 'white',
                    border: 'none',
                    borderRadius: 6,
                    fontSize: 12,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Réessayer
                </button>
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
              <button
                type="button"
                className="btn"
                onClick={handleCloseSuccess}
                style={{ flex: 1 }}
              >
                Fermer
              </button>
              <button type="button" className="btn" onClick={handleNewAgent} style={{ flex: 1 }}>
                Nouvel agent
              </button>
            </div>

            {/* Note */}
            <div
              style={{
                marginTop: 16,
                padding: 12,
                background: 'var(--yellow-1, #fffbeb)',
                border: '1px solid var(--yellow-2, #fde68a)',
                borderRadius: 6,
                fontSize: 12,
                color: 'var(--yellow-8, #92400e)',
              }}
            >
              <strong>Note :</strong> L'agent devra changer son mot de passe à la première
              connexion.
            </div>
          </div>
        </div>
      ) : (
        // ─── FORMULAIRE DE CRÉATION ─────────────────────────────────────────────
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="agent-modal-title">
          <div className="modal-head">
            <h2 id="agent-modal-title">Nouvel agent</h2>
            <button
              className="btn ghost sm"
              onClick={() => {
                resetState()
                onClose()
              }}
              disabled={isLoading}
              aria-label="Fermer"
              style={{ padding: 6 }}
            >
              ✕
            </button>
          </div>

          <form onSubmit={handleSubmit} className="modal-body" noValidate>
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
              <label className="form-label" htmlFor="agent-full-name">
                Nom complet
              </label>
              <input
                id="agent-full-name"
                type="text"
                className="form-input"
                value={fullName}
                onChange={(e) => setFormState((prev) => ({ ...prev, fullName: e.target.value }))}
                placeholder="Prénom et Nom"
                disabled={isLoading}
                autoFocus
              />
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="agent-email">
                Email
              </label>
              <input
                id="agent-email"
                type="email"
                className={`form-input${errors.email ? ' input-error' : ''}`}
                value={email}
                onChange={(e) => {
                  setFormState((prev) => ({
                    ...prev,
                    email: e.target.value,
                    errors: { ...prev.errors, email: null },
                  }))
                }}
                placeholder="agent@dokal.com"
                disabled={isLoading}
              />
              {errors.email && (
                <p style={{ marginTop: 4, fontSize: 12, color: 'var(--red-6)' }}>{errors.email}</p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="agent-phone">
                Numéro de téléphone
              </label>
              <input
                id="agent-phone"
                type="tel"
                className={`form-input${errors.phoneNumber ? ' input-error' : ''}`}
                value={phoneNumber}
                onChange={(e) => {
                  setFormState((prev) => ({
                    ...prev,
                    phoneNumber: e.target.value,
                    errors: { ...prev.errors, phoneNumber: null },
                  }))
                }}
                placeholder="+226 XX XX XX XX"
                disabled={isLoading}
              />
              {errors.phoneNumber && (
                <p style={{ marginTop: 4, fontSize: 12, color: 'var(--red-6)' }}>
                  {errors.phoneNumber}
                </p>
              )}
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="agent-role">
                Rôle
              </label>
              <select
                id="agent-role"
                className="form-input"
                value={role}
                onChange={(e) => setFormState((prev) => ({ ...prev, role: e.target.value }))}
                disabled={isLoading}
              >
                {ASSIGNABLE_ROLES.map((r) => (
                  <option key={r.value} value={r.value}>
                    {r.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <p style={{ fontSize: 12, color: 'var(--ink-3)', lineHeight: 1.4 }}>
                Un code d'activation sera généré et envoyé automatiquement au numéro de téléphone
                ci-dessus (WhatsApp, avec repli SMS).
              </p>
            </div>

            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button
                type="button"
                className="btn"
                onClick={() => {
                  resetState()
                  onClose()
                }}
                disabled={isLoading}
              >
                Annuler
              </button>
              <button type="submit" className="btn brand" disabled={isLoading}>
                {isLoading ? 'Création…' : 'Créer agent'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  )
}
