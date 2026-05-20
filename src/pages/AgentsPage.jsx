import { useState, useMemo } from 'react'
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { I } from '../icons'
import { fmt, PageHeader } from '../components'
import Novu from '../components/Inbox'

const ROLE_TAGS = {
  "Administrateur": { bg: "oklch(0.94 0.04 50)",  fg: "var(--brand-ink)" },
  "Superviseure":   { bg: "oklch(0.94 0.05 270)", fg: "oklch(0.4 0.13 270)" },
  "Agent terrain":  { bg: "var(--surface-inset)", fg: "var(--ink-2)" },
  "Caissière":      { bg: "oklch(0.95 0.04 190)", fg: "oklch(0.4 0.1 190)" },
}

const STATUS_DOT = {
  "en ligne":   "var(--pos)",
  "hors ligne": "oklch(0.7 0.02 70)",
  "congé":      "var(--warn)",
}

function formatLastSync(ts) {
  if (!ts) return "jamais"
  const mins = Math.floor((Date.now() - ts) / 60000)
  if (mins < 1) return "à l'instant"
  if (mins < 60) return `il y a ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `il y a ${hrs} h`
  return "hier"
}

function mapAgent(u, branchName) {
  const words = u.fullName.trim().split(/\s+/)
  const initials = words.length >= 2
    ? (words[0][0] + words[words.length - 1][0]).toUpperCase()
    : u.fullName.slice(0, 2).toUpperCase()

  const d = u.device
  const device = d ? {
    id: d.serialNumber,
    model: d.model,
    battery: d.batteryPct ?? 0,
    signal: d.signalLevel ?? 0,
    sync: d.status !== 'active' ? 'hors service' : (d.queuedCount ?? 0) > 0 ? 'en file' : 'à jour',
    queued: d.queuedCount ?? 0,
    lastSync: formatLastSync(d.lastSync),
    area: branchName || '—',
  } : {
    id: '—', model: '—', battery: 0, signal: 0,
    sync: 'hors service', queued: 0, lastSync: '—', area: '—',
  }

  return {
    id: u._id,
    initials,
    name: u.fullName,
    phone: u.phoneNumber,
    role: 'Agent terrain',
    branch: branchName || '—',
    status: u.status === 'active' ? 'en ligne' : 'hors ligne',
    last: formatLastSync(d?.lastSync),
    collected: 0,
    target: 0,
    clients: 0,
    txMonth: 0,
    device,
  }
}

function SignalBars({ level = 0 }) {
  return (
    <span style={{ display: "inline-flex", alignItems: "flex-end", gap: 1.5, height: 12 }}>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{
          width: 2.5,
          height: 3 + i * 1.6,
          borderRadius: 1,
          background: i <= level ? "var(--ink-2)" : "var(--border-strong)",
        }}/>
      ))}
    </span>
  )
}

function Battery({ pct = 100 }) {
  const color = pct < 25 ? "var(--neg)" : pct < 50 ? "var(--warn)" : "var(--pos)"
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, fontSize: 11.5, color: "var(--ink-2)", fontVariantNumeric: "tabular-nums" }}>
      <span style={{ position: "relative", width: 22, height: 11, border: "1.2px solid var(--border-strong)", borderRadius: 2.5 }}>
        <span style={{
          position: "absolute", left: 1, top: 1, bottom: 1,
          width: `calc(${Math.max(0, Math.min(100, pct))}% - 2px)`,
          background: color, borderRadius: 1.5,
        }}/>
        <span style={{ position: "absolute", right: -3, top: 3, bottom: 3, width: 2, background: "var(--border-strong)", borderRadius: "0 1px 1px 0" }}/>
      </span>
      {pct}%
    </span>
  )
}

function SyncTag({ d }) {
  if (d.sync === "à jour")  return <span className="tag actif">À jour</span>
  if (d.sync === "en file") return <span className="tag attente">{d.queued} en file</span>
  return <span className="tag archive">Hors service</span>
}

export default function AgentsPage() {
  const [q, setQ] = useState("")
  const [branch, setBranch] = useState("toutes")
  const [role, setRole] = useState("tous")
  const [online, setOnline] = useState(true)

  const { tenantId, convexUser, isLoaded } = useCurrentUser()
  const branchName = convexUser?.branch?.name ?? null

  const rawAgents = useQuery(
    api.agents.listByBranch,
    isLoaded && tenantId ? { branchId: tenantId } : 'skip',
  )

  const AGENTS = useMemo(
    () => (rawAgents ?? []).map(u => mapAgent(u, branchName)),
    [rawAgents, branchName],
  )

  const activeDevices = AGENTS.filter(a => a.device.sync !== 'hors service').length
  const queuedTotal   = AGENTS.reduce((s, a) => s + a.device.queued, 0)
  const queuedAgent   = AGENTS.find(a => a.device.queued > 0)

  const AGENT_KPIS = [
    { label: "TPE en service",    value: String(activeDevices), unit: `/${AGENTS.length} actifs`, note: "Appareils avec sync active",          icon: "users",   delta: `${activeDevices}`,  dir: "up" },
    { label: "Collecte du mois",  value: "—",                  unit: "FCFA",                     note: "Données transactions requises",       icon: "wallet",  delta: "—",                 dir: "up" },
    { label: "Tx en file (sync)", value: String(queuedTotal),  unit: "",                         note: queuedAgent ? `${queuedAgent.device.id} · ${queuedAgent.branch}` : "Aucune", icon: "cloud", delta: "—", dir: "up" },
    { label: "Tx / agent · moy.", value: "—",                  unit: "",                         note: "Données transactions requises",       icon: "receipt", delta: "—",                 dir: "up" },
  ]

  const branches = useMemo(() => ["toutes", ...Array.from(new Set(AGENTS.map(a => a.branch)))], [AGENTS])
  const roles    = useMemo(() => ["tous",   ...Array.from(new Set(AGENTS.map(a => a.role)))],   [AGENTS])

  const filtered = useMemo(() => AGENTS.filter(a => {
    if (branch !== "toutes" && a.branch !== branch) return false
    if (role   !== "tous"   && a.role   !== role)   return false
    if (q && !a.name.toLowerCase().includes(q.toLowerCase()) && !a.phone.includes(q) && !a.device.id.toLowerCase().includes(q.toLowerCase())) return false
    return true
  }), [q, branch, role, AGENTS])

  const isLoadingAgents = rawAgents === undefined

  return (
    <div className="agents-page">
      <PageHeader
        crumbs={["Admin", "Agents & TPE"]}
        title="Agents & terminaux"
        sub={isLoadingAgents ? "Chargement…" : `${AGENTS.length} agents · ${activeDevices} TPE déployés · ${branchName ?? '—'}`}
      >
        <button className={"status-pill" + (online ? "" : " offline")} onClick={() => setOnline(!online)}>
          <span className="status-dot"></span>{online ? "En ligne · synchronisé" : "Hors ligne · " + queuedTotal + " en file"}
        </button>
        <Novu />
      </PageHeader>
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <button className="btn"><I.Cloud size={14}/>Forcer sync</button>
        <button className="btn brand"><I.Plus size={14} stroke="white"/>Nouvel agent</button>
      </div>
      <section className="kpi-row">
        {AGENT_KPIS.map(k => (
          <div className="kpi" key={k.label}>
            <div className="kpi-label">
              {k.icon === "users"   && <I.Users/>}
              {k.icon === "wallet"  && <I.Wallet/>}
              {k.icon === "receipt" && <I.Receipt/>}
              {k.icon === "cloud"   && <I.Cloud/>}
              {k.label}
            </div>
            <div className="kpi-value">{k.value}{k.unit && <span className="unit">{k.unit}</span>}</div>
            <div className="kpi-foot">
              <span className={"delta " + (k.dir === "up" ? "up" : "down")}>
                {k.dir === "up" ? <I.ArrowUR size={10} stroke="currentColor"/> : <I.ArrowDR size={10} stroke="currentColor"/>}
                {k.delta}
              </span>
              <span>{k.note}</span>
            </div>
          </div>
        ))}
      </section>
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-head">
          <div className="card-title">Flotte d'agents · TPE en service</div>
          <div className="filter-spacer"/>
          <div className="filter-group">
            <label className="filter-label">Agence</label>
            <select className="filter-select" value={branch} onChange={e => setBranch(e.target.value)}>
              {branches.map(b => <option key={b} value={b}>{b === "toutes" ? "Toutes" : b}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <label className="filter-label">Rôle</label>
            <select className="filter-select" value={role} onChange={e => setRole(e.target.value)}>
              {roles.map(r => <option key={r} value={r}>{r === "tous" ? "Tous" : r}</option>)}
            </select>
          </div>
        </div>

        <div className="table-wrap">
          {isLoadingAgents ? (
            <div style={{ padding: 40, textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>
              Chargement des agents…
            </div>
          ) : (
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
                  <th style={{ textAlign: "right" }}>Collecte mois</th>
                  <th>Statut</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={10} style={{ padding: 40, textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>
                      Aucun agent ne correspond aux filtres.
                    </td>
                  </tr>
                ) : filtered.map(a => {
                  const tag = ROLE_TAGS[a.role] || ROLE_TAGS["Agent terrain"]
                  const pct = a.target > 0 ? Math.round((a.collected / a.target) * 100) : 0
                  return (
                    <tr key={a.id}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <div className="avatar sm" style={{ position: "relative" }}>
                            {a.initials}
                            <span style={{ position: "absolute", right: -1, bottom: -1, width: 8, height: 8, borderRadius: "50%", background: STATUS_DOT[a.status] ?? STATUS_DOT["hors ligne"], border: "1.5px solid var(--surface)" }}/>
                          </div>
                          <div>
                            <div style={{ fontWeight: 550 }}>{a.name}</div>
                            <div className="cell-sub">{a.phone}</div>
                          </div>
                        </div>
                      </td>
                      <td><span className="chip" style={{ background: tag.bg, color: tag.fg, borderColor: "transparent" }}>{a.role}</span></td>
                      <td>
                        <div>{a.branch}</div>
                        <div className="cell-sub">{a.device.area}</div>
                      </td>
                      <td>
                        <div style={{ fontFamily: "var(--font-mono)", fontSize: 12, fontWeight: 550 }}>{a.device.id}</div>
                        <div className="cell-sub">{a.device.model}</div>
                      </td>
                      <td><Battery pct={a.device.battery}/></td>
                      <td><SignalBars level={a.device.signal}/></td>
                      <td>
                        <SyncTag d={a.device}/>
                        <div className="cell-sub" style={{ marginTop: 2 }}>{a.device.lastSync}</div>
                      </td>
                      <td style={{ textAlign: "right", minWidth: 130 }}>
                        <div style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                          {a.collected ? fmt(a.collected) : "—"}
                        </div>
                        {a.target > 0 && (
                          <>
                            <div className="goal-bar" style={{ marginTop: 4 }}>
                              <div className="goal-fill" style={{ width: Math.min(100, pct) + "%" }}/>
                            </div>
                            <div className="cell-sub" style={{ marginTop: 2, fontVariantNumeric: "tabular-nums" }}>{pct}% obj.</div>
                          </>
                        )}
                      </td>
                      <td>
                        <span style={{ display: "inline-flex", alignItems: "center", gap: 6, fontSize: 12 }}>
                          <span style={{ width: 6, height: 6, borderRadius: "50%", background: STATUS_DOT[a.status] ?? STATUS_DOT["hors ligne"] }}/>
                          {a.status}
                        </span>
                      </td>
                      <td><button className="btn ghost sm" style={{ padding: 4 }}><I.More size={14}/></button></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="row cols-2 agents-row" style={{ marginBottom: 14 }}>
        <div className="card">
          <div className="card-head">
            <div className="card-title">Top collecteurs · ce mois</div>
            <span className="card-sub" style={{ marginLeft: "auto" }}>Sur le terrain</span>
          </div>
          <div style={{ padding: "4px 14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
            {AGENTS.filter(a => a.collected > 0).sort((a,b) => b.collected - a.collected).slice(0,4).length === 0 ? (
              <div style={{ padding: "12px 0", color: "var(--ink-3)", fontSize: 13 }}>Aucune collecte enregistrée ce mois.</div>
            ) : AGENTS.filter(a => a.collected > 0).sort((a,b) => b.collected - a.collected).slice(0,4).map((a, i) => {
              const pct = a.target > 0 ? Math.round((a.collected / a.target) * 100) : 0
              return (
                <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 18, fontWeight: 600, color: "var(--ink-3)", fontVariantNumeric: "tabular-nums", fontSize: 12 }}>{i+1}</div>
                  <div className="avatar sm">{a.initials}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 550, fontSize: 13 }}>{a.name}</div>
                    <div className="cell-sub" style={{ fontFamily: "var(--font-mono)", fontSize: 10.5 }}>{a.device.id} · {a.device.area}</div>
                    <div className="goal-bar" style={{ marginTop: 4 }}>
                      <div className="goal-fill" style={{ width: Math.min(100, pct) + "%" }}/>
                    </div>
                  </div>
                  <div style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                    <div style={{ fontWeight: 600, fontSize: 13 }}>{fmt(a.collected)}</div>
                    <div className="cell-sub">{pct}% obj.</div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div className="card">
          <div className="card-head">
            <div className="card-title">Permissions · matrice</div>
            <span className="card-action" style={{ marginLeft: "auto" }}>Modifier <I.Arrow size={12}/></span>
          </div>
          <div style={{ padding: "0 14px 14px", overflowX: "auto" }}>
            <table className="perm-table">
              <thead>
                <tr><th></th><th>Admin</th><th>Superv.</th><th>Agent</th><th>Caisse</th></tr>
              </thead>
              <tbody>
                {[
                  ["Voir clients",            1,1,1,1],
                  ["Inscrire (KYC sur TPE)",  1,1,1,0],
                  ["Encaisser dépôt",         1,1,1,1],
                  ["Valider retrait",         1,1,0,1],
                  ["Mode hors-ligne",         1,1,1,1],
                  ["Modifier objectifs",      1,1,0,0],
                  ["Gérer agents & TPE",      1,0,0,0],
                ].map(([label, ...vals]) => (
                  <tr key={label}>
                    <td>{label}</td>
                    {vals.map((v, i) => (
                      <td key={i} style={{ textAlign: "center" }}>
                        {v ? <span className="perm-yes"><I.Check size={11} stroke="white"/></span> : <span className="perm-no">—</span>}
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
          <span className="card-sub" style={{ marginLeft: "auto" }}>Tirée des TPE</span>
        </div>
        <div className="feed">
          {AGENTS.filter(a => a.device.queued > 0).map((a, i) => (
            <div className="feed-item" key={i}>
              <div className="feed-dot info"/>
              <div>
                <div className="feed-text"><strong>{a.device.id}</strong> a {a.device.queued} transaction(s) en file d'attente</div>
                <div className="feed-time">Dernière sync · {a.device.lastSync}</div>
              </div>
            </div>
          ))}
          {AGENTS.filter(a => a.device.sync === 'hors service').map((a, i) => (
            <div className="feed-item" key={"off-" + i}>
              <div className="feed-dot muted"/>
              <div>
                <div className="feed-text"><strong>{a.device.id}</strong> hors service — {a.name}</div>
                <div className="feed-time">Dernière sync · {a.device.lastSync}</div>
              </div>
            </div>
          ))}
          {AGENTS.filter(a => a.device.queued === 0 && a.device.sync !== 'hors service').length === AGENTS.length && AGENTS.length > 0 && (
            <div className="feed-item">
              <div className="feed-dot"/>
              <div>
                <div className="feed-text">Tous les TPE sont synchronisés</div>
                <div className="feed-time">Aucune activité en attente</div>
              </div>
            </div>
          )}
          {AGENTS.length === 0 && !isLoadingAgents && (
            <div style={{ padding: "12px 0", color: "var(--ink-3)", fontSize: 13 }}>Aucun agent dans cette agence.</div>
          )}
        </div>
      </div>
    </div>
  )
}
