import { useState } from 'react'

/**
 * Modal for creating a new prospect customer.
 * Calls createProspect mutation on submit.
 */
export function NewProspectModal({ isOpen, onClose, onSubmit, isLoading }) {
  const [fullName, setFullName] = useState('')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [idNumber, setIdNumber] = useState('')
  const [error, setError] = useState(null)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)

    if (!fullName.trim() || !phoneNumber.trim() || !idNumber.trim()) {
      setError('Tous les champs sont obligatoires')
      return
    }

    try {
      await onSubmit({
        fullName: fullName.trim(),
        phoneNumber: phoneNumber.trim(),
        idNumber: idNumber.trim(),
      })

      // Reset form
      setFullName('')
      setPhoneNumber('')
      setIdNumber('')
    } catch (err) {
      setError(err.message || 'Une erreur est survenue')
    }
  }

  if (!isOpen) return null

  return (
    <>
      <div className="modal-scrim" onClick={isLoading ? undefined : onClose} />
      <div className="modal">
        <div className="modal-head">
          <h2>Nouveau prospect</h2>
          <button
            className="btn ghost sm"
            onClick={onClose}
            disabled={isLoading}
            style={{ padding: 6 }}
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {error && (
            <div
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
              {error}
            </div>
          )}

          <div className="form-group">
            <label className="form-label" htmlFor="prospect-full-name">
              Nom complet
            </label>
            <input
              id="prospect-full-name"
              type="text"
              className="form-input"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              placeholder="Prénom et Nom"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="prospect-phone-number">
              Numéro de téléphone
            </label>
            <input
              id="prospect-phone-number"
              type="tel"
              className="form-input"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+226 XX XX XX XX"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="prospect-id-number">
              Numéro d&apos;identité
            </label>
            <input
              id="prospect-id-number"
              type="text"
              className="form-input"
              value={idNumber}
              onChange={(e) => setIdNumber(e.target.value)}
              placeholder="CNIB, Passeport, etc."
              disabled={isLoading}
            />
          </div>

          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn" onClick={onClose} disabled={isLoading}>
              Annuler
            </button>
            <button type="submit" className="btn brand" disabled={isLoading}>
              {isLoading ? 'Création...' : 'Créer prospect'}
            </button>
          </div>
        </form>
      </div>
    </>
  )
}
