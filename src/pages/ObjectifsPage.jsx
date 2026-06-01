// src/pages/ObjectifsPage.jsx
import { useState, useMemo } from 'react'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { I } from '../icons'
import { fmt, KPI, PageHeader } from '../components'
import Novu from '../components/Inbox'
import { SkeletonTableRows } from '../components/Skeleton'
import { EmptyState } from '../components/EmptyState'
import { GoalIllustration, NoResultsIllustration } from '../components/Illustrations'

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const OBJ_STATUSES = {
  atteint: { label: 'Atteint', tagClass: 'actif', dot: 'var(--pos)' },
  encours: { label: 'En avance', tagClass: 'actif', dot: 'var(--pos)' },
  enretard: { label: 'En retard', tagClass: 'archive', dot: 'var(--neg)' },
  enpause: { label: 'En pause', tagClass: 'archive', dot: 'oklch(0.7 0.02 70)' },
}

const CATEGORY_COLORS = {
  Scolarité: 'oklch(0.6 0.13 230)',
  Logement: 'var(--brand)',
  Pèlerinage: 'oklch(0.55 0.13 280)',
  Mariage: 'oklch(0.6 0.13 340)',
  'Soudure agricole': 'oklch(0.6 0.13 130)',
  Tontine: 'oklch(0.65 0.06 70)',
}

const ALL_CATEGORIES = [
  'Scolarité',
  'Logement',
  'Pèlerinage',
  'Mariage',
  'Soudure agricole',
  'Tontine',
  'Autre',
]

function catColor(name) {
  return CATEGORY_COLORS[name] ?? 'var(--ink-3)'
}

function statusOf(status) {
  return OBJ_STATUSES[status] ?? OBJ_STATUSES.encours
}

function daysUntil(deadline) {
  const end = new Date(deadline).getTime()
  return Math.round((end - Date.now()) / 86_400_000)
}

function fmtDeadline(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

// ---------------------------------------------------------------------------
// KPI derivation from live goals
// ---------------------------------------------------------------------------

function buildKPIs(goals) {
  const active = goals.filter((g) => g.status !== 'atteint').length
  const saved = goals.reduce((s, g) => s + (g.currentAmount ?? 0), 0)
  const reached = goals.filter((g) => g.status === 'atteint').length
  const avgPct = goals.length
    ? Math.round(goals.reduce((s, g) => s + (g.pct ?? 0), 0) / goals.length)
    : 0

  return [
    {
      label: 'Objectifs actifs',
      value: String(active),
      unit: '',
      delta: '',
      dir: 'up',
      note: 'ce mois',
      icon: 'users',
    },
    {
      label: 'Épargne cumulée',
      value: fmt(saved),
      unit: 'FCFA',
      delta: '',
      dir: 'up',
      note: 'total',
      icon: 'wallet',
    },
    {
      label: 'Atteints (12 mois)',
      value: String(reached),
      unit: '',
      delta: '',
      dir: 'up',
      note: 'vs. 2025',
      icon: 'coin',
    },
    {
      label: "Taux moy. d'atteinte",
      value: String(avgPct),
      unit: '%',
      delta: '',
      dir: 'up',
      note: 'objectifs actifs',
      icon: 'receipt',
    },
  ]
}

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// "Nouvel objectif" modal
// ---------------------------------------------------------------------------

const EMPTY_FORM = {
  customerId: '',
  category: ALL_CATEGORIES[0],
  productCode: '',
  targetAmount: '',
  deadline: '',
}

function NouvelObjectifModal({ onClose, customers }) {
  const createGoal = useMutation(api.goals.create)
  const [form, setForm] = useState(EMPTY_FORM)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(null)

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }))

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)

    if (!form.customerId) return setError('Sélectionnez un client.')
    if (!form.productCode) return setError('Renseignez le code produit.')
    if (!form.targetAmount || Number(form.targetAmount) <= 0) return setError('Montant invalide.')
    if (!form.deadline) return setError('Sélectionnez une échéance.')

    setBusy(true)
    try {
      await createGoal({
        customerId: form.customerId,
        category: form.category,
        productCode: form.productCode,
        targetAmount: Number(form.targetAmount),
        deadline: form.deadline,
      })
      onClose()
    } catch (err) {
      setError(err.message ?? 'Erreur inattendue.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="modal-backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal-box" style={{ maxWidth: 480 }}>
        <div className="modal-head">
          <div className="card-title">Nouvel objectif d'épargne</div>
          <button className="btn ghost sm" onClick={onClose} style={{ padding: 4 }}>
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="modal-body">
          {/* Customer */}
          <div className="form-group">
            <label className="filter-label">Client</label>
            {customers && customers.length > 0 ? (
              <select
                className="filter-select"
                value={form.customerId}
                onChange={set('customerId')}
                required
              >
                <option value="">— Sélectionner —</option>
                {customers.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.fullName} · {c.phoneNumber}
                  </option>
                ))}
              </select>
            ) : (
              <input
                className="filter-select"
                placeholder="ID client (ex: k7abc123…)"
                value={form.customerId}
                onChange={set('customerId')}
                required
              />
            )}
          </div>

          {/* Category */}
          <div className="form-group">
            <label className="filter-label">Catégorie</label>
            <select className="filter-select" value={form.category} onChange={set('category')}>
              {ALL_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          {/* Product code */}
          <div className="form-group">
            <label className="filter-label">Code produit</label>
            <input
              className="filter-select"
              placeholder="ex: EPARGNE-LIBRE"
              value={form.productCode}
              onChange={set('productCode')}
              required
            />
          </div>

          {/* Target amount */}
          <div className="form-group">
            <label className="filter-label">Montant cible (FCFA)</label>
            <input
              className="filter-select"
              type="number"
              min="1"
              placeholder="ex: 500000"
              value={form.targetAmount}
              onChange={set('targetAmount')}
              required
            />
          </div>

          {/* Deadline */}
          <div className="form-group">
            <label className="filter-label">Échéance</label>
            <input
              className="filter-select"
              type="date"
              value={form.deadline}
              onChange={set('deadline')}
              required
            />
          </div>

          {error && (
            <div style={{ color: 'var(--neg)', fontSize: 12.5, marginTop: 4 }}>{error}</div>
          )}

          <div className="modal-actions">
            <button type="button" className="btn ghost" onClick={onClose}>
              Annuler
            </button>
            <button type="submit" className="btn brand" disabled={busy}>
              {busy ? 'Enregistrement…' : "Créer l'objectif"}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

function SortHead({ col, sortBy, sortDir, onToggle, children, align }) {
  return (
    <th
      onClick={() => onToggle(col)}
      style={{ textAlign: align || 'left', cursor: 'pointer', userSelect: 'none' }}
    >
      <span style={{ display: 'inline-flex', gap: 4, alignItems: 'center' }}>
        {children}
        <span style={{ opacity: sortBy === col ? 1 : 0.25, fontSize: 9 }}>
          {sortBy === col ? (sortDir === 'asc' ? '▲' : '▼') : '▾'}
        </span>
      </span>
    </th>
  )
}

/**
 * The branchId is normally resolved from the authenticated user's profile.
 * Pass it in as a prop or pull it from a context / Zustand store.
 */
export default function ObjectifsPage({ branchId: branchIdProp, customers: customersProp }) {
  const { tenantId, isLoaded } = useCurrentUser()
  const branchId = branchIdProp ?? tenantId
  // ── Live data ──────────────────────────────────────────────────────────────
  const goalsRaw = useQuery(api.goals.listByBranch, isLoaded && branchId ? { branchId } : 'skip')
  const goals = goalsRaw ?? []
  const goalsLoading = isLoaded && branchId && goalsRaw === undefined

  const customersRaw = useQuery(api.customers.listByBranch, isLoaded && branchId ? {} : 'skip')
  const customers = customersProp ?? customersRaw ?? []

  // ── UI state ───────────────────────────────────────────────────────────────
  const [q, setQ] = useState('')
  const [seg, setSeg] = useState('tous')
  const [cat, setCat] = useState('toutes')
  const [agent, setAgent] = useState('tous')
  const [sortBy, setSortBy] = useState('pct')
  const [sortDir, setSortDir] = useState('desc')
  const [online, setOnline] = useState(true)
  const [showModal, setShowModal] = useState(false)

  // ── Derived values ─────────────────────────────────────────────────────────
  const agents = useMemo(
    () => ['tous', ...Array.from(new Set(goals.map((g) => g.agentName ?? String(g.agentId))))],
    [goals]
  )
  const cats = useMemo(
    () => ['toutes', ...Array.from(new Set(goals.map((g) => g.category)))],
    [goals]
  )

  const counts = useMemo(
    () => ({
      tous: goals.length,
      encours: goals.filter((g) => g.status !== 'atteint' && g.status !== 'enpause').length,
      atteints: goals.filter((g) => g.status === 'atteint').length,
      enretard: goals.filter((g) => g.status === 'enretard').length,
      enpause: goals.filter((g) => g.status === 'enpause').length,
    }),
    [goals]
  )

  const filtered = useMemo(() => {
    const r = goals.filter((g) => {
      if (seg === 'encours' && (g.status === 'atteint' || g.status === 'enpause')) return false
      if (seg === 'atteints' && g.status !== 'atteint') return false
      if (seg === 'enretard' && g.status !== 'enretard') return false
      if (seg === 'enpause' && g.status !== 'enpause') return false
      if (cat !== 'toutes' && g.category !== cat) return false
      const agentLabel = g.agentName ?? String(g.agentId)
      if (agent !== 'tous' && agentLabel !== agent) return false
      const lq = q.toLowerCase()
      if (
        q &&
        !(g.customerName ?? '').toLowerCase().includes(lq) &&
        !g.category.toLowerCase().includes(lq)
      )
        return false
      return true
    })
    r.sort((a, b) => {
      const va = a[sortBy],
        vb = b[sortBy]
      const cmp = typeof va === 'number' ? va - vb : String(va).localeCompare(String(vb), 'fr')
      return sortDir === 'asc' ? cmp : -cmp
    })
    return r
  }, [goals, q, seg, cat, agent, sortBy, sortDir])

  const kpis = useMemo(() => buildKPIs(goals), [goals])

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortBy(col)
      setSortDir('desc')
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="objectifs-page">
      <PageHeader
        crumbs={['Objectifs']}
        title="Objectifs d'épargne"
        sub={`${counts.tous} objectifs · ${counts.encours} en cours · ${counts.atteints} atteints`}
      >
        <button
          className={'status-pill' + (online ? '' : ' offline')}
          onClick={() => setOnline(!online)}
        >
          <span className="status-dot" />
          {online ? 'En ligne · synchronisé' : 'Hors ligne · 4 en file'}
        </button>
        <Novu />
      </PageHeader>

      <section className="kpi-row">
        {kpis.map((k) => (
          <KPI key={k.label} k={k} />
        ))}
      </section>

      <div
        style={{
          display: 'flex',
          justifyContent: 'flex-end',
          alignItems: 'center',
          gap: 8,
          marginBottom: 12,
        }}
      >
        <button className="btn">
          <I.Export size={14} />
          Exporter
        </button>
        <button className="btn brand" onClick={() => setShowModal(true)}>
          <I.Plus size={14} stroke="white" />
          Nouvel objectif
        </button>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="filter-bar">
          <div className="seg-tabs">
            {[
              { k: 'tous', label: 'Tous', n: counts.tous },
              { k: 'encours', label: 'En cours', n: counts.encours },
              { k: 'atteints', label: 'Atteints', n: counts.atteints },
              { k: 'enretard', label: 'En retard', n: counts.enretard },
              { k: 'enpause', label: 'En pause', n: counts.enpause },
            ].map((t) => (
              <button
                key={t.k}
                className={'seg-tab ' + (seg === t.k ? 'on' : '')}
                onClick={() => setSeg(t.k)}
              >
                {t.label}
                <span className="seg-count">{t.n}</span>
              </button>
            ))}
          </div>
          <div className="filter-spacer" />

          <div className="filter-group">
            <label className="filter-label">Catégorie</label>
            <select className="filter-select" value={cat} onChange={(e) => setCat(e.target.value)}>
              {cats.map((a) => (
                <option key={a} value={a}>
                  {a === 'toutes' ? 'Toutes' : a}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label className="filter-label">Agent</label>
            <select
              className="filter-select"
              value={agent}
              onChange={(e) => setAgent(e.target.value)}
            >
              {agents.map((a) => (
                <option key={a} value={a}>
                  {a === 'tous' ? 'Tous les agents' : a}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <input
              className="filter-select"
              style={{ minWidth: 160 }}
              placeholder="Rechercher…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
        </div>

        <div className="table-wrap">
          <table className="data-table obj-table">
            <thead>
              <tr>
                <SortHead
                  col="customerName"
                  sortBy={sortBy}
                  sortDir={sortDir}
                  onToggle={toggleSort}
                >
                  Client
                </SortHead>
                <SortHead col="category" sortBy={sortBy} sortDir={sortDir} onToggle={toggleSort}>
                  Catégorie
                </SortHead>
                <th style={{ width: '26%' }}>Progression</th>
                <SortHead
                  col="currentAmount"
                  align="right"
                  sortBy={sortBy}
                  sortDir={sortDir}
                  onToggle={toggleSort}
                >
                  Épargne
                </SortHead>
                <SortHead
                  col="targetAmount"
                  align="right"
                  sortBy={sortBy}
                  sortDir={sortDir}
                  onToggle={toggleSort}
                >
                  Objectif
                </SortHead>
                <SortHead col="deadline" sortBy={sortBy} sortDir={sortDir} onToggle={toggleSort}>
                  Échéance
                </SortHead>
                <SortHead col="status" sortBy={sortBy} sortDir={sortDir} onToggle={toggleSort}>
                  Statut
                </SortHead>
                <th style={{ width: 30 }}></th>
              </tr>
            </thead>
            <tbody>
              {goalsLoading ? (
                <SkeletonTableRows cols={[160, 80, 120, 80, 90, 70, 30]} rows={7} />
              ) : (
                filtered.map((g) => {
                  const st = statusOf(g.status)
                  const daysLeft = daysUntil(g.deadline)
                  return (
                    <tr key={g._id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="avatar sm">
                            {g.initials ?? g.customerName?.[0] ?? '?'}
                          </div>
                          <div>
                            <div style={{ fontWeight: 550 }}>{g.customerName ?? g.customerId}</div>
                            <div className="cell-sub">{g.agentName ?? g.agentId}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className="chip cat-chip" data-cat={g.category}>
                          <span className="cat-dot" style={{ background: catColor(g.category) }} />
                          {g.category}
                        </span>
                      </td>
                      <td>
                        <div className="prog-cell">
                          <div className="prog-row">
                            <span className="prog-pct">{g.pct ?? 0}%</span>
                            <span className="prog-target">
                              {fmt(g.targetAmount)} <span className="cell-sub">FCFA</span>
                            </span>
                          </div>
                          <div className="goal-bar">
                            <div
                              className="goal-fill"
                              style={{
                                width: Math.min(100, g.pct ?? 0) + '%',
                                background:
                                  g.status === 'atteint'
                                    ? 'linear-gradient(90deg, var(--pos), oklch(0.65 0.12 155))'
                                    : g.status === 'enretard'
                                      ? 'linear-gradient(90deg, var(--neg), oklch(0.7 0.16 30))'
                                      : g.status === 'enpause'
                                        ? 'linear-gradient(90deg, oklch(0.78 0.01 70), oklch(0.85 0.01 70))'
                                        : undefined,
                              }}
                            />
                          </div>
                        </div>
                      </td>
                      <td
                        style={{
                          textAlign: 'right',
                          fontVariantNumeric: 'tabular-nums',
                          fontWeight: 550,
                        }}
                      >
                        {fmt(g.currentAmount ?? 0)}
                        <span className="cell-sub" style={{ marginLeft: 4 }}>
                          FCFA
                        </span>
                      </td>
                      <td
                        style={{
                          textAlign: 'right',
                          fontVariantNumeric: 'tabular-nums',
                          color: 'var(--ink-2)',
                        }}
                      >
                        {fmt(g.targetAmount)}
                        <span className="cell-sub" style={{ marginLeft: 4 }}>
                          FCFA
                        </span>
                      </td>
                      <td>
                        {g.status === 'atteint' ? (
                          <span className="cell-sub">{fmtDeadline(g.deadline)}</span>
                        ) : (
                          <div style={{ lineHeight: 1.25 }}>
                            <div style={{ fontWeight: 500, fontSize: 13 }}>
                              {daysLeft > 0 ? `${daysLeft} j` : "Aujourd'hui"}
                            </div>
                            <div className="cell-sub">{fmtDeadline(g.deadline)}</div>
                          </div>
                        )}
                      </td>
                      <td>
                        <span className="status-chip" data-status={g.status}>
                          <span className="status-chip-dot" style={{ background: st.dot }} />
                          {st.label}
                        </span>
                      </td>
                      <td>
                        <button className="btn ghost sm" style={{ padding: 4 }}>
                          <I.Arrow size={12} />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>

          {!goalsLoading &&
            filtered.length === 0 &&
            (goals.length === 0 ? (
              <EmptyState
                illustration={<GoalIllustration />}
                title="Aucun objectif d'épargne"
                description="Créez le premier objectif d'épargne d'un client pour suivre sa progression."
                actions={
                  <button
                    className="btn brand"
                    style={{ marginTop: 4 }}
                    onClick={() => setShowModal(true)}
                  >
                    <I.Plus size={13} stroke="white" /> Nouvel objectif
                  </button>
                }
              />
            ) : (
              <EmptyState
                illustration={<NoResultsIllustration />}
                title="Aucun objectif trouvé"
                description="Aucun objectif ne correspond aux filtres ou à la recherche en cours."
              />
            ))}

          <div className="table-foot">
            <span>
              Affichage de {filtered.length} sur {goals.length} objectifs
            </span>
            <div className="pager">
              <button className="btn ghost sm" disabled>
                ‹ Précédent
              </button>
              <span className="page-num on">1</span>
              <button className="btn ghost sm" disabled>
                Suivant ›
              </button>
            </div>
          </div>
        </div>
      </div>

      {showModal && (
        <NouvelObjectifModal onClose={() => setShowModal(false)} customers={customers} />
      )}
    </div>
  )
}
