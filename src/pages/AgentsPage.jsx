//pages/AgentsPage.jsx
import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { I } from '../icons'
import { PageHeader } from '../components'
import { fmt } from '../utils/fmt'
import Novu from '../components/Inbox'
import { EmptyState } from '../components/EmptyState'
import { StaffIllustration, NoResultsIllustration } from '../components/Illustrations'
import { BindDeviceDrawer } from './BindDeviceDrawer'

const ROLE_TAGS = {
  Administrateur: { bg: 'oklch(0.94 0.04 50)', fg: 'var(--brand-ink)' },
  Superviseure: { bg: 'oklch(0.94 0.05 270)', fg: 'oklch(0.4 0.13 270)' },
  'Agent terrain': { bg: 'var(--surface-inset)', fg: 'var(--ink-2)' },
  Caissière: { bg: 'oklch(0.95 0.04 190)', fg: 'oklch(0.4 0.1 190)' },
  'Admin IT': { bg: 'oklch(0.94 0.04 30)', fg: 'oklch(0.4 0.12 30)' },
}

// Maps authz role keys → display labels used in ROLE_TAGS
const ROLE_KEY_TO_LABEL = {
  admin: 'Administrateur',
  supervisor: 'Superviseure',
  field_agent: 'Agent terrain',
  accountant: 'Caissière',
  it_admin: 'Admin IT',
}

// Options shown in the “Nouvel agent” role selector (admin excluded — reserved for onboarding)
const ASSIGNABLE_ROLES = [
  { value: 'field_agent', label: 'Agent terrain' },
  { value: 'supervisor', label: 'Superviseure' },
  { value: 'accountant', label: 'Caissière' },
  { value: 'it_admin', label: 'Admin IT' },
]

const STATUS_DOT = {
  'en ligne': 'var(--pos)',
  'hors ligne': 'oklch(0.7 0.02 70)',
  congé: 'var(--warn)',
}

function formatLastSync(ts) {
  if (!ts) return 'jamais'
  const mins = Math.floor((Date.now() - ts) / 60000)
  if (mins < 1) return "à l'instant"
  if (mins < 60) return `il y a ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `il y a ${hrs} h`
  return 'hier'
}

function mapAgent(u, branchName, agentStats = {}) {
  const words = u.fullName.trim().split(/\s+/)
  const initials =
    words.length >= 2
      ? (words[0][0] + words[words.length - 1][0]).toUpperCase()
      : u.fullName.slice(0, 2).toUpperCase()

  const d = u.device
  const device = d
    ? {
        id: d.serialNumber,
        model: d.model,
        battery: d.batteryPct ?? 0,
        signal: d.signalLevel ?? 0,
        sync:
          d.status !== 'active' ? 'hors service' : (d.queuedCount ?? 0) > 0 ? 'en file' : 'à jour',
        queued: d.queuedCount ?? 0,
        lastSync: formatLastSync(d.lastSync),
        area: branchName || '—',
      }
    : {
        id: '—',
        model: '—',
        battery: 0,
        signal: 0,
        sync: 'hors service',
        queued: 0,
        lastSync: '—',
        area: '—',
      }

  return {
    id: u._id,
    initials,
    name: u.fullName,
    phone: u.phoneNumber,
    role: ROLE_KEY_TO_LABEL[u.role] ?? 'Agent terrain',
    branch: branchName || '—',
    status: u.status === 'active' ? 'en ligne' : 'hors ligne',
    last: formatLastSync(d?.lastSync),
    collected: agentStats[u._id]?.collected ?? 0,
    target: agentStats[u._id]?.target ?? 0,
    clients: agentStats[u._id]?.clients ?? 0,
    txMonth: agentStats[u._id]?.txMonth ?? 0,
    device,
  }
}

function SignalBars({ level = 0 }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'flex-end', gap: 1.5, height: 12 }}>
      {[1, 2, 3, 4, 5].map((i) => (
        <span
          key={i}
          style={{
            width: 2.5,
            height: 3 + i * 1.6,
            borderRadius: 1,
            background: i <= level ? 'var(--ink-2)' : 'var(--border-strong)',
          }}
        />
      ))}
    </span>
  )
}

function Battery({ pct = 100 }) {
  const color = pct < 25 ? 'var(--neg)' : pct < 50 ? 'var(--warn)' : 'var(--pos)'
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 5,
        fontSize: 11.5,
        color: 'var(--ink-2)',
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      <span
        style={{
          position: 'relative',
          width: 22,
          height: 11,
          border: '1.2px solid var(--border-strong)',
          borderRadius: 2.5,
        }}
      >
        <span
          style={{
            position: 'absolute',
            left: 1,
            top: 1,
            bottom: 1,
            width: `calc(${Math.max(0, Math.min(100, pct))}% - 2px)`,
            background: color,
            borderRadius: 1.5,
          }}
        />
        <span
          style={{
            position: 'absolute',
            right: -3,
            top: 3,
            bottom: 3,
            width: 2,
            background: 'var(--border-strong)',
            borderRadius: '0 1px 1px 0',
          }}
        />
      </span>
      {pct}%
    </span>
  )
}

function SyncTag({ d }) {
  if (d.sync === 'à jour') return <span className="tag actif">À jour</span>
  if (d.sync === 'en file') return <span className="tag attente">{d.queued} en file</span>
  return <span className="tag archive">Hors service</span>
}

const PHONE_REGEX = /^\+?[0-9\s-]{8,15}$/
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

function NewAgentModal({ isOpen, onClose, onSuccess }) {
  const createAgent = useMutation(api.agents.createAgent)
  const [inviteLink, setInviteLink] = useState(null)

  const [formState, setFormState] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    role: 'field_agent',
    isLoading: false,
    errors: {
      form: null,
      email: null,
      phoneNumber: null,
    },
  })

  const { fullName, email, phoneNumber, role, isLoading, errors } = formState

  // ── Escape key handler ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e) => {
      if (e.key === 'Escape' && !isLoading) onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, isLoading, onClose])

  // ── Validation ──────────────────────────────────────────────────────────────
  const validate = () => {
    const next = { form: null, email: null, phoneNumber: null }
    let valid = true

    if (!fullName.trim() || !email.trim() || !phoneNumber.trim() || !role) {
      next.form = 'Tous les champs sont obligatoires.'
      valid = false
    }

    if (email.trim() && !EMAIL_REGEX.test(email.trim())) {
      next.email = 'Format d\u2019email invalide. Exemple : agent@dokal.com'
      valid = false
    }

    if (phoneNumber.trim() && !PHONE_REGEX.test(phoneNumber.trim())) {
      next.phoneNumber = 'Format invalide. Exemple : +226 XX XX XX XX'
      valid = false
    }

    setFormState((prev) => ({ ...prev, errors: next }))
    return valid
  }

  // ── Submit ──────────────────────────────────────────────────────────────────
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
      const link = `${window.location.origin}/connexion?token=${result.inviteToken}`
      setInviteLink(link)
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
      return
    }

    setFormState({
      fullName: '',
      email: '',
      phoneNumber: '',
      role: 'field_agent',
      isLoading: false,
      errors: { form: null, email: null, phoneNumber: null },
    })
    // inviteLink is set above — stay open so admin can copy the link
    onSuccess?.()
  }

  function handleClose() {
    setInviteLink(null)
    onClose()
  }

  if (!isOpen) return null

  return (
    <>
      {/* Scrim */}
      <div className="modal-scrim" onClick={isLoading ? undefined : handleClose} />

      <div className="modal" role="dialog" aria-modal="true" aria-labelledby="agent-modal-title">
        {/* Header */}
        <div className="modal-head">
          <h2 id="agent-modal-title">Nouvel agent</h2>
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

          {/* Email */}
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
              aria-describedby={errors.email ? 'email-error' : undefined}
              aria-invalid={!!errors.email}
            />
            {errors.email && (
              <p id="email-error" style={{ marginTop: 4, fontSize: 12, color: 'var(--red-6)' }}>
                {errors.email}
              </p>
            )}
          </div>

          {/* Phone */}
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
              aria-describedby={errors.phoneNumber ? 'phone-error' : undefined}
              aria-invalid={!!errors.phoneNumber}
            />
            {errors.phoneNumber && (
              <p id="phone-error" style={{ marginTop: 4, fontSize: 12, color: 'var(--red-6)' }}>
                {errors.phoneNumber}
              </p>
            )}
          </div>

          {/* Role */}
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

          {/* Actions */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
            <button type="button" className="btn" onClick={handleClose} disabled={isLoading}>
              Annuler
            </button>
            <button type="submit" className="btn brand" disabled={isLoading}>
              {isLoading ? 'Invitation…' : 'Inviter agent'}
            </button>
          </div>
        </form>

        {/* Invite link — shown after successful creation */}
        {inviteLink && (
          <div
            style={{
              padding: '16px 20px',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}
          >
            <p style={{ margin: 0, fontSize: 13, fontWeight: 600, color: 'var(--ink)' }}>
              Agent créé — partagez ce lien d&apos;activation :
            </p>
            <div
              style={{
                display: 'flex',
                gap: 8,
                alignItems: 'center',
                background: 'var(--surface-inset)',
                border: '1px solid var(--border)',
                borderRadius: 6,
                padding: '6px 10px',
              }}
            >
              <code
                style={{ flex: 1, fontSize: 11, wordBreak: 'break-all', color: 'var(--ink-2)' }}
              >
                {inviteLink}
              </code>
              <button
                type="button"
                className="btn sm"
                onClick={() => navigator.clipboard.writeText(inviteLink)}
              >
                Copier
              </button>
            </div>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--ink-2)' }}>
              Ce lien est à usage unique. L&apos;agent définira son mot de passe lors de la première
              connexion.
            </p>
            <button type="button" className="btn brand" onClick={handleClose}>
              Fermer
            </button>
          </div>
        )}
      </div>
    </>
  )
}

function ReassignTpeModal({ agent, onClose }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--surface)',
          borderRadius: 12,
          padding: 28,
          minWidth: 360,
          boxShadow: 'var(--shadow-md)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontWeight: 650, fontSize: 15, marginBottom: 16 }}>
          Réassigner TPE · {agent.name}
        </div>
        <p style={{ color: 'var(--ink-2)', fontSize: 13, marginBottom: 20 }}>
          Sélection du nouveau TPE à implémenter (liste des appareils disponibles).
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn" onClick={onClose}>
            Annuler
          </button>
          <button className="btn brand" onClick={onClose}>
            Confirmer
          </button>
        </div>
      </div>
    </div>
  )
}

function AgentDetailModal({ agent, onClose }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--surface)',
          borderRadius: 12,
          padding: 28,
          minWidth: 400,
          boxShadow: 'var(--shadow-md)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontWeight: 650, fontSize: 15, marginBottom: 4 }}>{agent.name}</div>
        <div style={{ color: 'var(--ink-2)', fontSize: 12, marginBottom: 16 }}>
          {agent.phone} · {agent.branch}
        </div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '8px 20px',
            fontSize: 13,
            marginBottom: 20,
          }}
        >
          <div>
            <span style={{ color: 'var(--ink-3)' }}>TPE</span>
            <br />
            {agent.device.id}
          </div>
          <div>
            <span style={{ color: 'var(--ink-3)' }}>Modèle</span>
            <br />
            {agent.device.model}
          </div>
          <div>
            <span style={{ color: 'var(--ink-3)' }}>Sync</span>
            <br />
            {agent.device.lastSync}
          </div>
          <div>
            <span style={{ color: 'var(--ink-3)' }}>Statut</span>
            <br />
            {agent.status}
          </div>
          <div>
            <span style={{ color: 'var(--ink-3)' }}>Collecte mois</span>
            <br />
            {fmt(agent.collected)} FCFA
          </div>
          <div>
            <span style={{ color: 'var(--ink-3)' }}>Transactions</span>
            <br />
            {agent.txMonth}
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}

export default function AgentsPage() {
  const [q, setQ] = useState('')
  const [branch, setBranch] = useState('toutes')
  const [role, setRole] = useState('tous')
  const [online, setOnline] = useState(true)

  const { tenantId, convexUser, isLoaded } = useCurrentUser()
  const branchName = convexUser?.branch?.name ?? null

  const rawAgents = useQuery(
    api.agents.listByBranch,
    isLoaded && tenantId ? { branchId: tenantId } : 'skip'
  )

  const rawAgentStats = useQuery(
    api.transactions.summarizeByAgent,
    isLoaded && tenantId ? {} : 'skip'
  )
  // Stabiliser la référence : ?? {} crée un nouvel objet à chaque rendu
  // ce qui rendrait la dépendance du useMemo suivant instable.
  const agentStats = useMemo(() => rawAgentStats ?? {}, [rawAgentStats])

  const AGENTS = useMemo(
    () => (rawAgents ?? []).map((u) => mapAgent(u, branchName, agentStats)),
    [rawAgents, branchName, agentStats]
  )

  const activeDevices = AGENTS.filter((a) => a.device.sync !== 'hors service').length
  const queuedTotal = AGENTS.reduce((s, a) => s + a.device.queued, 0)
  const queuedAgent = AGENTS.find((a) => a.device.queued > 0)

  const totalCollected = AGENTS.reduce((s, a) => s + a.collected, 0)
  const avgTx =
    AGENTS.length > 0 ? Math.round(AGENTS.reduce((s, a) => s + a.txMonth, 0) / AGENTS.length) : 0

  const AGENT_KPIS = [
    {
      label: 'TPE en service',
      value: String(activeDevices),
      unit: `/${AGENTS.length} actifs`,
      note: 'Appareils avec sync active',
      icon: 'users',
      delta: `${activeDevices}`,
      dir: 'up',
    },
    {
      label: 'Collecte du mois',
      value: totalCollected > 0 ? fmt(totalCollected) : '—',
      unit: 'FCFA',
      note: 'Transactions complétées ce mois',
      icon: 'wallet',
      delta: '—',
      dir: 'up',
    },
    {
      label: 'Tx en file (sync)',
      value: String(queuedTotal),
      unit: '',
      note: queuedAgent ? `${queuedAgent.device.id} · ${queuedAgent.branch}` : 'Aucune',
      icon: 'cloud',
      delta: '—',
      dir: 'up',
    },
    {
      label: 'Tx / agent · moy.',
      value: avgTx > 0 ? String(avgTx) : '—',
      unit: '',
      note: 'Moyenne ce mois',
      icon: 'receipt',
      delta: '—',
      dir: 'up',
    },
  ]

  const branches = useMemo(
    () => ['toutes', ...Array.from(new Set(AGENTS.map((a) => a.branch)))],
    [AGENTS]
  )
  const roles = useMemo(() => ['tous', ...Array.from(new Set(AGENTS.map((a) => a.role)))], [AGENTS])

  const [isSyncing, setIsSyncing] = useState(false)
  const [syncError, setSyncError] = useState(null)

  async function handleForceSync() {
    setIsSyncing(true)
    setSyncError(null)
    try {
      await new Promise((r) => setTimeout(r, 800))
    } catch (err) {
      setSyncError(err?.message ?? 'Erreur de synchronisation')
    } finally {
      setIsSyncing(false)
    }
  }

  const [showNewAgentModal, setShowNewAgentModal] = useState(false)

  // per-row action state
  const [menuOpenId, setMenuOpenId] = useState(null)
  const [detailAgent, setDetailAgent] = useState(null)
  const [reassignAgent, setReassignAgent] = useState(null)
  const [bindAgent, setBindAgent] = useState(null) // ← "Lier un appareil"
  const disableAgent = useMutation(api.agents.disable)

  async function handleDisable(agent) {
    setMenuOpenId(null)
    if (!window.confirm(`Désactiver ${agent.name} ?`)) return
    try {
      await disableAgent({ agentId: agent.id })
    } catch (err) {
      alert(err?.message ?? 'Erreur lors de la désactivation')
    }
  }

  const filtered = useMemo(
    () =>
      AGENTS.filter((a) => {
        if (branch !== 'toutes' && a.branch !== branch) return false
        if (role !== 'tous' && a.role !== role) return false
        if (
          q &&
          !a.name.toLowerCase().includes(q.toLowerCase()) &&
          !a.phone.includes(q) &&
          !a.device.id.toLowerCase().includes(q.toLowerCase())
        )
          return false
        return true
      }),
    [q, branch, role, AGENTS]
  )

  const isLoadingAgents = rawAgents === undefined

  return (
    <div className="agents-page">
      <NewAgentModal
        isOpen={showNewAgentModal}
        onClose={() => setShowNewAgentModal(false)}
        onSuccess={() => setShowNewAgentModal(false)}
      />

      {detailAgent && <AgentDetailModal agent={detailAgent} onClose={() => setDetailAgent(null)} />}
      {reassignAgent && (
        <ReassignTpeModal agent={reassignAgent} onClose={() => setReassignAgent(null)} />
      )}

      {/* BindDeviceDrawer — "Lier un appareil" / "Changer d'appareil" */}
      {bindAgent && (
        <BindDeviceDrawer
          isLoaded={isLoaded}
          agent={bindAgent}
          tenantId={tenantId}
          onClose={() => setBindAgent(null)}
        />
      )}

      <PageHeader
        crumbs={['Admin', 'Agents & TPE']}
        title="Agents & terminaux"
        sub={
          isLoadingAgents
            ? 'Chargement…'
            : `${AGENTS.length} agents · ${activeDevices} TPE déployés · ${branchName ?? '—'}`
        }
      >
        <button
          className={'status-pill' + (online ? '' : ' offline')}
          onClick={() => setOnline(!online)}
        >
          <span className="status-dot"></span>
          {online ? 'En ligne · synchronisé' : 'Hors ligne · ' + queuedTotal + ' en file'}
        </button>
        <Novu />
      </PageHeader>

      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: 8,
          marginBottom: 12,
        }}
      >
        <button className="btn" onClick={handleForceSync} disabled={isSyncing}>
          <I.Cloud size={14} />
          {isSyncing ? 'Sync…' : 'Forcer sync'}
        </button>
        {syncError && <span style={{ fontSize: 12, color: 'var(--neg)' }}>{syncError}</span>}
        <button className="btn brand" onClick={() => setShowNewAgentModal(true)}>
          <I.Plus size={14} stroke="white" />
          Nouvel agent
        </button>
      </div>

      <section className="kpi-row">
        {AGENT_KPIS.map((k) => (
          <div className="kpi" key={k.label}>
            <div className="kpi-label">
              {k.icon === 'users' && <I.Users />}
              {k.icon === 'wallet' && <I.Wallet />}
              {k.icon === 'receipt' && <I.Receipt />}
              {k.icon === 'cloud' && <I.Cloud />}
              {k.label}
            </div>
            <div className="kpi-value">
              {k.value}
              {k.unit && <span className="unit">{k.unit}</span>}
            </div>
            <div className="kpi-foot">
              <span className={'delta ' + (k.dir === 'up' ? 'up' : 'down')}>
                {k.dir === 'up' ? (
                  <I.ArrowUR size={10} stroke="currentColor" />
                ) : (
                  <I.ArrowDR size={10} stroke="currentColor" />
                )}
                {k.delta}
              </span>
              <span>{k.note}</span>
            </div>
          </div>
        ))}
      </section>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-head">
          <div className="card-title">Flotte d&apos;agents · TPE en service</div>
          <div className="filter-spacer" />
          <div className="filter-group">
            <label className="filter-label">Agence</label>
            <select
              className="filter-select"
              value={branch}
              onChange={(e) => setBranch(e.target.value)}
            >
              {branches.map((b) => (
                <option key={b} value={b}>
                  {b === 'toutes' ? 'Toutes' : b}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label className="filter-label">Rôle</label>
            <select
              className="filter-select"
              value={role}
              onChange={(e) => setRole(e.target.value)}
            >
              {roles.map((r) => (
                <option key={r} value={r}>
                  {r === 'tous' ? 'Tous' : r}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label className="filter-label">Recherche</label>
            <input
              className="filter-select"
              placeholder="Nom, téléphone, TPE…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              style={{ minWidth: 180 }}
            />
          </div>
        </div>

        <div className="table-wrap">
          {isLoadingAgents ? (
            <EmptyState
              variant="compact"
              icon={<I.Cloud size={22} />}
              title="Chargement des agents…"
            />
          ) : (
            <>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Agent</th>
                    <th>Rôle</th>
                    <th>Zone / Agence</th>
                    <th>TPE</th>
                    <th>Batt.</th>
                    <th>Réseau</th>
                    <th>Sync</th>
                    <th style={{ textAlign: 'right' }}>Collecte mois</th>
                    <th>Statut</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((a) => {
                    const tag = ROLE_TAGS[a.role] || ROLE_TAGS['Agent terrain']
                    const pct = a.target > 0 ? Math.round((a.collected / a.target) * 100) : 0
                    return (
                      <tr key={a.id}>
                        <td>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <div className="avatar sm" style={{ position: 'relative' }}>
                              {a.initials}
                              <span
                                style={{
                                  position: 'absolute',
                                  right: -1,
                                  bottom: -1,
                                  width: 8,
                                  height: 8,
                                  borderRadius: '50%',
                                  background: STATUS_DOT[a.status] ?? STATUS_DOT['hors ligne'],
                                  border: '1.5px solid var(--surface)',
                                }}
                              />
                            </div>
                            <div>
                              <div style={{ fontWeight: 550 }}>{a.name}</div>
                              <div className="cell-sub">{a.phone}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span
                            className="chip"
                            style={{
                              background: tag.bg,
                              color: tag.fg,
                              borderColor: 'transparent',
                            }}
                          >
                            {a.role}
                          </span>
                        </td>
                        <td>
                          <div>{a.branch}</div>
                          <div className="cell-sub">{a.device.area}</div>
                        </td>
                        <td>
                          <div
                            style={{
                              fontFamily: 'var(--font-mono)',
                              fontSize: 12,
                              fontWeight: 550,
                            }}
                          >
                            {a.device.id}
                          </div>
                          <div className="cell-sub">{a.device.model}</div>
                        </td>
                        <td>
                          <Battery pct={a.device.battery} />
                        </td>
                        <td>
                          <SignalBars level={a.device.signal} />
                        </td>
                        <td>
                          <SyncTag d={a.device} />
                          <div className="cell-sub" style={{ marginTop: 2 }}>
                            {a.device.lastSync}
                          </div>
                        </td>
                        <td style={{ textAlign: 'right', minWidth: 130 }}>
                          <div style={{ fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                            {a.collected ? fmt(a.collected) : '—'}
                          </div>
                          {a.target > 0 && (
                            <>
                              <div className="goal-bar" style={{ marginTop: 4 }}>
                                <div
                                  className="goal-fill"
                                  style={{ width: Math.min(100, pct) + '%' }}
                                />
                              </div>
                              <div
                                className="cell-sub"
                                style={{ marginTop: 2, fontVariantNumeric: 'tabular-nums' }}
                              >
                                {pct}% obj.
                              </div>
                            </>
                          )}
                        </td>
                        <td>
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 6,
                              fontSize: 12,
                            }}
                          >
                            <span
                              style={{
                                width: 6,
                                height: 6,
                                borderRadius: '50%',
                                background: STATUS_DOT[a.status] ?? STATUS_DOT['hors ligne'],
                              }}
                            />
                            {a.status}
                          </span>
                        </td>
                        <td style={{ position: 'relative' }}>
                          <button
                            className="btn ghost sm"
                            style={{ padding: 4 }}
                            onClick={() => setMenuOpenId(menuOpenId === a.id ? null : a.id)}
                          >
                            <I.More size={14} />
                          </button>
                          {menuOpenId === a.id && (
                            <div
                              style={{
                                position: 'absolute',
                                right: 0,
                                top: '100%',
                                zIndex: 10,
                                background: 'var(--surface)',
                                border: '1px solid var(--border)',
                                borderRadius: 8,
                                padding: '4px 0',
                                minWidth: 160,
                                boxShadow: 'var(--shadow-md)',
                              }}
                            >
                              <button
                                className="dropdown-item"
                                onClick={() => {
                                  setMenuOpenId(null)
                                  setDetailAgent(a)
                                }}
                              >
                                Voir détails
                              </button>
                              <button className="dropdown-item" onClick={() => handleDisable(a)}>
                                Désactiver
                              </button>
                              <button
                                className="dropdown-item"
                                onClick={() => {
                                  setMenuOpenId(null)
                                  setReassignAgent(a)
                                }}
                              >
                                Réassigner TPE
                              </button>
                              {/* ← new: Lier / Changer d'appareil */}
                              <button
                                className="dropdown-item"
                                onClick={() => {
                                  setMenuOpenId(null)
                                  setBindAgent(a)
                                }}
                              >
                                {a.device.id !== '—' ? "Changer d'appareil" : 'Lier un appareil'}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
              {filtered.length === 0 &&
                (AGENTS.length === 0 ? (
                  <EmptyState
                    illustration={<StaffIllustration />}
                    title="Aucun agent déployé"
                    description="Ajoutez votre premier agent terrain pour commencer à suivre la flotte TPE."
                    actions={
                      <button
                        className="btn brand"
                        style={{ marginTop: 4 }}
                        onClick={() => setShowNewAgentModal(true)}
                      >
                        <I.Plus size={13} stroke="white" /> Nouvel agent
                      </button>
                    }
                  />
                ) : (
                  <EmptyState
                    illustration={<NoResultsIllustration />}
                    title="Aucun agent trouvé"
                    description="Aucun agent ne correspond aux filtres sélectionnés."
                  />
                ))}
            </>
          )}
        </div>
      </div>

      <div className="row cols-2 agents-row" style={{ marginBottom: 14 }}>
        <div className="card">
          <div className="card-head">
            <div className="card-title">Top collecteurs · ce mois</div>
            <span className="card-sub" style={{ marginLeft: 'auto' }}>
              Sur le terrain
            </span>
          </div>
          <div
            style={{ padding: '4px 14px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}
          >
            {AGENTS.filter((a) => a.collected > 0)
              .sort((a, b) => b.collected - a.collected)
              .slice(0, 4).length === 0 ? (
              <EmptyState
                variant="compact"
                icon={<I.Wallet size={20} />}
                title="Aucune collecte ce mois"
                description="Les performances terrain s'afficheront ici dès la première transaction."
              />
            ) : (
              AGENTS.filter((a) => a.collected > 0)
                .sort((a, b) => b.collected - a.collected)
                .slice(0, 4)
                .map((a, i) => {
                  const pct = a.target > 0 ? Math.round((a.collected / a.target) * 100) : 0
                  return (
                    <div key={a.id} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                      <div
                        style={{
                          width: 18,
                          fontWeight: 600,
                          color: 'var(--ink-3)',
                          fontVariantNumeric: 'tabular-nums',
                          fontSize: 12,
                        }}
                      >
                        {i + 1}
                      </div>
                      <div className="avatar sm">{a.initials}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 550, fontSize: 13 }}>{a.name}</div>
                        <div
                          className="cell-sub"
                          style={{ fontFamily: 'var(--font-mono)', fontSize: 10.5 }}
                        >
                          {a.device.id} · {a.device.area}
                        </div>
                        <div className="goal-bar" style={{ marginTop: 4 }}>
                          <div className="goal-fill" style={{ width: Math.min(100, pct) + '%' }} />
                        </div>
                      </div>
                    </div>
                  )
                })
            )}
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">Permissions · matrice</div>
            <span className="card-action" style={{ marginLeft: 'auto' }}>
              Modifier <I.Arrow size={12} />
            </span>
          </div>
          <div style={{ padding: '0 14px 14px', overflowX: 'auto' }}>
            <table className="perm-table">
              <thead>
                <tr>
                  <th></th>
                  <th>Admin</th>
                  <th>Superv.</th>
                  <th>Agent</th>
                  <th>Caisse</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ['Voir clients', 1, 1, 1, 1],
                  ['Inscrire (KYC sur TPE)', 1, 1, 1, 0],
                  ['Encaisser dépôt', 1, 1, 1, 1],
                  ['Valider retrait', 1, 1, 0, 1],
                  ['Mode hors-ligne', 1, 1, 1, 1],
                  ['Modifier objectifs', 1, 1, 0, 0],
                  ['Gérer agents & TPE', 1, 0, 0, 0],
                ].map(([label, ...vals]) => (
                  <tr key={label}>
                    <td>{label}</td>
                    {vals.map((v, i) => (
                      <td key={i} style={{ textAlign: 'center' }}>
                        {v ? (
                          <span className="perm-yes">
                            <I.Check size={11} stroke="white" />
                          </span>
                        ) : (
                          <span className="perm-no">—</span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-head">
          <div className="card-title">Activité terrain · 24 dernières heures</div>
          <span className="card-sub" style={{ marginLeft: 'auto' }}>
            Tirée des TPE
          </span>
        </div>
        <div className="feed">
          {AGENTS.filter((a) => a.device.queued > 0).map((a, i) => (
            <div className="feed-item" key={i}>
              <div className="feed-dot info" />
              <div>
                <div className="feed-text">
                  <strong>{a.device.id}</strong> a {a.device.queued} transaction(s) en file
                  d&apos;attente
                </div>
                <div className="feed-time">Dernière sync · {a.device.lastSync}</div>
              </div>
            </div>
          ))}
          {AGENTS.filter((a) => a.device.sync === 'hors service').map((a, i) => (
            <div className="feed-item" key={'off-' + i}>
              <div className="feed-dot muted" />
              <div>
                <div className="feed-text">
                  <strong>{a.device.id}</strong> hors service — {a.name}
                </div>
                <div className="feed-time">Dernière sync · {a.device.lastSync}</div>
              </div>
            </div>
          ))}
          {AGENTS.filter((a) => a.device.queued === 0 && a.device.sync !== 'hors service')
            .length === AGENTS.length &&
            AGENTS.length > 0 && (
              <div className="feed-item">
                <div className="feed-dot" />
                <div>
                  <div className="feed-text">Tous les TPE sont synchronisés</div>
                  <div className="feed-time">Aucune activité en attente</div>
                </div>
              </div>
            )}
          {AGENTS.length === 0 && !isLoadingAgents && (
            <EmptyState
              variant="compact"
              icon={<I.Cloud size={20} />}
              title="Aucune activité"
              description="L'activité terrain des TPE s'affichera ici."
            />
          )}
        </div>
      </div>
    </div>
  )
}
