import { useState, useMemo } from 'react'
import { I } from '../icons'
import { fmt, PageHeader } from '../components'
import Novu from '../components/Inbox'

const AGENTS = [
  { id: 1, initials: "KD", name: "Konaté Djibril",    role: "Administrateur", branch: "Bobo-Dioulasso", clients: 58, collected: 1840000, target: 2000000, status: "en ligne",   last: "il y a 2 min",  phone: "+226 70 00 11 22", txMonth: 142, device: { id: "TPE-014", model: "PAX A920", battery: 86, signal: 4, sync: "à jour",       queued: 0,  lastSync: "il y a 1 min", area: "Centre-ville" } },
  { id: 2, initials: "AO", name: "Aïssata Ouédraogo", role: "Agent terrain",  branch: "Banfora",        clients: 42, collected: 1120000, target: 1400000, status: "en ligne",   last: "il y a 5 min",  phone: "+226 76 11 22 33", txMonth: 98,  device: { id: "TPE-021", model: "PAX A920", battery: 62, signal: 3, sync: "à jour",       queued: 0,  lastSync: "il y a 4 min", area: "Marché Banfora" } },
  { id: 3, initials: "MS", name: "Moustapha Sanou",   role: "Agent terrain",  branch: "Hounde",         clients: 31, collected: 720000,  target: 1000000, status: "hors ligne", last: "il y a 1 h",    phone: "+226 78 22 33 44", txMonth: 64,  device: { id: "TPE-009", model: "Sunmi P2",  battery: 24, signal: 0, sync: "en file",      queued: 12, lastSync: "il y a 1 h",   area: "Hounde Sud" } },
  { id: 4, initials: "FB", name: "Fatim Barry",       role: "Caissière",      branch: "Bobo-Dioulasso", clients: 0,  collected: 980000,  target: 1200000, status: "en ligne",   last: "il y a 12 min", phone: "+226 71 33 44 55", txMonth: 187, device: { id: "TPE-002", model: "PAX S920",  battery: 95, signal: 5, sync: "à jour",       queued: 0,  lastSync: "il y a 2 min", area: "Agence Bobo" } },
  { id: 5, initials: "OZ", name: "Oumar Zida",        role: "Agent terrain",  branch: "Banfora",        clients: 27, collected: 540000,  target: 800000,  status: "congé",      last: "hier",          phone: "+226 65 44 55 66", txMonth: 41,  device: { id: "TPE-018", model: "Sunmi P2",  battery: 0,  signal: 0, sync: "hors service", queued: 0,  lastSync: "hier",          area: "—" } },
  { id: 6, initials: "BK", name: "Bintou Kaboré",     role: "Superviseure",   branch: "Bobo-Dioulasso", clients: 0,  collected: 0,       target: 0,       status: "en ligne",   last: "il y a 8 min",  phone: "+226 70 55 66 77", txMonth: 0,   device: { id: "TPE-001", model: "PAX A920", battery: 71, signal: 4, sync: "à jour",       queued: 0,  lastSync: "il y a 3 min", area: "Agence Bobo" } },
]

const AGENT_KPIS = [
  { label: "TPE en service",    value: "4",         unit: "/6 actifs", note: "1 hors-ligne · 1 batt. faible", icon: "users",   delta: "+1",  dir: "up" },
  { label: "Collecte du mois",  value: "5 200 000", unit: "FCFA",      note: "81% de l'objectif",             icon: "wallet",  delta: "81%", dir: "up" },
  { label: "Tx en file (sync)", value: "12",        unit: "",          note: "TPE-009 · Hounde",              icon: "cloud",   delta: "−4",  dir: "up" },
  { label: "Tx / agent · moy.", value: "88",        unit: "",          note: "ce mois",                       icon: "receipt", delta: "+6",  dir: "up" },
]

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

  const branches = useMemo(() => ["toutes", ...Array.from(new Set(AGENTS.map(a => a.branch)))], [])
  const roles    = useMemo(() => ["tous",   ...Array.from(new Set(AGENTS.map(a => a.role)))],   [])

  const filtered = useMemo(() => AGENTS.filter(a => {
    if (branch !== "toutes" && a.branch !== branch) return false
    if (role   !== "tous"   && a.role   !== role)   return false
    if (q && !a.name.toLowerCase().includes(q.toLowerCase()) && !a.phone.includes(q) && !a.device.id.toLowerCase().includes(q.toLowerCase())) return false
    return true
  }), [q, branch, role])

  return (
    <div className="agents-page">
      <PageHeader
        crumbs={["Admin", "Agents & TPE"]}
        title="Agents & terminaux"
        sub={`${AGENTS.length} agents · 6 TPE déployés · 3 agences couvertes`}
      >
        <button className={"status-pill" + (online ? "" : " offline")} onClick={() => setOnline(!online)}>
          <span className="status-dot"></span>{online ? "En ligne · synchronisé" : "Hors ligne · 4 en file"}
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
              {filtered.map(a => {
                const tag = ROLE_TAGS[a.role] || ROLE_TAGS["Agent terrain"]
                const pct = a.target > 0 ? Math.round((a.collected / a.target) * 100) : 0
                return (
                  <tr key={a.id}>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div className="avatar sm" style={{ position: "relative" }}>
                          {a.initials}
                          <span style={{ position: "absolute", right: -1, bottom: -1, width: 8, height: 8, borderRadius: "50%", background: STATUS_DOT[a.status], border: "1.5px solid var(--surface)" }}/>
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
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: STATUS_DOT[a.status] }}/>
                        {a.status}
                      </span>
                    </td>
                    <td><button className="btn ghost sm" style={{ padding: 4 }}><I.More size={14}/></button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="row cols-2 agents-row" style={{ marginBottom: 14 }}>
        <div className="card">
          <div className="card-head">
            <div className="card-title">Top collecteurs · ce mois</div>
            <span className="card-sub" style={{ marginLeft: "auto" }}>Sur le terrain</span>
          </div>
          <div style={{ padding: "4px 14px 16px", display: "flex", flexDirection: "column", gap: 10 }}>
            {[...AGENTS].filter(a => a.collected).sort((a,b) => b.collected - a.collected).slice(0,4).map((a, i) => {
              const pct = Math.round((a.collected / a.target) * 100)
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
          {[
            { who: "Aïssata Ouédraogo", act: "a inscrit",                                  amount: "Boukary Sawadogo (KYC)",      time: "il y a 32 min · TPE-021", dot: "brand" },
            { who: "TPE-009",            act: "synchronisé après 1 h hors-ligne · ",        amount: "12 transactions envoyées",   time: "il y a 5 min",            dot: "info"  },
            { who: "Fatim Barry",        act: "a effectué",                                 amount: "12 dépôts en agence",        time: "il y a 1 h · TPE-002",    dot: "muted" },
            { who: "TPE-018",            act: "batterie épuisée — appareil hors service",   amount: "",                           time: "hier · 18:20",            dot: "muted" },
            { who: "Bintou Kaboré",      act: "a modifié les permissions de",               amount: "Aïssata Ouédraogo",          time: "hier · 14:02",            dot: "info"  },
          ].map((f, i) => (
            <div className="feed-item" key={i}>
              <div className={"feed-dot " + (f.dot === "muted" ? "muted" : f.dot === "info" ? "info" : "")}/>
              <div>
                <div className="feed-text"><strong>{f.who}</strong> {f.act} {f.amount && <strong>{f.amount}</strong>}</div>
                <div className="feed-time">{f.time}</div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
