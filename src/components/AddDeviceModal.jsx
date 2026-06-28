//src/components/AddDeviceModal.jsx
import { useState, useEffect, useCallback } from 'react'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { I } from '../icons'

/**
 * Known TPE models offered as quick-select.
 * The user can also type a custom value (datalist fallback).
 */
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

/**
 * Modal for registering a new TPE (payment terminal) in the current branch.
 * Uses useMutation(api.devices.createDevice) internally.
 *
 * Props:
 *  - isOpen: boolean
 *  - onClose: () => void
 *  - onSuccess?: () => void  — called after successful creation
 */
export function AddDeviceModal({ isOpen, onClose, onSuccess }) {
  const createDevice = useMutation(api.devices.createDevice)

  const [form, setForm] = useState(() => ({
    serialNumber: '',
    model: '',
    isLoading: false,
    errors: { form: null, serialNumber: null, model: null },
    successMsg: null,
  }))

  const { serialNumber, model, isLoading, errors, successMsg } = form

  // Reset form via a function (not in an effect) — called when closing
  const resetForm = () =>
    setForm({
      serialNumber: '',
      model: '',
      isLoading: false,
      errors: { form: null, serialNumber: null, model: null },
      successMsg: null,
    })

  const handleClose = useCallback(() => {
    resetForm()
    onClose()
  }, [onClose])

  // ── Escape key handler ──────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isLoading) handleClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isLoading, handleClose])

  // ── Validation ──────────────────────────────────────────────────────────────
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

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSubmit = async (e) => {
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

      // Surface duplicate-serial error at field level
      if (/existe déjà|already exists|duplicate|serial/i.test(raw)) {
        nextErrors = {
          form: null,
          serialNumber: 'Ce numéro de série est déjà enregistré.',
          model: null,
        }
      } else if (/permission|unauthorized|not allowed/i.test(raw)) {
        nextErrors = {
          form: "Vous n'avez pas la permission d'ajouter un TPE.",
          serialNumber: null,
          model: null,
        }
      }

      setForm((prev) => ({ ...prev, isLoading: false, errors: nextErrors }))
      return
    }

    // Success
    setForm((prev) => ({
      ...prev,
      isLoading: false,
      successMsg: `TPE "${serialNumber.trim()}" ajouté avec succès.`,
      serialNumber: '',
      model: '',
    }))

    onSuccess?.()

    // Auto-close after 1.5s
    setTimeout(() => {
      handleClose()
    }, 1500)
  }

  if (!isOpen) return null

  return (
    <>
      {/* Scrim */}
      <div className="modal-scrim" onClick={isLoading ? undefined : handleClose} />

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
                Enregistrer un nouveau terminal dans l'agence
              </div>
            </div>
          </div>
          <button
            className="btn ghost sm"
            onClick={handleClose}
            disabled={isLoading}
            aria-label="Fermer"
            style={{ padding: 6 }}
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="modal-body" noValidate>
          {/* Success banner */}
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

          {/* Serial number */}
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
              aria-describedby={errors.serialNumber ? 'serial-error' : undefined}
              aria-invalid={!!errors.serialNumber}
            />
            {errors.serialNumber && (
              <p id="serial-error" style={{ marginTop: 4, fontSize: 12, color: 'var(--red-6)' }}>
                {errors.serialNumber}
              </p>
            )}
            <p style={{ marginTop: 4, fontSize: 11, color: 'var(--ink-3)', margin: '4px 0 0' }}>
              Identifiant unique inscrit sur l'appareil
            </p>
          </div>

          {/* Model */}
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
              aria-describedby={errors.model ? 'model-error' : undefined}
              aria-invalid={!!errors.model}
            />
            <datalist id="tpe-models-list">
              {TPE_MODELS.map((m) => (
                <option key={m} value={m} />
              ))}
            </datalist>
            {errors.model && (
              <p id="model-error" style={{ marginTop: 4, fontSize: 12, color: 'var(--red-6)' }}>
                {errors.model}
              </p>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 4 }}>
            <button type="button" className="btn" onClick={handleClose} disabled={isLoading}>
              Annuler
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
      </div>
    </>
  )
}
