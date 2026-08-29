import { useState, useMemo, useEffect } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { I } from '../icons'
import { KPI, PageHeader } from '../components'
import { fmt } from '../utils/fmt'
import Novu from '../components/Inbox'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { NewProspectModal } from '../components/NewProspectModal'
import { SkeletonTableRows, SkeletonTablePage } from '../components/Skeleton'
import { EmptyState, EmptyInline } from '../components/EmptyState'
import { ClientsIllustration, NoResultsIllustration } from '../components/Illustrations'

const PAGE_SIZE = 10

function ClientDrawer({ client, onClose }) {
  // Fix 1: pass query fn first, "skip" in args position (second arg) only
  const transactions =
    useQuery(
      api.transactions.listByCustomer,
      client ? { customerId: client._id, limit: 10 } : 'skip'
    ) ?? []

  if (!client) return null

  const pct = Math.min(100, Math.round((client.balance / client.goal) * 100))
  return (
    <>
      <div className="drawer-scrim" onClick={onClose} />
      <aside className="drawer">
        <div className="drawer-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div className="avatar lg">{client.initials}</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 16, letterSpacing: '-0.015em' }}>
                {client.name}
              </div>
              <div className="cell-sub">
                {client.phone} · client depuis{' '}
                {new Date(client.joined).toLocaleDateString('fr-FR', {
                  month: 'long',
                  year: 'numeric',
                })}
              </div>
            </div>
          </div>
          <button className="btn ghost sm" onClick={onClose} style={{ padding: 6 }}>
            ✕
          </button>
        </div>

        <div className="drawer-body">
          <div className="stat-grid">
            <div className="stat">
              <div className="cell-sub">Solde courant</div>
              <div className="stat-v">
                {fmt(client.balance)} <span className="u">FCFA</span>
              </div>
            </div>
            <div className="stat">
              <div className="cell-sub">Objectif</div>
              <div className="stat-v">
                {fmt(client.goal)} <span className="u">FCFA</span>
              </div>
            </div>
            <div className="stat">
              <div className="cell-sub">Moy. mensuelle</div>
              <div className="stat-v">
                {fmt(client.monthlyAvg)} <span className="u">FCFA</span>
              </div>
            </div>
            <div className="stat">
              <div className="cell-sub">Transactions</div>
              <div className="stat-v">{client.txCount}</div>
            </div>
          </div>

          <div className="drawer-section">
            <div className="card-title" style={{ marginBottom: 8 }}>
              Progression de l&apos;objectif
            </div>
            <div className="goal-bar">
              <div className="goal-fill" style={{ width: pct + '%' }} />
            </div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginTop: 6,
                fontSize: 12,
                color: 'var(--ink-3)',
              }}
            >
              <span>{pct}% atteint</span>
              <span>Reste {fmt(Math.max(0, client.goal - client.balance))} FCFA</span>
            </div>
          </div>

          <div className="drawer-section">
            <div className="card-title" style={{ marginBottom: 8 }}>
              Détails
            </div>
            <dl className="info-list">
              <dt>Statut</dt>
              <dd>
                <span
                  className={
                    'tag ' +
                    (client.status === 'verified'
                      ? 'actif'
                      : client.status === 'rejected'
                        ? 'archive'
                        : 'attente')
                  }
                >
                  {client.status === 'verified'
                    ? 'Actif'
                    : client.status === 'rejected'
                      ? 'Archivé'
                      : 'En attente'}
                </span>
              </dd>
              <dt>Produit</dt>
              <dd>{client.product}</dd>
              <dt>Village</dt>
              <dd>{client.village}</dd>
              <dt>Agent référent</dt>
              <dd>{client.agent}</dd>
              <dt>Dernier mouvement</dt>
              <dd>{client.lastTx}</dd>
            </dl>
          </div>

          <div className="drawer-section">
            <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
              <div className="card-title">Historique récent</div>
              <span className="card-action" style={{ marginLeft: 'auto' }}>
                Tout voir <I.Arrow size={12} />
              </span>
            </div>
            <div className="tx-list" style={{ padding: 0 }}>
              {transactions.map((t) => (
                <div key={t._id} className="tx-row">
                  <div className={'tx-icon ' + (t.type === 'withdrawal' ? 'out' : 'in')}>
                    {t.type === 'withdrawal' ? <I.ArrowUp size={14} /> : <I.ArrowDown size={14} />}
                  </div>
                  <div>
                    <div className="tx-name">{t.type === 'withdrawal' ? 'Retrait' : 'Dépôt'}</div>
                    <div className="tx-time">
                      {new Date(t.timestamp ?? t._creationTime).toLocaleDateString('fr-FR', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </div>
                  </div>
                  <div className={'tx-amount ' + (t.type === 'withdrawal' ? 'out' : 'in')}>
                    {t.type === 'withdrawal' ? '−' : '+'}
                    {fmt(t.amount)}
                    <span className="u">FCFA</span>
                  </div>
                </div>
              ))}
              {transactions.length === 0 && (
                <EmptyInline message="Aucune transaction enregistrée pour ce client." />
              )}
            </div>
          </div>
        </div>

        <div className="drawer-foot">
          <button className="btn">
            <I.Phone size={14} />
            Appeler
          </button>
          <button className="btn">
            <I.ArrowUp size={14} />
            Retrait
          </button>
          <button className="btn brand" style={{ marginLeft: 'auto' }}>
            <I.Plus size={14} stroke="white" />
            Nouveau dépôt
          </button>
        </div>
      </aside>
    </>
  )
}

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

export default function ClientsPage() {
  const { isLoaded, convexUser } = useCurrentUser()
  const branchId = convexUser?.branchId ?? null

  // Convex hooks
  const clientsRaw = useQuery(api.customers.listByBranch, isLoaded && branchId ? {} : 'skip')
  const clients = useMemo(() => clientsRaw ?? [], [clientsRaw])
  const clientsLoading = isLoaded && branchId && clientsRaw === undefined

  const createProspectMutation = useMutation(api.customers.createProspect)

  const [q, _setQ] = useState('')
  const [seg, setSeg] = useState('tous')
  const [sortBy, setSortBy] = useState('balance')
  const [sortDir, setSortDir] = useState('desc')
  const [agent, setAgent] = useState('tous')
  const [view, setView] = useState('table')
  const [selected, setSelected] = useState(new Set())
  const [openClient, setOpenClient] = useState(null)
  const [online, setOnline] = useState(true)
  const [page, setPage] = useState(1)
  const [showNewProspectModal, setShowNewProspectModal] = useState(false)
  const [isCreatingProspect, setIsCreatingProspect] = useState(false)

  // Compute data from real clients
  const agents = useMemo(() => {
    const agentNames = Array.from(new Set(clients.map((c) => c.agentName).filter(Boolean)))
    return ['tous', ...agentNames]
  }, [clients])

  // Format clients for display
  const displayClients = useMemo(() => {
    return clients.map((c) => {
      const name = c.fullName || 'Client'
      const initials = name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
      return {
        _id: c._id,
        id: c._id,
        name,
        phone: c.phoneNumber || '',
        initials,
        village: c.village || '—',
        product: c.product || '—',
        balance: c.balance || 0,
        goal: c.goal || 100000,
        monthlyAvg: c.monthlyAvg || 0,
        txCount: c.txCount || 0,
        agent: c.agentName || '—',
        status: c.status || 'prospect',
        joined: c._creationTime ?? 0,
        lastTx: c.lastTransactionAt
          ? new Date(c.lastTransactionAt).toLocaleDateString('fr-FR', {
              month: 'short',
              day: 'numeric',
            })
          : '—',
      }
    })
  }, [clients])

  const filtered = useMemo(() => {
    const r = displayClients.filter((c) => {
      if (seg !== 'tous' && c.status !== seg) return false
      if (agent !== 'tous' && c.agent !== agent) return false
      if (
        q &&
        !c.name.toLowerCase().includes(q.toLowerCase()) &&
        !c.phone.includes(q) &&
        !c.village.toLowerCase().includes(q.toLowerCase())
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
  }, [q, seg, agent, sortBy, sortDir, displayClients])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1)
  }, [q, seg, agent, sortBy, sortDir])

  const handleCreateProspect = async (data) => {
    setIsCreatingProspect(true)
    try {
      await createProspectMutation(data)
      setShowNewProspectModal(false)
    } finally {
      setIsCreatingProspect(false)
    }
  }

  // Show skeleton only while auth/user data is loading
  if (!isLoaded) {
    return (
      <div className="clients-page">
        <PageHeader crumbs={['Clients']} title="Clients" sub="Chargement...">
          <Novu />
        </PageHeader>
        <SkeletonTablePage cols={[36, 180, 90, 80, 80, 70, 40, 90, 70, 30]} rows={8} />
      </div>
    )
  }

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else {
      setSortBy(col)
      setSortDir('desc')
    }
  }
  const counts = {
    tous: displayClients.length,
    actif: displayClients.filter((c) => c.status === 'verified').length,
    attente: displayClients.filter((c) => c.status === 'prospect').length,
    archive: displayClients.filter((c) => c.status === 'rejected').length,
  }

  const toggle = (id) => {
    const n = new Set(selected)
    n.has(id) ? n.delete(id) : n.add(id)
    setSelected(n)
  }
  const allOn = paginated.length > 0 && paginated.every((c) => selected.has(c.id))
  const toggleAll = () => {
    setSelected((prev) => {
      const next = new Set(prev)
      if (allOn) paginated.forEach((c) => next.delete(c.id))
      else paginated.forEach((c) => next.add(c.id))
      return next
    })
  }

  return (
    <div className="clients-page">
      <PageHeader
        crumbs={['Clients']}
        title="Clients"
        sub={`${displayClients.length} fiches · ${counts.actif} actives · ${counts.attente} en attente KYC`}
      >
        <button
          className={'status-pill' + (online ? '' : ' offline')}
          onClick={() => setOnline(!online)}
        >
          <span className="status-dot"></span>
          {online ? 'En ligne · synchronisé' : 'Hors ligne · 4 en file'}
        </button>
        <Novu />
      </PageHeader>

      <section className="kpi-row">
        <KPI
          k={{
            label: 'Clients (total)',
            value: fmt(counts.tous),
            unit: '',
            delta: `${counts.tous}`,
            dir: 'up',
            note: 'enregistrés',
            icon: 'users',
          }}
        />
        <KPI
          k={{
            label: 'Actifs',
            value: fmt(counts.actif),
            unit: '',
            delta: counts.tous > 0 ? `${Math.round((counts.actif / counts.tous) * 100)}%` : '0%',
            dir: 'up',
            note: 'du portefeuille',
            icon: 'users',
          }}
        />
        <KPI
          k={{
            label: 'Solde moyen',
            value: fmt(
              counts.tous > 0
                ? Math.round(displayClients.reduce((s, c) => s + c.balance, 0) / counts.tous)
                : 0
            ),
            unit: 'FCFA',
            delta: '',
            dir: 'up',
            note: 'par client',
            icon: 'wallet',
          }}
        />
        <KPI
          k={{
            label: 'En attente KYC',
            value: fmt(counts.attente),
            unit: '',
            delta: `${counts.attente}`,
            dir: counts.attente > 0 ? 'down' : 'up',
            note: 'à vérifier',
            icon: 'shield',
          }}
        />
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
        <button className="btn brand" onClick={() => setShowNewProspectModal(true)}>
          <I.Plus size={14} stroke="white" />
          Nouveau client
        </button>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="filter-bar">
          <div className="seg-tabs">
            {[
              { k: 'tous', label: 'Tous', n: counts.tous },
              { k: 'verified', label: 'Actifs', n: counts.actif },
              { k: 'prospect', label: 'En attente', n: counts.attente },
              { k: 'rejected', label: 'Archivés', n: counts.archive },
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
          <div className="seg">
            <button className={view === 'table' ? 'on' : ''} onClick={() => setView('table')}>
              Tableau
            </button>
            <button className={view === 'cards' ? 'on' : ''} onClick={() => setView('cards')}>
              Cartes
            </button>
          </div>
        </div>

        {selected.size > 0 && (
          <div className="bulk-bar">
            <strong>{selected.size}</strong> sélectionné{selected.size > 1 ? 's' : ''}
            <div style={{ flex: 1 }} />
            <button className="btn sm">
              <I.Export size={12} />
              Exporter
            </button>
            <button className="btn sm">Assigner agent</button>
            <button className="btn sm">Archiver</button>
            <button className="btn ghost sm" onClick={() => setSelected(new Set())}>
              Effacer
            </button>
          </div>
        )}

        {view === 'table' ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 36 }}>
                    <input type="checkbox" checked={allOn} onChange={toggleAll} />
                  </th>
                  <SortHead col="name" sortBy={sortBy} sortDir={sortDir} onToggle={toggleSort}>
                    Client
                  </SortHead>
                  <SortHead col="village" sortBy={sortBy} sortDir={sortDir} onToggle={toggleSort}>
                    Village
                  </SortHead>
                  <SortHead col="product" sortBy={sortBy} sortDir={sortDir} onToggle={toggleSort}>
                    Produit
                  </SortHead>
                  <SortHead
                    col="balance"
                    align="right"
                    sortBy={sortBy}
                    sortDir={sortDir}
                    onToggle={toggleSort}
                  >
                    Solde
                  </SortHead>
                  <SortHead
                    col="monthlyAvg"
                    align="right"
                    sortBy={sortBy}
                    sortDir={sortDir}
                    onToggle={toggleSort}
                  >
                    Moy. mens.
                  </SortHead>
                  <SortHead
                    col="txCount"
                    align="right"
                    sortBy={sortBy}
                    sortDir={sortDir}
                    onToggle={toggleSort}
                  >
                    Mvts
                  </SortHead>
                  <SortHead col="agent" sortBy={sortBy} sortDir={sortDir} onToggle={toggleSort}>
                    Agent
                  </SortHead>
                  <SortHead col="status" sortBy={sortBy} sortDir={sortDir} onToggle={toggleSort}>
                    Statut
                  </SortHead>
                  <th style={{ width: 30 }}></th>
                </tr>
              </thead>
              <tbody>
                {clientsLoading ? (
                  <SkeletonTableRows cols={[36, 180, 90, 80, 80, 70, 40, 90, 70, 30]} rows={8} />
                ) : (
                  paginated.map((c) => (
                    <tr
                      key={c.id}
                      onClick={() => setOpenClient(c)}
                      className={selected.has(c.id) ? 'selected' : ''}
                    >
                      <td onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selected.has(c.id)}
                          onChange={() => toggle(c.id)}
                        />
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="avatar sm">{c.initials}</div>
                          <div>
                            <div style={{ fontWeight: 550 }}>{c.name}</div>
                            <div className="cell-sub">{c.phone}</div>
                          </div>
                        </div>
                      </td>
                      <td>{c.village}</td>
                      <td>
                        <span className="chip">{c.product}</span>
                      </td>
                      <td
                        style={{
                          textAlign: 'right',
                          fontVariantNumeric: 'tabular-nums',
                          fontWeight: 550,
                        }}
                      >
                        {fmt(c.balance)}
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
                        {fmt(c.monthlyAvg)}
                      </td>
                      <td
                        style={{
                          textAlign: 'right',
                          fontVariantNumeric: 'tabular-nums',
                          color: 'var(--ink-2)',
                        }}
                      >
                        {c.txCount}
                      </td>
                      <td className="cell-sub">{c.agent}</td>
                      <td>
                        <span
                          className={
                            'tag ' +
                            (c.status === 'verified'
                              ? 'actif'
                              : c.status === 'rejected'
                                ? 'archive'
                                : 'attente')
                          }
                        >
                          {c.status === 'verified'
                            ? 'Actif'
                            : c.status === 'rejected'
                              ? 'Archivé'
                              : 'En attente'}
                        </span>
                      </td>
                      <td>
                        <button
                          className="btn ghost sm"
                          style={{ padding: 4 }}
                          onClick={(e) => {
                            e.stopPropagation()
                            setOpenClient(c)
                          }}
                        >
                          <I.Arrow size={12} />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
            {!clientsLoading &&
              filtered.length === 0 &&
              (displayClients.length === 0 ? (
                <EmptyState
                  illustration={<ClientsIllustration />}
                  title="Aucun client enregistré"
                  description="Créez votre premier prospect pour commencer à gérer votre portefeuille clients."
                  actions={
                    <button
                      className="btn brand"
                      style={{ marginTop: 4 }}
                      onClick={() => setShowNewProspectModal(true)}
                    >
                      <I.Plus size={13} stroke="white" /> Nouveau client
                    </button>
                  }
                />
              ) : (
                <EmptyState
                  illustration={<NoResultsIllustration />}
                  title="Aucun client trouvé"
                  description="Aucun client ne correspond aux filtres sélectionnés."
                />
              ))}
            <div className="table-foot">
              <span>
                Affichage de {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–
                {Math.min(page * PAGE_SIZE, filtered.length)} sur {filtered.length} clients
              </span>
              {totalPages > 1 && (
                <div className="pager">
                  <button
                    className="btn ghost sm"
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    ‹ Précédent
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <span
                      key={p}
                      className={'page-num ' + (p === page ? 'on' : '')}
                      onClick={() => setPage(p)}
                      style={{ cursor: 'pointer' }}
                    >
                      {p}
                    </span>
                  ))}
                  <button
                    className="btn ghost sm"
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Suivant ›
                  </button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="card-grid">
            {filtered.length === 0 &&
              (displayClients.length === 0 ? (
                <div style={{ gridColumn: '1/-1' }}>
                  <EmptyState
                    illustration={<ClientsIllustration />}
                    title="Aucun client enregistré"
                    description="Créez votre premier prospect pour commencer à gérer votre portefeuille clients."
                    actions={
                      <button
                        className="btn brand"
                        style={{ marginTop: 4 }}
                        onClick={() => setShowNewProspectModal(true)}
                      >
                        <I.Plus size={13} stroke="white" /> Nouveau client
                      </button>
                    }
                  />
                </div>
              ) : (
                <div style={{ gridColumn: '1/-1' }}>
                  <EmptyState
                    illustration={<NoResultsIllustration />}
                    title="Aucun client trouvé"
                    description="Aucun client ne correspond aux filtres sélectionnés."
                  />
                </div>
              ))}
            {paginated.map((c) => (
              <div key={c.id} className="client-card" onClick={() => setOpenClient(c)}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div className="avatar lg">{c.initials}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }}>{c.name}</div>
                    <div className="cell-sub">{c.phone}</div>
                  </div>
                  <span
                    className={
                      'tag ' +
                      (c.status === 'verified'
                        ? 'actif'
                        : c.status === 'rejected'
                          ? 'archive'
                          : 'attente')
                    }
                  >
                    {c.status === 'verified'
                      ? 'Actif'
                      : c.status === 'rejected'
                        ? 'Archivé'
                        : 'En attente'}
                  </span>
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: 14,
                    fontSize: 12,
                  }}
                >
                  <div>
                    <div className="cell-sub">Solde</div>
                    <div
                      style={{ fontWeight: 600, fontSize: 16, fontVariantNumeric: 'tabular-nums' }}
                    >
                      {fmt(c.balance)}{' '}
                      <span style={{ fontSize: 11, color: 'var(--ink-3)' }}>FCFA</span>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="cell-sub">Objectif</div>
                    <div style={{ fontWeight: 550, fontVariantNumeric: 'tabular-nums' }}>
                      {Math.round((c.balance / c.goal) * 100)}%
                    </div>
                  </div>
                </div>
                <div className="goal-bar" style={{ marginTop: 8 }}>
                  <div
                    className="goal-fill"
                    style={{ width: Math.min(100, (c.balance / c.goal) * 100) + '%' }}
                  />
                </div>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: 12,
                    fontSize: 11.5,
                    color: 'var(--ink-3)',
                  }}
                >
                  <span>
                    {c.village} · {c.product}
                  </span>
                  <span>{c.txCount} mvts</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ClientDrawer client={openClient} onClose={() => setOpenClient(null)} />
      <NewProspectModal
        isOpen={showNewProspectModal}
        onClose={() => setShowNewProspectModal(false)}
        onSubmit={handleCreateProspect}
        isLoading={isCreatingProspect}
      />
    </div>
  )
}
