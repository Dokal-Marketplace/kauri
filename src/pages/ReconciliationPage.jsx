import { useState, useMemo } from 'react'
import { I } from '../icons'
import { fmt, PageHeader } from '../components'

// ─── Constants ────────────────────────────────────────────────────────────────

const DENOMS = [
  { v: 10000, kind: "billet", color: "oklch(0.78 0.10 30)" },
  { v: 5000,  kind: "billet", color: "oklch(0.78 0.10 145)" },
  { v: 2000,  kind: "billet", color: "oklch(0.78 0.10 240)" },
  { v: 1000,  kind: "billet", color: "oklch(0.78 0.08 60)"  },
  { v: 500,   kind: "billet", color: "oklch(0.82 0.06 290)" },
  { v: 500,   kind: "pièce",  color: "oklch(0.82 0.02 80)"  },
  { v: 250,   kind: "pièce",  color: "oklch(0.82 0.02 80)"  },
  { v: 200,   kind: "pièce",  color: "oklch(0.82 0.02 80)"  },
  { v: 100,   kind: "pièce",  color: "oklch(0.82 0.02 80)"  },
  { v: 50,    kind: "pièce",  color: "oklch(0.82 0.02 80)"  },
  { v: 25,    kind: "pièce",  color: "oklch(0.82 0.02 80)"  },
  { v: 10,    kind: "pièce",  color: "oklch(0.82 0.02 80)"  },
  { v: 5,     kind: "pièce",  color: "oklch(0.82 0.02 80)"  },
]

const INITIAL_COUNT_OPEN = {
  "billet-10000": 18, "billet-5000": 16, "billet-2000": 8, "billet-1000": 5,
  "billet-500": 4, "pièce-500": 3, "pièce-250": 4, "pièce-200": 5, "pièce-100": 5,
  "pièce-50": 0, "pièce-25": 0, "pièce-10": 0, "pièce-5": 0,
}

const STATUS_META = {
  "en cours":     { label: "En cours",     cls: "rec-status open"     },
  "écart":        { label: "Écart",        cls: "rec-status variance" },
  "écart résolu": { label: "Écart résolu", cls: "rec-status resolved" },
  "signée":       { label: "Signée",       cls: "rec-status signed"   },
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const RECON_RECORDS = [
  {
    id: "REC-2026-0142", date: "5 mai 2026", dateShort: "05/05",
    agent: "K. Djibril", agentInit: "KD", drawer: "Caisse A · TPE-014",
    opened: "07:55", closed: null,
    status: "en cours",
    txCount: 18,
    expected: { cash: 285000, om: 84000, moov: 32000, bank: 0 },
    counted:  { cash: 283500, om: 84000, moov: 32000, bank: 0 },
    notes: "Comptage en cours — pause déjeuner",
  },
  {
    id: "REC-2026-0141", date: "4 mai 2026", dateShort: "04/05",
    agent: "A. Ouédraogo", agentInit: "AO", drawer: "Caisse B · TPE-021",
    opened: "08:02", closed: "18:15",
    status: "écart",
    txCount: 24,
    expected: { cash: 412000, om: 156000, moov: 48000, bank: 50000 },
    counted:  { cash: 405500, om: 156000, moov: 48000, bank: 50000 },
    notes: "Écart de 6 500 FCFA — billet 5000 manquant + 1500 monnaie",
    flagged: ["TX-2026-0411"],
  },
  {
    id: "REC-2026-0140", date: "4 mai 2026", dateShort: "04/05",
    agent: "K. Djibril", agentInit: "KD", drawer: "Caisse A · TPE-014",
    opened: "08:00", closed: "18:08",
    status: "signée",
    txCount: 31,
    expected: { cash: 528000, om: 124000, moov: 28000, bank: 100000 },
    counted:  { cash: 528000, om: 124000, moov: 28000, bank: 100000 },
    notes: "Équilibrée. Signée par M. Sankara (superviseur).",
    signedBy: "M. Sankara", signedAt: "18:14",
  },
  {
    id: "REC-2026-0139", date: "3 mai 2026", dateShort: "03/05",
    agent: "K. Djibril", agentInit: "KD", drawer: "Caisse A · TPE-014",
    opened: "07:58", closed: "18:02",
    status: "signée",
    txCount: 22,
    expected: { cash: 318000, om: 92000, moov: 18000, bank: 0 },
    counted:  { cash: 318000, om: 92000, moov: 18000, bank: 0 },
    notes: "Équilibrée.",
    signedBy: "M. Sankara", signedAt: "18:10",
  },
  {
    id: "REC-2026-0138", date: "3 mai 2026", dateShort: "03/05",
    agent: "A. Ouédraogo", agentInit: "AO", drawer: "Caisse B · TPE-021",
    opened: "08:05", closed: "18:20",
    status: "écart résolu",
    txCount: 19,
    expected: { cash: 245000, om: 78000, moov: 22000, bank: 0 },
    counted:  { cash: 247000, om: 78000, moov: 22000, bank: 0 },
    notes: "Surplus 2 000 FCFA — dépôt non saisi (TX rétabli).",
    signedBy: "M. Sankara", signedAt: "18:35",
  },
  {
    id: "REC-2026-0137", date: "2 mai 2026", dateShort: "02/05",
    agent: "K. Djibril", agentInit: "KD", drawer: "Caisse A · TPE-014",
    opened: "08:00", closed: "18:00",
    status: "signée",
    txCount: 27,
    expected: { cash: 392000, om: 105000, moov: 24000, bank: 50000 },
    counted:  { cash: 392000, om: 105000, moov: 24000, bank: 50000 },
    notes: "Équilibrée.",
    signedBy: "M. Sankara", signedAt: "18:08",
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function sumLedger(l) { return (l.cash || 0) + (l.om || 0) + (l.moov || 0) + (l.bank || 0) }

function varianceOf(r) {
  return {
    cash:  r.counted.cash  - r.expected.cash,
    om:    r.counted.om    - r.expected.om,
    moov:  r.counted.moov  - r.expected.moov,
    bank:  r.counted.bank  - r.expected.bank,
    total: sumLedger(r.counted) - sumLedger(r.expected),
  }
}

function reverseEngineer(total) {
  const out = {}
  let r = total
  const order = [10000, 5000, 2000, 1000, 500, 250, 200, 100, 50, 25, 10, 5]
  for (const v of order) {
    const kind = v >= 1000 ? "billet" : (v === 500 ? "billet" : "pièce")
    const key = `${kind}-${v}`
    const n = Math.floor(r / v)
    if (n > 0) { out[key] = (out[key] || 0) + n; r -= n * v }
  }
  return out
}

// ─── Page entry ───────────────────────────────────────────────────────────────

export default function ReconciliationPage() {
  const [selectedId, setSelectedId] = useState(null)
  const selected = RECON_RECORDS.find(r => r.id === selectedId)

  if (selected) {
    return <ReconciliationDetail record={selected} onBack={() => setSelectedId(null)} />
  }
  return <ReconciliationIndex onOpen={setSelectedId} />
}

// ─── Index list ───────────────────────────────────────────────────────────────

function ReconciliationIndex({ onOpen }) {
  const [seg, setSeg]       = useState("tous")
  const [agent, setAgent]   = useState("tous")
  const [period, setPeriod] = useState("7j")
  const [q, setQ]           = useState("")

  const agents = useMemo(() => ["tous", ...Array.from(new Set(RECON_RECORDS.map(r => r.agent)))], [])

  const filtered = useMemo(() => RECON_RECORDS.filter(r => {
    if (seg === "ouverts" && r.status !== "en cours") return false
    if (seg === "ecarts"  && !(r.status === "écart" || r.status === "écart résolu")) return false
    if (seg === "signes"  && r.status !== "signée") return false
    if (agent !== "tous"  && r.agent !== agent) return false
    if (q) {
      const blob = (r.id + " " + r.agent + " " + r.drawer + " " + r.notes).toLowerCase()
      if (!blob.includes(q.toLowerCase())) return false
    }
    return true
  }), [seg, agent, q])

  const counts = {
    tous:    RECON_RECORDS.length,
    ouverts: RECON_RECORDS.filter(r => r.status === "en cours").length,
    ecarts:  RECON_RECORDS.filter(r => r.status === "écart" || r.status === "écart résolu").length,
    signes:  RECON_RECORDS.filter(r => r.status === "signée").length,
  }

  const totalVarianceAbs = RECON_RECORDS.reduce((s, r) => s + Math.abs(varianceOf(r).total), 0)
  const openCount        = counts.ouverts
  const varianceCount    = RECON_RECORDS.filter(r => r.status === "écart").length
  const signedThisWeek   = RECON_RECORDS.filter(r => r.status === "signée").length

  const kpis = [
    { label: "Sessions ouvertes",  value: String(openCount),          note: openCount === 1 ? "1 caissier en service" : `${openCount} caissiers en service`, icon: "wallet", delta: "0",    dir: "up"   },
    { label: "Écarts non résolus", value: String(varianceCount),      note: "Action requise",       icon: "alert",  delta: "+1",   dir: "down" },
    { label: "Écart cumulé (7 j)", value: fmt(totalVarianceAbs), unit: "FCFA", note: "Tous postes confondus", icon: "coin",   delta: "−24%", dir: "up"   },
    { label: "Signées (7 j)",      value: String(signedThisWeek),     note: "Sur 6 sessions",       icon: "check",  delta: "+3",   dir: "up"   },
  ]

  return (
    <div className="recon-page">
      <PageHeader crumbs={["Réconciliation"]} title="Réconciliation de caisse">
        <button className="btn"><I.Export size={14}/>Exporter</button>
        <button className="btn brand"><I.Plus size={14} stroke="white"/>Nouvelle session</button>
      </PageHeader>

      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18 }}>
        <div className="h1-sub" style={{ flex: 1 }}>Mardi 5 mai 2026 · Agence Bobo-Dioulasso · 1 session ouverte</div>
        <div className="search" style={{ width: 240 }}>
          <I.Search /><input placeholder="ID, agent, caisse…" value={q} onChange={e => setQ(e.target.value)} />
        </div>
        <div className="seg">
          {["24h","7j","30j","Tout"].map(p => (
            <button key={p} className={period === p ? "on" : ""} onClick={() => setPeriod(p)}>{p}</button>
          ))}
        </div>
      </div>

      <section className="kpi-row">
        {kpis.map(k => (
          <div className="kpi" key={k.label}>
            <div className="kpi-label">
              {k.icon === "wallet" && <I.Wallet/>}
              {k.icon === "coin"   && <I.Coin/>}
              {k.icon === "check"  && <I.Check/>}
              {k.icon === "alert"  && <I.Bell/>}
              {k.label}
            </div>
            <div className="kpi-value">{k.value}{k.unit && <span className="unit"> {k.unit}</span>}</div>
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

      {openCount > 0 && (
        <div className="recon-banner">
          <div className="recon-banner-icon"><I.Wallet size={18}/></div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Session du jour ouverte — Caisse A</div>
            <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 2 }}>
              K. Djibril · TPE-014 · ouverte à 07:55 · 18 mouvements ·
              <span style={{ color: "var(--neg)", fontWeight: 550, marginLeft: 6 }}>écart provisoire −1 500 FCFA</span>
            </div>
          </div>
          <button className="btn" onClick={() => onOpen("REC-2026-0142")}>Reprendre le comptage <I.Arrow size={12}/></button>
        </div>
      )}

      <div className="card">
        <div className="filter-bar">
          <div className="seg-tabs">
            {[
              { k: "tous",    label: "Toutes",   n: counts.tous    },
              { k: "ouverts", label: "En cours", n: counts.ouverts },
              { k: "ecarts",  label: "Écarts",   n: counts.ecarts  },
              { k: "signes",  label: "Signées",  n: counts.signes  },
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
              {agents.map(a => <option key={a} value={a}>{a === "tous" ? "Tous" : a}</option>)}
            </select>
          </div>
        </div>

        <div className="table-wrap">
          <table className="data-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Date</th>
                <th>Agent · Caisse</th>
                <th>Mvt</th>
                <th style={{ textAlign: "right" }}>Théorique</th>
                <th style={{ textAlign: "right" }}>Compté</th>
                <th style={{ textAlign: "right" }}>Écart</th>
                <th>Statut</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const v    = varianceOf(r)
                const meta = STATUS_META[r.status]
                const expectedTotal = sumLedger(r.expected)
                const countedTotal  = sumLedger(r.counted)
                return (
                  <tr key={r.id} onClick={() => onOpen(r.id)}>
                    <td style={{ fontFamily: "var(--font-mono)", fontSize: 11.5, color: "var(--ink-2)" }}>{r.id}</td>
                    <td>
                      <div>{r.date}</div>
                      <div className="cell-sub">{r.opened}{r.closed ? ` → ${r.closed}` : " · ouverte"}</div>
                    </td>
                    <td>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <div className="avatar sm">{r.agentInit}</div>
                        <div>
                          <div style={{ fontWeight: 550 }}>{r.agent}</div>
                          <div className="cell-sub">{r.drawer}</div>
                        </div>
                      </div>
                    </td>
                    <td className="cell-sub" style={{ fontVariantNumeric: "tabular-nums" }}>{r.txCount}</td>
                    <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                      {fmt(expectedTotal)}<span className="cell-sub" style={{ marginLeft: 4 }}>FCFA</span>
                    </td>
                    <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                      {fmt(countedTotal)}<span className="cell-sub" style={{ marginLeft: 4 }}>FCFA</span>
                    </td>
                    <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 600,
                                 color: v.total === 0 ? "var(--ink-3)" : v.total > 0 ? "var(--pos)" : "var(--neg)" }}>
                      {v.total === 0 ? "—" : (v.total > 0 ? "+" : "−") + fmt(Math.abs(v.total))}
                    </td>
                    <td><span className={meta.cls}><span className="rec-status-dot"/>{meta.label}</span></td>
                    <td>
                      <button className="btn ghost sm" style={{ padding: 4 }}
                        onClick={e => { e.stopPropagation(); onOpen(r.id) }}>
                        <I.Arrow size={12}/>
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div style={{ padding: 40, textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>
              Aucune réconciliation ne correspond aux filtres.
            </div>
          )}
          <div className="table-foot">
            <span>{filtered.length} sur {RECON_RECORDS.length} sessions</span>
            <div className="pager">
              <button className="btn ghost sm" disabled>‹ Précédent</button>
              <span className="page-num on">1</span>
              <button className="btn ghost sm">Suivant ›</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Detail wizard ────────────────────────────────────────────────────────────

function ReconciliationDetail({ record, onBack }) {
  const initialCounts = record.status === "en cours"
    ? INITIAL_COUNT_OPEN
    : reverseEngineer(record.counted.cash)

  const [counts, setCounts] = useState(initialCounts)
  const [om,    setOM]      = useState(record.counted.om)
  const [moov,  setMoov]    = useState(record.counted.moov)
  const [bank,  setBank]    = useState(record.counted.bank)
  const [notes, setNotes]   = useState(record.notes || "")

  const cashCounted = useMemo(() =>
    DENOMS.reduce((s, d) => s + d.v * (counts[`${d.kind}-${d.v}`] || 0), 0),
    [counts]
  )

  const variance = {
    cash: cashCounted - record.expected.cash,
    om:   om          - record.expected.om,
    moov: moov        - record.expected.moov,
    bank: bank        - record.expected.bank,
  }
  variance.total = variance.cash + variance.om + variance.moov + variance.bank

  const meta      = STATUS_META[record.status]
  const isClosed  = record.status === "signée" || record.status === "écart résolu"
  const totalCounted  = cashCounted + om + moov + bank
  const totalExpected = sumLedger(record.expected)

  const setDenom = (key, n) => {
    const next = Math.max(0, parseInt(n, 10) || 0)
    setCounts(prev => ({ ...prev, [key]: next }))
  }

  const stepStatus = (step) => {
    if (isClosed) return step <= 4 ? "done" : "todo"
    if (record.status === "écart") return step <= 2 ? "done" : step === 3 ? "active" : "todo"
    return step === 1 ? "done" : step === 2 ? "active" : "todo"
  }

  return (
    <div className="recon-page">
      <PageHeader crumbs={["Réconciliation", record.id]} title={null}>
        <button className="btn ghost sm" onClick={onBack}>← Toutes les sessions</button>
        <button className="btn"><I.Export size={14}/>Exporter PDF</button>
        <button className="btn"><I.Receipt size={14}/>Voir transactions</button>
      </PageHeader>

      <div style={{ marginBottom: 14 }}>
        <h1 className="h1" style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 2 }}>
          Session {record.dateShort} · {record.drawer.split(" · ")[0]}
          <span className={meta.cls} style={{ fontSize: 12 }}><span className="rec-status-dot"/>{meta.label}</span>
        </h1>
        <div className="h1-sub">
          {record.agent} · {record.drawer} · ouverte à {record.opened}
          {record.closed ? ` · clôturée à ${record.closed}` : " · session ouverte"}
          {" · "}{record.txCount} mouvements
        </div>
      </div>

      <div className="recon-meta">
        <div>
          <div className="recon-meta-l">Théorique (système)</div>
          <div className="recon-meta-v" style={{ fontVariantNumeric: "tabular-nums" }}>
            {fmt(totalExpected)} <span style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 500 }}>FCFA</span>
          </div>
        </div>
        <div>
          <div className="recon-meta-l">Compté (physique)</div>
          <div className="recon-meta-v" style={{ fontVariantNumeric: "tabular-nums" }}>
            {fmt(totalCounted)} <span style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 500 }}>FCFA</span>
          </div>
        </div>
        <div>
          <div className="recon-meta-l">Écart</div>
          <div className={"recon-meta-v " + (variance.total === 0 ? "variance-zero" : variance.total > 0 ? "variance-pos" : "variance-neg")}
               style={{ fontVariantNumeric: "tabular-nums" }}>
            {variance.total === 0 ? "—" : (variance.total > 0 ? "+" : "−") + fmt(Math.abs(variance.total))}
            {variance.total !== 0 && <span style={{ fontSize: 11, color: "currentColor", fontWeight: 500, opacity: 0.7 }}> FCFA</span>}
          </div>
        </div>
        <div>
          <div className="recon-meta-l">{record.signedBy ? "Signée par" : "Superviseur"}</div>
          <div className="recon-meta-v">
            {record.signedBy
              ? <>{record.signedBy} <span style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 500 }}>· {record.signedAt}</span></>
              : <span style={{ color: "var(--ink-3)", fontWeight: 500 }}>En attente</span>}
          </div>
        </div>
      </div>

      <div className="recon-detail">
        {/* LEFT — cash counter + other channels */}
        <div>
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="card-head">
              <div>
                <div className="card-title">Comptage des espèces</div>
                <div className="card-sub">Saisir le nombre d'unités par coupure</div>
              </div>
              <div style={{ marginLeft: "auto", textAlign: "right" }}>
                <div style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>Sous-total</div>
                <div style={{ fontSize: 18, fontWeight: 600, fontVariantNumeric: "tabular-nums", letterSpacing: "-0.015em" }}>
                  {fmt(cashCounted)} <span style={{ fontSize: 11, color: "var(--ink-3)", fontWeight: 500 }}>FCFA</span>
                </div>
              </div>
            </div>
            <table className="denom-table">
              <thead>
                <tr>
                  <th>Coupure</th>
                  <th style={{ width: 100 }}>Type</th>
                  <th style={{ width: 130, textAlign: "center" }}>Nombre</th>
                  <th style={{ textAlign: "right", paddingRight: 16 }}>Sous-total</th>
                </tr>
              </thead>
              <tbody>
                {DENOMS.map(d => {
                  const key = `${d.kind}-${d.v}`
                  const n   = counts[key] || 0
                  const sub = d.v * n
                  return (
                    <tr key={key}>
                      <td>
                        <span className="denom-chip">
                          <span className="denom-swatch" style={{ background: d.color }}/>
                          {fmt(d.v)}
                        </span>
                      </td>
                      <td><span className="denom-kind">{d.kind}</span></td>
                      <td>
                        <div style={{ display: "flex", justifyContent: "center" }}>
                          <div className="denom-step">
                            <button onClick={() => setDenom(key, n - 1)} disabled={isClosed}>−</button>
                            <input type="text" value={n} onChange={e => setDenom(key, e.target.value)} disabled={isClosed}/>
                            <button onClick={() => setDenom(key, n + 1)} disabled={isClosed}>+</button>
                          </div>
                        </div>
                      </td>
                      <td style={{ textAlign: "right", paddingRight: 16 }}>
                        <span className="denom-sub" style={{ color: sub > 0 ? "var(--ink)" : "var(--ink-4)" }}>
                          {sub > 0 ? fmt(sub) : "—"}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="card">
            <div className="card-head">
              <div>
                <div className="card-title">Autres postes</div>
                <div className="card-sub">Mobile money et banque</div>
              </div>
            </div>
            <div>
              <LedgerLine color="oklch(0.66 0.16 30)"  glyph="OM" name="Orange Money"     sub="Solde portefeuille agent"
                expected={record.expected.om}   value={om}   onChange={setOM}   disabled={isClosed} />
              <LedgerLine color="oklch(0.62 0.14 240)" glyph="MV" name="Moov Money"       sub="Solde portefeuille agent"
                expected={record.expected.moov} value={moov} onChange={setMoov} disabled={isClosed} />
              <LedgerLine color="oklch(0.5 0.1 155)"   glyph={<I.Wallet size={14} stroke="white"/>} name="Versement banque" sub="Bordereau Coris Bank · J−1"
                expected={record.expected.bank} value={bank} onChange={setBank} disabled={isClosed} />
            </div>
          </div>
        </div>

        {/* RIGHT — variance + steps + notes */}
        <div>
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="variance-hero">
              <div style={{ fontSize: 11, color: "var(--ink-3)", textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600 }}>Écart total</div>
              <div className={"variance-big " + (variance.total === 0 ? "variance-zero" : variance.total > 0 ? "variance-pos" : "variance-neg")}>
                {variance.total === 0 ? "Équilibrée" : (variance.total > 0 ? "+" : "−") + fmt(Math.abs(variance.total)) + " FCFA"}
              </div>
              <div style={{ fontSize: 12.5, color: "var(--ink-3)", marginTop: 4 }}>
                {variance.total === 0
                  ? "Aucun écart détecté entre théorique et physique."
                  : variance.total > 0
                    ? "Surplus en caisse — à investiguer (dépôt non saisi ?)."
                    : "Manque en caisse — à investiguer (retrait non saisi, billet manquant ?)."}
              </div>
            </div>
            <div className="variance-rows">
              <VarianceRow label="Espèces"      expected={record.expected.cash} counted={cashCounted} />
              <VarianceRow label="Orange Money" expected={record.expected.om}   counted={om}          />
              <VarianceRow label="Moov Money"   expected={record.expected.moov} counted={moov}        />
              <VarianceRow label="Banque"        expected={record.expected.bank} counted={bank}        />
            </div>
          </div>

          {record.flagged && record.flagged.length > 0 && (
            <div className="recon-side-card">
              <div className="card-head">
                <div>
                  <div className="card-title">Transactions à vérifier</div>
                  <div className="card-sub">{record.flagged.length} mouvement(s) signalé(s) par l'algorithme</div>
                </div>
                <span className="rec-status variance" style={{ marginLeft: "auto" }}>
                  <span className="rec-status-dot"/>Action requise
                </span>
              </div>
              {record.flagged.map(id => (
                <div className="recon-flag" key={id}>
                  <div className="recon-flag-icon"><I.Bell size={14}/></div>
                  <div className="recon-flag-body">
                    <div className="recon-flag-label">Retrait Drissa Koné — 20 000 FCFA</div>
                    <div className="recon-flag-meta">
                      <span className="recon-flag-id">{id}</span> · 29 avr. 12:08 · A. Ouédraogo · TPE-021
                    </div>
                    <div style={{ fontSize: 12, color: "var(--ink-2)", marginTop: 6 }}>
                      Saisie 2 min avant la fermeture, statut <em>annulée</em>. Possible cause de l'écart.
                    </div>
                  </div>
                  <button className="btn ghost sm">Voir</button>
                </div>
              ))}
            </div>
          )}

          <div className="recon-side-card">
            <div className="card-head">
              <div>
                <div className="card-title">Procédure de clôture</div>
                <div className="card-sub">4 étapes</div>
              </div>
            </div>
            {[
              { n: 1, label: "Ouverture de session",    meta: `${record.agent} · ${record.opened}` },
              { n: 2, label: "Comptage physique",        meta: stepStatus(2) === "done" ? `Soumis à ${record.closed || "en cours"}` : "Espèces, mobile money, banque" },
              { n: 3, label: "Validation de l'écart",   meta: variance.total === 0 ? "Aucun écart à justifier" : `Justifier ${fmt(Math.abs(variance.total))} FCFA` },
              { n: 4, label: "Signature superviseur",   meta: record.signedBy ? `${record.signedBy} · ${record.signedAt}` : "M. Sankara — en attente" },
            ].map(s => (
              <div key={s.n} className={"recon-step " + stepStatus(s.n)}>
                <div className="recon-step-num">{stepStatus(s.n) === "done" ? "✓" : s.n}</div>
                <div>
                  <div className="recon-step-label">{s.label}</div>
                  <div className="recon-step-meta">{s.meta}</div>
                </div>
              </div>
            ))}
          </div>

          <div className="recon-side-card">
            <div className="card-head">
              <div>
                <div className="card-title">Note de session</div>
                <div className="card-sub">Justification & commentaires</div>
              </div>
            </div>
            <div style={{ padding: "0 14px 14px" }}>
              <textarea className="recon-notes" value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Décrire l'écart, joindre une pièce, etc." disabled={isClosed}/>
            </div>
            <div className="recon-foot">
              {isClosed ? (
                <>
                  <span style={{ fontSize: 12, color: "var(--ink-3)" }}>Session {meta.label.toLowerCase()} — verrouillée</span>
                  <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                    <button className="btn"><I.Export size={14}/>Télécharger PV</button>
                  </div>
                </>
              ) : record.status === "écart" ? (
                <>
                  <button className="btn">Sauvegarder brouillon</button>
                  <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                    <button className="btn">Marquer écart résolu</button>
                    <button className="btn brand"><I.Check size={14} stroke="white"/>Soumettre au superviseur</button>
                  </div>
                </>
              ) : (
                <>
                  <button className="btn">Sauvegarder brouillon</button>
                  <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
                    <button className="btn">Pause</button>
                    <button className="btn brand">
                      <I.Check size={14} stroke="white"/>
                      {variance.total === 0 ? "Clôturer la session" : "Soumettre l'écart"}
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function LedgerLine({ color, glyph, name, sub, expected, value, onChange, disabled }) {
  const delta = value - expected
  return (
    <div className="ledger-line">
      <div className="ledger-icon" style={{ background: color }}>
        {typeof glyph === "string"
          ? <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: "0.02em" }}>{glyph}</span>
          : glyph}
      </div>
      <div>
        <div className="ledger-name">{name}</div>
        <div className="ledger-sub">{sub}</div>
      </div>
      <div className="ledger-expected">
        <div style={{ fontSize: 10.5, textTransform: "uppercase", letterSpacing: "0.04em", fontWeight: 600, color: "var(--ink-4)" }}>Théorique</div>
        <div style={{ marginTop: 2 }}>{fmt(expected)}</div>
      </div>
      <input className="ledger-input" type="text" value={fmt(value)}
        onChange={e => { const n = parseInt(e.target.value.replace(/\D/g, ""), 10) || 0; onChange(n) }}
        disabled={disabled}/>
      <div className={"ledger-delta " + (delta === 0 ? "" : delta > 0 ? "variance-pos" : "variance-neg")}>
        {delta === 0
          ? <span style={{ color: "var(--ink-4)" }}>—</span>
          : (delta > 0 ? "+" : "−") + fmt(Math.abs(delta))}
      </div>
    </div>
  )
}

function VarianceRow({ label, expected, counted }) {
  const delta = counted - expected
  return (
    <div className="variance-row">
      <span className="v-label">{label}</span>
      <span className="v-num muted">{fmt(expected)}</span>
      <span className="v-num">{fmt(counted)}</span>
      <span className={"v-delta " + (delta === 0 ? "" : delta > 0 ? "variance-pos" : "variance-neg")}>
        {delta === 0
          ? <span style={{ color: "var(--ink-4)" }}>—</span>
          : (delta > 0 ? "+" : "−") + fmt(Math.abs(delta))}
      </span>
    </div>
  )
}
