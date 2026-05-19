import { useState, useMemo } from 'react'
import { I } from '../icons'
import Novu from '../components/Inbox'
import { fmt, PageHeader, SearchInput } from '../components'

const PAGE_SIZE = 10

const TX_FULL = [
  { id: "TX-2026-0421", type: "in",  client: "Awa Konaté",           clientInit: "AK", label: "Dépôt",      amount: 15000, time: "Aujourd'hui, 10:22", agent: "K. Djibril",   tpe: "TPE-014", channel: "TPE",    status: "validée",    reference: "DEP-A14-0421" },
  { id: "TX-2026-0420", type: "out", client: "Ibrahim Traoré",       clientInit: "IT", label: "Retrait",    amount: 30000, time: "Aujourd'hui, 09:05", agent: "K. Djibril",   tpe: "TPE-014", channel: "Agence", status: "validée",    reference: "RET-A14-0420" },
  { id: "TX-2026-0419", type: "in",  client: "Mariam Sankara",       clientInit: "MS", label: "Dépôt",      amount: 22000, time: "Aujourd'hui, 08:14", agent: "A. Ouédraogo", tpe: "TPE-021", channel: "TPE",    status: "validée",    reference: "DEP-B21-0419" },
  { id: "TX-2026-0418", type: "in",  client: "Rasmata Kaboré",       clientInit: "RK", label: "Cotisation", amount: 5000,  time: "Aujourd'hui, 07:42", agent: "K. Djibril",   tpe: "TPE-014", channel: "TPE",    status: "validée",    reference: "COT-A14-0418" },
  { id: "TX-2026-0417", type: "out", client: "Adama Compaoré",       clientInit: "AC", label: "Retrait",    amount: 12000, time: "Hier, 17:55",        agent: "A. Ouédraogo", tpe: "TPE-021", channel: "TPE",    status: "en attente", reference: "RET-B21-0417" },
  { id: "TX-2026-0416", type: "in",  client: "Moussa Diallo",        clientInit: "MD", label: "Dépôt",      amount: 50000, time: "Hier, 16:45",        agent: "A. Ouédraogo", tpe: "TPE-021", channel: "Agence", status: "validée",    reference: "DEP-B21-0416" },
  { id: "TX-2026-0415", type: "in",  client: "Fatoumata Zongo",      clientInit: "FZ", label: "Dépôt",      amount: 12500, time: "Hier, 14:18",        agent: "K. Djibril",   tpe: "TPE-014", channel: "TPE",    status: "validée",    reference: "DEP-A14-0415" },
  { id: "TX-2026-0414", type: "out", client: "Salimata Ouédraogo",   clientInit: "SO", label: "Retrait",    amount: 8000,  time: "Hier, 11:30",        agent: "A. Ouédraogo", tpe: "TPE-021", channel: "TPE",    status: "validée",    reference: "RET-B21-0414" },
  { id: "TX-2026-0413", type: "in",  client: "Boukary Sawadogo",     clientInit: "BS", label: "Cotisation", amount: 5000,  time: "29 avr., 17:02",     agent: "K. Djibril",   tpe: "TPE-014", channel: "TPE",    status: "validée",    reference: "COT-A14-0413" },
  { id: "TX-2026-0412", type: "in",  client: "Aminata Tiendrébéogo", clientInit: "AT", label: "Dépôt",      amount: 35000, time: "29 avr., 15:34",     agent: "K. Djibril",   tpe: "TPE-014", channel: "TPE",    status: "validée",    reference: "DEP-A14-0412" },
  { id: "TX-2026-0411", type: "out", client: "Drissa Koné",          clientInit: "DK", label: "Retrait",    amount: 20000, time: "29 avr., 12:08",     agent: "A. Ouédraogo", tpe: "TPE-021", channel: "Agence", status: "annulée",    reference: "RET-B21-0411" },
  { id: "TX-2026-0410", type: "in",  client: "Awa Konaté",           clientInit: "AK", label: "Dépôt",      amount: 8000,  time: "28 avr., 09:14",     agent: "K. Djibril",   tpe: "TPE-014", channel: "TPE",    status: "validée",    reference: "DEP-A14-0410" },
  { id: "TX-2026-0409", type: "in",  client: "Mariam Sankara",       clientInit: "MS", label: "Dépôt",      amount: 18000, time: "28 avr., 08:50",     agent: "A. Ouédraogo", tpe: "TPE-021", channel: "TPE",    status: "validée",    reference: "DEP-B21-0409" },
]

const TX_KPIS = [
  { label: "Volume du jour",  value: "82 000", unit: "FCFA", note: "5 transactions",     icon: "wallet",  delta: "+18%", dir: "up" },
  { label: "Dépôts (mois)",   value: "215",    unit: "",     note: "4 320 000 FCFA",     icon: "receipt", delta: "+12",  dir: "up" },
  { label: "Retraits (mois)", value: "103",    unit: "",     note: "1 580 000 FCFA",     icon: "receipt", delta: "+4",   dir: "up" },
  { label: "En attente",      value: "1",      unit: "",     note: "Validation requise", icon: "cloud",   delta: "−2",   dir: "up" },
]

const STATUS_STYLE = {
  "validée":    { cls: "actif",   label: "Validée"    },
  "en attente": { cls: "attente", label: "En attente" },
  "annulée":    { cls: "archive", label: "Annulée"    },
}

function TxDrawer({ tx, onClose }) {
  const st = STATUS_STYLE[tx.status]
  return (
    <>
      <div className="drawer-scrim" onClick={onClose}/>
      <aside className="drawer">
        <div className="drawer-head">
          <div>
            <div style={{ fontSize: 11, color: "var(--ink-3)", fontFamily: "var(--font-mono)" }}>{tx.id}</div>
            <div style={{ fontWeight: 600, fontSize: 18, letterSpacing: "-0.015em", marginTop: 2 }}>{tx.label} — {tx.client}</div>
            <div className="cell-sub" style={{ marginTop: 2 }}>{tx.time} · {tx.agent}</div>
          </div>
          <button className="btn ghost sm" onClick={onClose} style={{ padding: 6 }}>✕</button>
        </div>
        <div className="drawer-body">
          <div style={{
            padding: 18, borderRadius: 12,
            background: tx.type === "in" ? "var(--pos-soft)" : "var(--neg-soft)",
            display: "flex", alignItems: "center", gap: 14,
          }}>
            <span className={"tx-icon " + tx.type} style={{ width: 40, height: 40 }}>
              {tx.type === "in" ? <I.ArrowDown size={20}/> : <I.ArrowUp size={20}/>}
            </span>
            <div>
              <div style={{ fontSize: 11.5, color: "var(--ink-3)", fontWeight: 500 }}>Montant</div>
              <div style={{ fontSize: 28, fontWeight: 600, letterSpacing: "-0.025em", fontVariantNumeric: "tabular-nums",
                            color: tx.type === "in" ? "var(--pos)" : "var(--neg)" }}>
                {tx.type === "in" ? "+" : "−"}{fmt(tx.amount)}<span style={{ fontSize: 13, marginLeft: 6, fontWeight: 500, opacity: 0.8 }}>FCFA</span>
              </div>
            </div>
          </div>

          <div className="drawer-section">
            <div className="card-title" style={{ marginBottom: 10 }}>Détails</div>
            <dl className="info-list">
              <dt>Statut</dt><dd><span className={"tag " + st.cls}>{st.label}</span></dd>
              <dt>Référence</dt><dd style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{tx.reference}</dd>
              <dt>Canal</dt><dd>{tx.channel}</dd>
              <dt>Terminal</dt><dd style={{ fontFamily: "var(--font-mono)", fontSize: 12 }}>{tx.tpe}</dd>
              <dt>Agent</dt><dd>{tx.agent}</dd>
              <dt>Client</dt><dd>{tx.client}</dd>
            </dl>
          </div>

          <div className="drawer-section">
            <div className="card-title" style={{ marginBottom: 10 }}>Chronologie</div>
            <div className="feed" style={{ padding: 0 }}>
              {[
                { t: "Saisie sur TPE",    time: tx.time,   dot: "muted" },
                { t: "Validation locale", time: "+2 s",    dot: "muted" },
                { t: "Sync vers serveur", time: "+1 min",  dot: "info"  },
                { t: tx.status === "validée" ? "Confirmée" : tx.status === "en attente" ? "En attente de validation" : "Annulée par superviseur",
                  time: tx.status === "validée" ? "+1 min 12 s" : "—", dot: tx.status === "validée" ? "brand" : "muted" },
              ].map((s, i) => (
                <div className="feed-item" key={i} style={{ paddingLeft: 0 }}>
                  <div className={"feed-dot " + (s.dot === "muted" ? "muted" : s.dot === "info" ? "info" : "")}/>
                  <div>
                    <div className="feed-text">{s.t}</div>
                    <div className="feed-time">{s.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="drawer-foot">
          <button className="btn"><I.Export size={14}/>Reçu PDF</button>
          {tx.status === "en attente" && <button className="btn brand" style={{ marginLeft: "auto" }}><I.Check size={14} stroke="white"/>Valider</button>}
          {tx.status === "validée" && <button className="btn" style={{ marginLeft: "auto", color: "var(--neg)" }}>Annuler</button>}
        </div>
      </aside>
    </>
  )
}

export default function TransactionsPage() {
  const [q, setQ] = useState("")
  const [seg, setSeg] = useState("tous")
  const [channel, setChannel] = useState("tous")
  const [agent, setAgent] = useState("tous")
  const [period, setPeriod] = useState("7j")
  const [selected, setSelected] = useState(null)
  const [online, setOnline] = useState(true)
  const [page, setPage] = useState(1)

  const agents   = useMemo(() => ["tous", ...Array.from(new Set(TX_FULL.map(t => t.agent)))], [])
  const channels = useMemo(() => ["tous", ...Array.from(new Set(TX_FULL.map(t => t.channel)))], [])

  const filtered = useMemo(() => {
    setPage(1)
    return TX_FULL.filter(t => {
      if (seg === "in"      && t.type !== "in")           return false
      if (seg === "out"     && t.type !== "out")          return false
      if (seg === "pending" && t.status !== "en attente") return false
      if (channel !== "tous" && t.channel !== channel)    return false
      if (agent   !== "tous" && t.agent   !== agent)      return false
      if (q) {
        const blob = (t.client + " " + t.id + " " + t.reference + " " + t.tpe).toLowerCase()
        if (!blob.includes(q.toLowerCase())) return false
      }
      return true
    })
  }, [q, seg, channel, agent])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const totalIn  = filtered.filter(t => t.type === "in"  && t.status === "validée").reduce((s, t) => s + t.amount, 0)
  const totalOut = filtered.filter(t => t.type === "out" && t.status === "validée").reduce((s, t) => s + t.amount, 0)
  const net = totalIn - totalOut

  const counts = {
    tous:    TX_FULL.length,
    in:      TX_FULL.filter(t => t.type === "in").length,
    out:     TX_FULL.filter(t => t.type === "out").length,
    pending: TX_FULL.filter(t => t.status === "en attente").length,
  }

  return (
    <div className="tx-page">
      <PageHeader
        crumbs={["Transactions"]}
        title="Transactions"
        sub={`${TX_FULL.length} mouvements · 2 TPE actifs · synchronisé il y a 1 min`}
      >
        <button className={"status-pill" + (online ? "" : " offline")} onClick={() => setOnline(!online)}>
          <span className="status-dot"></span>{online ? "En ligne · synchronisé" : "Hors ligne · 4 en file"}
        </button>
        <Novu />
      </PageHeader>

      <section className="kpi-row">
        {TX_KPIS.map(k => (
          <div className="kpi" key={k.label}>
            <div className="kpi-label">
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

      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <div className="seg">
          {["24h","7j","30j","Tout"].map(p => (
            <button key={p} className={period === p ? "on" : ""} onClick={() => setPeriod(p)}>{p}</button>
          ))}
        </div>
        <button className="btn"><I.Export size={14}/>Exporter CSV</button>
      </div>

      <div className="card">
        <div className="filter-bar">
          <div className="seg-tabs">
            {[
              { k: "tous",    label: "Tous",       n: counts.tous },
              { k: "in",      label: "Dépôts",     n: counts.in },
              { k: "out",     label: "Retraits",   n: counts.out },
              { k: "pending", label: "En attente", n: counts.pending },
            ].map(t => (
              <button key={t.k} className={"seg-tab " + (seg === t.k ? "on" : "")} onClick={() => setSeg(t.k)}>
                {t.label}<span className="seg-count">{t.n}</span>
              </button>
            ))}
          </div>
          <div className="filter-spacer"/>
          <div className="filter-group">
            <label className="filter-label">Canal</label>
            <select className="filter-select" value={channel} onChange={e => setChannel(e.target.value)}>
              {channels.map(c => <option key={c} value={c}>{c === "tous" ? "Tous" : c}</option>)}
            </select>
          </div>
          <div className="filter-group">
            <label className="filter-label">Agent</label>
            <select className="filter-select" value={agent} onChange={e => setAgent(e.target.value)}>
              {agents.map(a => <option key={a} value={a}>{a === "tous" ? "Tous" : a}</option>)}
            </select>
          </div>
        </div>

        <div className="bulk-bar" style={{ background: "var(--surface-2)" }}>
          <span style={{ color: "var(--ink-3)" }}>Total filtré</span>
          <span style={{ color: "var(--pos)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>+{fmt(totalIn)} FCFA</span>
          <span style={{ color: "var(--neg)", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>−{fmt(totalOut)} FCFA</span>
          <span style={{ color: "var(--ink-3)" }}>·</span>
          <span style={{ fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>Net {net >= 0 ? "+" : "−"}{fmt(Math.abs(net))} FCFA</span>
          <div style={{ flex: 1 }}/>
          <span style={{ color: "var(--ink-3)" }}>{filtered.length} mouvement{filtered.length > 1 ? "s" : ""}</span>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Client</th>
                <th>Type</th>
                <th>Date / heure</th>
                <th>Canal · TPE</th>
                <th>Agent</th>
                <th style={{ textAlign: "right" }}>Montant</th>
                <th>Statut</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {paginated.map(t => {
                const st = STATUS_STYLE[t.status]
                return (
                  <tr key={t.id} onClick={() => setSelected(t)} className={selected && selected.id === t.id ? "selected" : ""}>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--ink-2)" }}>{t.id}</td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div className="avatar sm">{t.clientInit}</div>
                        <div>
                          <div style={{ fontWeight: 550 }}>{t.client}</div>
                          <div className="cell-sub" style={{ fontFamily: "var(--font-mono)", fontSize: 10.5 }}>{t.reference}</div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 7 }}>
                        <span className={"tx-icon " + t.type} style={{ width: 22, height: 22 }}>
                          {t.type === "in" ? <I.ArrowDown size={11}/> : <I.ArrowUp size={11}/>}
                        </span>
                        {t.label}
                      </span>
                    </td>
                    <td className="cell-sub">{t.time}</td>
                    <td>
                      <div>{t.channel}</div>
                      <div className="cell-sub" style={{ fontFamily: "var(--font-mono)", fontSize: 10.5 }}>{t.tpe}</div>
                    </td>
                    <td className="cell-sub">{t.agent}</td>
                    <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 600,
                                 color: t.type === "in" ? "var(--pos)" : "var(--neg)" }}>
                      {t.type === "in" ? "+" : "−"}{fmt(t.amount)}
                      <span className="cell-sub" style={{ marginLeft: 4, fontWeight: 400 }}>FCFA</span>
                    </td>
                    <td><span className={"tag " + st.cls}>{st.label}</span></td>
                    <td><button className="btn ghost sm" style={{ padding: 4 }} onClick={e => { e.stopPropagation(); setSelected(t) }}><I.Arrow size={12}/></button></td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>
              Aucun mouvement ne correspond aux filtres.
            </div>
          )}
          <div className="table-foot">
            <span>
              {Math.min((page - 1) * PAGE_SIZE + 1, filtered.length)}–{Math.min(page * PAGE_SIZE, filtered.length)} sur {filtered.length} mouvements
            </span>
            {totalPages > 1 && (
              <div className="pager">
                <button className="btn ghost sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>‹ Précédent</button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <span key={p} className={"page-num " + (p === page ? "on" : "")} onClick={() => setPage(p)} style={{ cursor: "pointer" }}>{p}</span>
                ))}
                <button className="btn ghost sm" disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Suivant ›</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {selected && <TxDrawer tx={selected} onClose={() => setSelected(null)}/>}
    </div>
  )
}
