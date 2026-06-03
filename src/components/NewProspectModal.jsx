//components/NewProspectModal.jsx
import { useState, useEffect } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'

// Phone validation: optional leading +, then digits/spaces/dashes, 8–15 chars total
const PHONE_REGEX = /^\+?[0-9\s-]{8,15}$/

/**
 * Modal for creating a new prospect customer.
 * Owns the createProspect mutation internally — no onSubmit prop required.
 * AC:
 *  - useMutation(api.customers.createProspect) called inside the modal
 *  - Phone validated with /^\+?[0-9\s\-]{8,15}$/ before submit; field-level error shown
 *  - Escape key closes modal (unless loading), listener cleaned up on unmount
 *  - Duplicate phone/idNumber Convex error surfaced as a field-level message
 *  - onClose() called on success; optional success toast emitted via onSuccess prop
 */
export function NewProspectModal({ isOpen, onClose, onSuccess }) {
  const createProspect = useMutation(api.customers.createProspect)

  const [formState, setFormState] = useState({
    fullName: '',
    phoneNumber: '',
    idNumber: '',
    isLoading: false,
    errors: {
      form: null,
      phoneNumber: null,
    },
  })

  const { fullName, phoneNumber, idNumber, isLoading, errors } = formState

  // ── Escape key handler ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isLoading) {
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isLoading, onClose])

  // ── Validation ─────────────────────────────────────────────────────────────
  const validate = () => {
    const next = { form: null, phoneNumber: null }
    let valid = true

    if (!fullName.trim() || !phoneNumber.trim() || !idNumber.trim()) {
      next.form = 'Tous les champs sont obligatoires.'
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
      errors: { form: null, phoneNumber: null },
    }))

    try {
      await createProspect({
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
        idNumber: idNumber.trim(),
      })
    } catch (err) {
      const rawMessage = typeof err?.message === 'string' ? err.message : ''
      let nextErrors = {
        form: 'Une erreur est survenue. Veuillez réessayer.',
        phoneNumber: null,
      }

      // Surface duplicate-phone / duplicate-idNumber errors at field level
      // Convex throws with a message that contains the field name when the
      // unique constraint is violated (see issue #68).
      if (/phone/i.test(rawMessage)) {
        nextErrors = { form: null, phoneNumber: 'Ce numéro de téléphone est déjà enregistré.' }
      } else if (/idNumber|identit/i.test(rawMessage)) {
        nextErrors = { form: "Ce numéro d'identité est déjà enregistré.", phoneNumber: null }
      }

      setFormState((prev) => ({ ...prev, isLoading: false, errors: nextErrors }))
      return
    }

    // createProspect succeeded — reset form, close, then fire callback.
    // Callbacks run outside the catch so their exceptions never show as form errors.

    setFormState({
      fullName: '',
      phoneNumber: '',
      idNumber: '',
      isLoading: false,
      errors: { form: null, phoneNumber: null },
    })
    onClose()
    onSuccess?.()
  }

  if (!isOpen) return null

  return (
    <>
      {/* Scrim — blocked during loading */}
      <div className="modal-scrim" onClick={isLoading ? undefined : onClose} />

      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="prospect-modal-title">
        {/* Header */}
        <div className="modal-head">
          <h2 id="prospect-modal-title">Nouveau prospect</h2>
          <button
            className="btn ghost sm"
            onClick={onClose}
            disabled={isLoading}
            aria-label="Fermer"
            style={{ padding: 6 }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="modal-body" noValidate>
          {/* Form-level error */}
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

          {/* Full name */}
          <div className="form-group">
            <label className="form-label" htmlFor="prospect-full-name">
              Nom complet
            </label>
            <input
              id="prospect-full-name"
              type="text"
              className="form-input"
              value={fullName}
              onChange={(e) => setFormState((prev) => ({ ...prev, fullName: e.target.value }))}
              placeholder="Prénom et Nom"
              disabled={isLoading}
              autoFocus
            />
          </div>

          {/* Phone — with field-level validation error */}
          <div className="form-group">
            <label className="form-label" htmlFor="prospect-phone-number">
              Numéro de téléphone
            </label>
            <input
              id="prospect-phone-number"
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
              aria-describedby={errors.phoneNumber ? 'phone-error' : undefined}
              aria-invalid={!!errors.phoneNumber}
            />
            {errors.phoneNumber && (
              <p
                id="phone-error"
                style={{
                  marginTop: 4,
                  fontSize: 12,
                  color: 'var(--red-6)',
                }}
              >
                {errors.phoneNumber}
              </p>
            )}
          </div>

          {/* ID number */}
          <div className="form-group">
            <label className="form-label" htmlFor="prospect-id-number">
              Numéro d'identité
            </label>
            <input
              id="prospect-id-number"
              type="text"
              className="form-input"
              value={idNumber}
              onChange={(e) => setFormState((prev) => ({ ...prev, idNumber: e.target.value }))}
              placeholder="CNIB, Passeport, etc."
              disabled={isLoading}
            />
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn" onClick={onClose} disabled={isLoading}>
              Annuler
            </button>
            <button type="submit" className="btn brand" disabled={isLoading}>
              {isLoading ? 'Création…' : 'Créer prospect'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
