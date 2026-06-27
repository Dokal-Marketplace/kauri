import { useState } from 'react'
import { useUser } from '@clerk/clerk-react'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'

export default function ChangePasswordPage({ reason }) {
  const { user } = useUser()
  const updatePasswordPolicy = useMutation(api.users.updatePasswordPolicy)

  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    if (newPassword !== confirmPassword) {
      setError('Les nouveaux mots de passe ne correspondent pas.')
      setLoading(false)
      return
    }

    if (newPassword.length < 6) {
      setError('Le nouveau mot de passe doit contenir au moins 6 caractères.')
      setLoading(false)
      return
    }

    try {
      if (!user) {
        throw new Error('Utilisateur non connecté')
      }

      // 1. Mettre à jour le mot de passe dans Clerk
      await user.updatePassword({
        currentPassword,
        newPassword,
        signOutOfOtherSessions: true,
      })

      // 2. Mettre à jour la politique de mot de passe dans Convex
      await updatePasswordPolicy({
        mustChange: false,
        passwordSetAt: Date.now(),
      })

      setSuccess(true)
      // Recharger après 1.5 seconde pour rafraîchir l'état de l'application
      setTimeout(() => {
        window.location.reload()
      }, 1500)
    } catch (err) {
      console.error(err)
      setError(err.message || 'Une erreur est survenue lors de la mise à jour du mot de passe.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        padding: '20px',
        color: '#f8fafc',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}
    >
      <div
        style={{
          background: 'rgba(30, 41, 59, 0.7)',
          backdropFilter: 'blur(16px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '16px',
          padding: '40px',
          width: '100%',
          maxWidth: '440px',
          boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{ fontSize: '24px', fontWeight: '700', marginBottom: '8px', color: '#fff' }}>
            {reason === 'expired' ? 'Mot de passe expiré' : 'Nouveau mot de passe requis'}
          </h1>
          <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: '1.5' }}>
            {reason === 'expired'
              ? 'Votre mot de passe a expiré (limite de 3 jours). Veuillez le mettre à jour pour continuer.'
              : 'Pour des raisons de sécurité, vous devez changer votre mot de passe temporaire.'}
          </p>
        </div>

        {error && (
          <div
            style={{
              background: 'rgba(239, 68, 68, 0.1)',
              border: '1px solid rgba(239, 68, 68, 0.2)',
              color: '#fca5a5',
              padding: '12px 16px',
              borderRadius: '8px',
              fontSize: '14px',
              marginBottom: '24px',
            }}
          >
            {error}
          </div>
        )}

        {success && (
          <div
            style={{
              background: 'rgba(34, 197, 94, 0.1)',
              border: '1px solid rgba(34, 197, 94, 0.2)',
              color: '#86efac',
              padding: '12px 16px',
              borderRadius: '8px',
              fontSize: '14px',
              marginBottom: '24px',
              textAlign: 'center',
            }}
          >
            Mot de passe mis à jour avec succès ! Redirection...
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label
              htmlFor="currentPassword"
              style={{ fontSize: '14px', fontWeight: '500', color: '#cbd5e1' }}
            >
              Mot de passe actuel
            </label>
            <input
              id="currentPassword"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              required
              disabled={loading || success}
              style={{
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '12px 16px',
                color: '#fff',
                fontSize: '15px',
                outline: 'none',
                transition: 'border-color 0.2s',
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label
              htmlFor="newPassword"
              style={{ fontSize: '14px', fontWeight: '500', color: '#cbd5e1' }}
            >
              Nouveau mot de passe
            </label>
            <input
              id="newPassword"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              required
              disabled={loading || success}
              style={{
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '12px 16px',
                color: '#fff',
                fontSize: '15px',
                outline: 'none',
              }}
            />
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label
              htmlFor="confirmPassword"
              style={{ fontSize: '14px', fontWeight: '500', color: '#cbd5e1' }}
            >
              Confirmer le nouveau mot de passe
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              disabled={loading || success}
              style={{
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                padding: '12px 16px',
                color: '#fff',
                fontSize: '15px',
                outline: 'none',
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading || success}
            style={{
              background: 'linear-gradient(90deg, #3b82f6 0%, #2563eb 100%)',
              border: 'none',
              borderRadius: '8px',
              padding: '14px',
              color: '#fff',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              transition: 'opacity 0.2s',
              marginTop: '12px',
              opacity: loading || success ? 0.7 : 1,
            }}
          >
            {loading ? 'Mise à jour...' : 'Changer le mot de passe'}
          </button>
        </form>
      </div>
    </div>
  )
}
