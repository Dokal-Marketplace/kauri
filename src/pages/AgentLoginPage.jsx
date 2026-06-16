import { useState, useEffect } from 'react'
import { useAuthActions } from '@convex-dev/auth/react'
import { useConvexAuth } from 'convex/react'
import { useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'

export default function AgentLoginPage() {
  const { signIn } = useAuthActions()
  const { isAuthenticated } = useConvexAuth()
  const linkAccount = useMutation(api.users.linkAgentAccount)

  // Raw invite token from the URL — present only on first-time activation links.
  const [inviteToken] = useState(
    () => new URLSearchParams(window.location.search).get('token') ?? undefined
  )

  // If a token is in the URL, default to the sign-up flow so the agent sets a password.
  const [flow, setFlow] = useState(() => (inviteToken ? 'signUp' : 'signIn'))
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [loading, setLoading] = useState(false)

  // After convex-auth session is established, link to the users row then redirect.
  // For first-time sign-up: passes the invite token (verified server-side by hash).
  // For returning sign-in: inviteToken is undefined; server skips linking (already done).
  useEffect(() => {
    if (!isAuthenticated) return
    let cancelled = false

    async function postLogin() {
      try {
        await linkAccount({ inviteToken })
        if (!cancelled) {
          sessionStorage.setItem('kauri_auth_mode', 'agent')
          window.location.replace('/')
        }
      } catch (err) {
        if (!cancelled) setError(err.message ?? 'Erreur lors de la liaison du compte')
      }
    }

    postLogin()
    return () => {
      cancelled = true
    }
  }, [isAuthenticated, linkAccount, inviteToken])

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      await signIn('password', { flow, email, password })
    } catch (err) {
      setError(err.message ?? 'Identifiants incorrects')
    } finally {
      setLoading(false)
    }
  }

  const isActivation = Boolean(inviteToken)

  return (
    <div className="auth-gate">
      <div className="auth-card">
        <div className="auth-logo">
          <span className="auth-logo-mark">K</span>
          <span className="auth-logo-name">Kauri</span>
        </div>

        <h1 className="auth-title">
          {isActivation
            ? 'Activer mon compte'
            : flow === 'signIn'
              ? 'Connexion agent'
              : 'Créer mon compte'}
        </h1>
        <p className="auth-subtitle">
          {isActivation
            ? 'Définissez votre mot de passe pour accéder à votre espace terrain'
            : flow === 'signIn'
              ? 'Accédez à votre espace terrain'
              : 'Première connexion — définissez votre mot de passe'}
        </p>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="email" className="form-label">
              Adresse e-mail
            </label>
            <input
              id="email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="agent@exemple.com"
              required
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              Mot de passe
            </label>
            <input
              id="password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
              minLength={8}
              autoComplete={flow === 'signIn' ? 'current-password' : 'new-password'}
            />
          </div>

          {error && <p className="auth-error">{error}</p>}

          <button type="submit" className="btn primary auth-submit" disabled={loading}>
            {loading
              ? 'Chargement…'
              : isActivation
                ? 'Activer mon compte'
                : flow === 'signIn'
                  ? 'Se connecter'
                  : 'Créer mon compte'}
          </button>
        </form>

        {!isActivation && (
          <p className="auth-switch">
            {flow === 'signIn' ? (
              <>
                Première connexion ?{' '}
                <button
                  className="link-btn"
                  onClick={() => {
                    setFlow('signUp')
                    setError(null)
                  }}
                >
                  Créer mon compte
                </button>
              </>
            ) : (
              <>
                Déjà inscrit ?{' '}
                <button
                  className="link-btn"
                  onClick={() => {
                    setFlow('signIn')
                    setError(null)
                  }}
                >
                  Se connecter
                </button>
              </>
            )}
          </p>
        )}

        <hr className="auth-divider" />
        <p className="auth-admin-hint">
          Administrateur ?{' '}
          <a href="/" className="link-btn">
            Connexion via Clerk
          </a>
        </p>
      </div>
    </div>
  )
}
