import { useState, useMemo } from 'react'
import { I } from '../icons'
import { fmt, KPI, PageHeader } from '../components'
import Novu from '../components/Inbox'
const CLIENTS = []
const CLIENT_KPIS = []
const CLIENT_TX = {}

function ClientDrawer({ client, onClose }) {
  if (!client) return null
  const history = CLIENT_TX[client.id] || [
    { type: "in",  label: "Dépôt",   amount: 10000, time: "il y a 3 j" },
    { type: "out", label: "Retrait", amount: 5000,  time: "il y a 8 j" },
    { type: "in",  label: "Dépôt",   amount: 15000, time: "il y a 14 j" },
  ]
  const pct = Math.min(100, Math.round((client.balance / client.goal) * 100))
  return (
    <>
      <div className="drawer-scrim" onClick={onClose}/>
      <aside className="drawer">
        <div className="drawer-head">
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <div className="avatar lg">{client.initials}</div>
            <div>
              <div style={{ fontWeight: 600, fontSize: 16, letterSpacing: "-0.015em" }}>{client.name}</div>
              <div className="cell-sub">{client.phone} · client depuis {new Date(client.joined).toLocaleDateString("fr-FR", { month: "long", year: "numeric" })}</div>
            </div>
          </div>
          <button className="btn ghost sm" onClick={onClose} style={{ padding: 6 }}>✕</button>
        </div>

        <div className="drawer-body">
          <div className="stat-grid">
            <div className="stat"><div className="cell-sub">Solde courant</div><div className="stat-v">{fmt(client.balance)} <span className="u">FCFA</span></div></div>
            <div className="stat"><div className="cell-sub">Objectif</div><div className="stat-v">{fmt(client.goal)} <span className="u">FCFA</span></div></div>
            <div className="stat"><div className="cell-sub">Moy. mensuelle</div><div className="stat-v">{fmt(client.monthlyAvg)} <span className="u">FCFA</span></div></div>
            <div className="stat"><div className="cell-sub">Transactions</div><div className="stat-v">{client.txCount}</div></div>
          </div>

          <div className="drawer-section">
            <div className="card-title" style={{ marginBottom: 8 }}>Progression de l'objectif</div>
            <div className="goal-bar"><div className="goal-fill" style={{ width: pct + "%" }}/></div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6, fontSize: 12, color: "var(--ink-3)" }}>
              <span>{pct}% atteint</span>
              <span>Reste {fmt(Math.max(0, client.goal - client.balance))} FCFA</span>
            </div>
          </div>

          <div className="drawer-section">
            <div className="card-title" style={{ marginBottom: 8 }}>Détails</div>
            <dl className="info-list">
              <dt>Statut</dt><dd><span className={"tag " + (client.status === "actif" ? "actif" : client.status === "archive" ? "archive" : "attente")}>{client.status === "actif" ? "Actif" : client.status === "archive" ? "Archivé" : "En attente"}</span></dd>
              <dt>Produit</dt><dd>{client.product}</dd>
              <dt>Village</dt><dd>{client.village}</dd>
              <dt>Agent référent</dt><dd>{client.agent}</dd>
              <dt>Dernier mouvement</dt><dd>{client.lastTx}</dd>
            </dl>
          </div>

          <div className="drawer-section">
            <div style={{ display: "flex", alignItems: "center", marginBottom: 8 }}>
              <div className="card-title">Historique récent</div>
              <span className="card-action" style={{ marginLeft: "auto" }}>Tout voir <I.Arrow size={12}/></span>
            </div>
            <div className="tx-list" style={{ padding: 0 }}>
              {history.map((t, i) => (
                <div key={i} className="tx-row">
                  <div className={"tx-icon " + t.type}>{t.type === "in" ? <I.ArrowDown size={14}/> : <I.ArrowUp size={14}/>}</div>
                  <div>
                    <div className="tx-name">{t.label}</div>
                    <div className="tx-time">{t.time}</div>
                  </div>
                  <div className={"tx-amount " + t.type}>{t.type === "in" ? "+" : "−"}{fmt(t.amount)}<span className="u">FCFA</span></div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="drawer-foot">
          <button className="btn"><I.Phone size={14}/>Appeler</button>
          <button className="btn"><I.ArrowUp size={14}/>Retrait</button>
          <button className="btn brand" style={{ marginLeft: "auto" }}><I.Plus size={14} stroke="white"/>Nouveau dépôt</button>
        </div>
      </aside>
    </>
  )
}

export default function ClientsPage() {
  const [q, setQ] = useState("")
  const [seg, setSeg] = useState("tous")
  const [sortBy, setSortBy] = useState("balance")
  const [sortDir, setSortDir] = useState("desc")
  const [agent, setAgent] = useState("tous")
  const [view, setView] = useState("table")
  const [selected, setSelected] = useState(new Set())
  const [openClient, setOpenClient] = useState(null)
  const [online, setOnline] = useState(true)

  const agents = useMemo(() => ["tous", ...Array.from(new Set(CLIENTS.map(c => c.agent)))], [])

  const filtered = useMemo(() => {
    let r = CLIENTS.filter(c => {
      if (seg !== "tous" && c.status !== seg) return false
      if (agent !== "tous" && c.agent !== agent) return false
      if (q && !c.name.toLowerCase().includes(q.toLowerCase()) && !c.phone.includes(q) && !c.village.toLowerCase().includes(q.toLowerCase())) return false
      return true
    })
    r.sort((a, b) => {
      const va = a[sortBy], vb = b[sortBy]
      const cmp = typeof va === "number" ? va - vb : String(va).localeCompare(String(vb), "fr")
      return sortDir === "asc" ? cmp : -cmp
    })
    return r
  }, [q, seg, agent, sortBy, sortDir])

  const toggleSort = (col) => {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc")
    else { setSortBy(col); setSortDir("desc") }
  }
  const SortHead = ({ col, children, align }) => (
    <th onClick={() => toggleSort(col)} style={{ textAlign: align || "left", cursor: "pointer", userSelect: "none" }}>
      <span style={{ display: "inline-flex", gap: 4, alignItems: "center" }}>
        {children}
        <span style={{ opacity: sortBy === col ? 1 : 0.25, fontSize: 9 }}>
          {sortBy === col ? (sortDir === "asc" ? "▲" : "▼") : "▾"}
        </span>
      </span>
    </th>
  )

  const counts = {
    tous:    CLIENTS.length,
    actif:   CLIENTS.filter(c => c.status === "actif").length,
    attente: CLIENTS.filter(c => c.status === "attente").length,
    archive: CLIENTS.filter(c => c.status === "archive").length,
  }

  const toggle = (id) => {
    const n = new Set(selected)
    n.has(id) ? n.delete(id) : n.add(id)
    setSelected(n)
  }
  const allOn = filtered.length > 0 && filtered.every(c => selected.has(c.id))
  const toggleAll = () => {
    if (allOn) setSelected(new Set())
    else setSelected(new Set(filtered.map(c => c.id)))
  }

  const [commandPaletteActive, setCommandPaletteActive] = useState(false)

  return (
    <div className="clients-page">
      <PageHeader
        crumbs={["Clients"]}
        title="Clients"
        sub={`${CLIENTS.length} fiches · ${counts.actif} actives · ${counts.attente} en attente KYC`}
      >
          <button className={"status-pill" + (online ? "" : " offline")} onClick={() => setOnline(!online)}>
          <span className="status-dot"></span>{online ? "En ligne · synchronisé" : "Hors ligne · 4 en file"}
        </button>
        <Novu />
      </PageHeader>

      <section className="kpi-row">
        {CLIENT_KPIS.map(k => <KPI key={k.label} k={k}/>)}
      </section>
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <button className="btn"><I.Export size={14}/>Exporter</button>
        <button className="btn brand"><I.Plus size={14} stroke="white"/>Nouveau client</button>
      </div>

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="filter-bar">
          <div className="seg-tabs">
            {[
              { k: "tous",    label: "Tous",        n: counts.tous },
              { k: "actif",   label: "Actifs",      n: counts.actif },
              { k: "attente", label: "En attente",  n: counts.attente },
              { k: "archive", label: "Archivés",    n: counts.archive },
            ].map(t => (
              <button key={t.k} className={"seg-tab " + (seg === t.k ? "on" : "")} onClick={() => setSeg(t.k)}>
                {t.label}<span className="seg-count">{t.n}</span>
              </button>
            ))}
          </div>
          <div className="filter-spacer"/>
          <div className="filter-group">
            <label className="filter-label">Agent</label>
            <select className="filter-select" value={agent} onChange={e => setAgent(e.target.value)}>
              {agents.map(a => <option key={a} value={a}>{a === "tous" ? "Tous les agents" : a}</option>)}
            </select>
          </div>
          <div className="seg">
            <button className={view === "table" ? "on" : ""} onClick={() => setView("table")}>Tableau</button>
            <button className={view === "cards" ? "on" : ""} onClick={() => setView("cards")}>Cartes</button>
          </div>
        </div>

        {selected.size > 0 && (
          <div className="bulk-bar">
            <strong>{selected.size}</strong> sélectionné{selected.size > 1 ? "s" : ""}
            <div style={{ flex: 1 }}/>
            <button className="btn sm"><I.Export size={12}/>Exporter</button>
            <button className="btn sm">Assigner agent</button>
            <button className="btn sm">Archiver</button>
            <button className="btn ghost sm" onClick={() => setSelected(new Set())}>Effacer</button>
          </div>
        )}

        {view === "table" ? (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th style={{ width: 36 }}><input type="checkbox" checked={allOn} onChange={toggleAll} /></th>
                  <SortHead col="name">Client</SortHead>
                  <SortHead col="village">Village</SortHead>
                  <SortHead col="product">Produit</SortHead>
                  <SortHead col="balance" align="right">Solde</SortHead>
                  <SortHead col="monthlyAvg" align="right">Moy. mens.</SortHead>
                  <SortHead col="txCount" align="right">Mvts</SortHead>
                  <SortHead col="agent">Agent</SortHead>
                  <SortHead col="status">Statut</SortHead>
                  <th style={{ width: 30 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr key={c.id} onClick={() => setOpenClient(c)} className={selected.has(c.id) ? "selected" : ""}>
                    <td onClick={e => e.stopPropagation()}>
                      <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div className="avatar sm">{c.initials}</div>
                        <div>
                          <div style={{ fontWeight: 550 }}>{c.name}</div>
                          <div className="cell-sub">{c.phone}</div>
                        </div>
                      </div>
                    </td>
                    <td>{c.village}</td>
                    <td><span className="chip">{c.product}</span></td>
                    <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 550 }}>
                      {fmt(c.balance)}<span className="cell-sub" style={{ marginLeft: 4 }}>FCFA</span>
                    </td>
                    <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: "var(--ink-2)" }}>
                      {fmt(c.monthlyAvg)}
                    </td>
                    <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: "var(--ink-2)" }}>{c.txCount}</td>
                    <td className="cell-sub">{c.agent}</td>
                    <td>
                      <span className={"tag " + (c.status === "actif" ? "actif" : c.status === "archive" ? "archive" : "attente")}>
                        {c.status === "actif" ? "Actif" : c.status === "archive" ? "Archivé" : "En attente"}
                      </span>
                    </td>
                    <td><button className="btn ghost sm" style={{ padding: 4 }} onClick={e => { e.stopPropagation(); setOpenClient(c) }}><I.Arrow size={12}/></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div style={{ padding: 40, textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>
                Aucun client ne correspond aux filtres.
              </div>
            )}
            <div className="table-foot">
              <span>Affichage de {filtered.length} sur {CLIENTS.length} clients</span>
              <div className="pager">
                <button className="btn ghost sm" disabled>‹ Précédent</button>
                <span className="page-num on">1</span>
                <span className="page-num">2</span>
                <span className="page-num">3</span>
                <button className="btn ghost sm">Suivant ›</button>
              </div>
            </div>
          </div>
        ) : (
          <div className="card-grid">
            {filtered.map(c => (
              <div key={c.id} className="client-card" onClick={() => setOpenClient(c)}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div className="avatar lg">{c.initials}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }}>{c.name}</div>
                    <div className="cell-sub">{c.phone}</div>
                  </div>
                  <span className={"tag " + (c.status === "actif" ? "actif" : c.status === "archive" ? "archive" : "attente")}>
                    {c.status === "actif" ? "Actif" : c.status === "archive" ? "Archivé" : "En attente"}
                  </span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 14, fontSize: 12 }}>
                  <div>
                    <div className="cell-sub">Solde</div>
                    <div style={{ fontWeight: 600, fontSize: 16, fontVariantNumeric: "tabular-nums" }}>{fmt(c.balance)} <span style={{ fontSize: 11, color: "var(--ink-3)" }}>FCFA</span></div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div className="cell-sub">Objectif</div>
                    <div style={{ fontWeight: 550, fontVariantNumeric: "tabular-nums" }}>{Math.round((c.balance / c.goal) * 100)}%</div>
                  </div>
                </div>
                <div className="goal-bar" style={{ marginTop: 8 }}>
                  <div className="goal-fill" style={{ width: Math.min(100, (c.balance / c.goal) * 100) + "%" }}/>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 12, fontSize: 11.5, color: "var(--ink-3)" }}>
                  <span>{c.village} · {c.product}</span>
                  <span>{c.txCount} mvts</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <ClientDrawer client={openClient} onClose={() => setOpenClient(null)} />
    </div>
  )
}
