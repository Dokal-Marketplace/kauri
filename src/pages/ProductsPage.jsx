import { useState, useMemo } from 'react'
import { I } from '../icons'
import { fmt, KPI, PageHeader, SearchInput } from '../components'

const PRODUCT_FAMILIES = [
  { k: "epargne",   label: "Épargne",        color: "var(--brand)",         icon: "Wallet" },
  { k: "credit",    label: "Crédit",         color: "oklch(0.55 0.13 280)", icon: "Coin"   },
  { k: "tontine",   label: "Tontine",        color: "oklch(0.6 0.13 130)",  icon: "Users"  },
  { k: "assurance", label: "Microassurance", color: "oklch(0.6 0.11 230)",  icon: "Shield" },
]

const PRODUCTS_SEED = [
  { id: "PRD-CARNET", code: "CARNET", name: "Carnet d'épargne", family: "epargne",
    summary: "Compte d'épargne classique avec dépôts libres et retraits sur préavis 48 h.",
    status: "actif", rate: 3.5, durationMin: 0, durationMax: 0,
    minDeposit: 1000, maxBalance: 5000000, fees: 0, feesUnit: "FCFA", grace: 0,
    kycLevel: "Standard", targets: ["Particuliers", "Coopératives"],
    branches: ["Bobo-Dioulasso", "Banfora", "Hounde"],
    clients: 84, encours: 2840000, opened30: 12,
    created: "2023-04-12", updated: "2026-02-08" },
  { id: "PRD-PLAN", code: "PLAN+", name: "Plan+ projet", family: "epargne",
    summary: "Épargne bloquée sur objectif. Bonus de 1,2% à l'échéance si l'objectif est atteint.",
    status: "actif", rate: 5.0, durationMin: 6, durationMax: 36,
    minDeposit: 5000, maxBalance: 10000000, fees: 500, feesUnit: "FCFA", grace: 0,
    kycLevel: "Standard", targets: ["Particuliers"],
    branches: ["Bobo-Dioulasso", "Banfora", "Hounde"],
    clients: 41, encours: 1620000, opened30: 7,
    created: "2024-01-20", updated: "2026-04-22" },
  { id: "PRD-TONTINE", code: "TONTINE", name: "Tontine hebdomadaire", family: "tontine",
    summary: "Cotisations hebdomadaires en groupe de 8 à 20 membres, redistribution par tirage.",
    status: "actif", rate: 0, durationMin: 2, durationMax: 12,
    minDeposit: 500, maxBalance: 0, fees: 250, feesUnit: "FCFA", grace: 0,
    kycLevel: "Allégée", targets: ["Particuliers", "Groupes"],
    branches: ["Bobo-Dioulasso", "Banfora"],
    clients: 56, encours: 480000, opened30: 4,
    created: "2023-06-04", updated: "2025-11-19" },
  { id: "PRD-CRED-COM", code: "CRED-COM", name: "Crédit commerçant", family: "credit",
    summary: "Prêt court-terme pour fonds de roulement, remboursement hebdomadaire.",
    status: "actif", rate: 18, durationMin: 3, durationMax: 12,
    minDeposit: 25000, maxBalance: 1500000, fees: 2, feesUnit: "%", grace: 7,
    kycLevel: "Renforcée", targets: ["TPE", "Commerçants"],
    branches: ["Bobo-Dioulasso", "Banfora"],
    clients: 28, encours: 6420000, opened30: 3,
    created: "2024-09-02", updated: "2026-03-30" },
  { id: "PRD-CRED-AGRI", code: "CRED-AGRI", name: "Crédit campagne agricole", family: "credit",
    summary: "Financement saisonnier intrants + différé de remboursement à la récolte.",
    status: "actif", rate: 14, durationMin: 6, durationMax: 9,
    minDeposit: 50000, maxBalance: 800000, fees: 1.5, feesUnit: "%", grace: 90,
    kycLevel: "Renforcée", targets: ["Agriculteurs", "Coopératives"],
    branches: ["Banfora", "Hounde"],
    clients: 14, encours: 2120000, opened30: 1,
    created: "2024-10-15", updated: "2026-01-12" },
  { id: "PRD-MICRO-S", code: "MICRO-S", name: "Microassurance santé", family: "assurance",
    summary: "Forfait soins primaires familiaux, partenariat AssurFasso.",
    status: "brouillon", rate: 0, durationMin: 12, durationMax: 12,
    minDeposit: 1500, maxBalance: 0, fees: 0, feesUnit: "FCFA", grace: 0,
    kycLevel: "Standard", targets: ["Particuliers", "Familles"],
    branches: ["Bobo-Dioulasso"],
    clients: 0, encours: 0, opened30: 0,
    created: "2026-04-12", updated: "2026-05-02" },
  { id: "PRD-EDUC", code: "EDUC", name: "Épargne scolarité", family: "epargne",
    summary: "Plan d'épargne dédié aux frais de scolarité, déblocage en août/septembre.",
    status: "archive", rate: 4.2, durationMin: 12, durationMax: 24,
    minDeposit: 2000, maxBalance: 3000000, fees: 0, feesUnit: "FCFA", grace: 0,
    kycLevel: "Standard", targets: ["Particuliers", "Parents"],
    branches: ["Bobo-Dioulasso"],
    clients: 9, encours: 320000, opened30: 0,
    created: "2022-08-10", updated: "2025-09-01" },
]

const ALL_BRANCHES = ["Bobo-Dioulasso", "Banfora", "Hounde"]
const ALL_TARGETS = ["Particuliers", "TPE", "Commerçants", "Agriculteurs", "Coopératives", "Familles", "Groupes", "Parents"]
const KYC_LEVELS = ["Allégée", "Standard", "Renforcée"]

const STATUS_META = {
  actif:     { label: "Actif",     class: "actif"   },
  brouillon: { label: "Brouillon", class: "attente" },
  archive:   { label: "Archivé",   class: "archive" },
}

function familyMeta(k) { return PRODUCT_FAMILIES.find(f => f.k === k) || PRODUCT_FAMILIES[0] }

function blankProduct() {
  return {
    id: null, code: "", name: "", family: "epargne", summary: "",
    status: "brouillon",
    rate: 0, durationMin: 0, durationMax: 0,
    minDeposit: 1000, maxBalance: 0,
    fees: 0, feesUnit: "FCFA", grace: 0,
    kycLevel: "Standard",
    targets: ["Particuliers"],
    branches: ["Bobo-Dioulasso"],
    clients: 0, encours: 0, opened30: 0,
    created: "—", updated: "—",
  }
}

export default function ProductsPage() {
  const [products, setProducts] = useState(PRODUCTS_SEED)
  const [q, setQ] = useState("")
  const [seg, setSeg] = useState("tous")
  const [fam, setFam] = useState("toutes")
  const [view, setView] = useState("cards")
  const [editor, setEditor] = useState(null)

  const filtered = useMemo(() => {
    return products.filter(p => {
      if (seg !== "tous" && p.status !== seg) return false
      if (fam !== "toutes" && p.family !== fam) return false
      if (q && !p.name.toLowerCase().includes(q.toLowerCase()) && !p.code.toLowerCase().includes(q.toLowerCase())) return false
      return true
    })
  }, [products, q, seg, fam])

  const counts = {
    tous: products.length,
    actif: products.filter(p => p.status === "actif").length,
    brouillon: products.filter(p => p.status === "brouillon").length,
    archive: products.filter(p => p.status === "archive").length,
  }

  const totalClients = products.reduce((s, p) => s + p.clients, 0)
  const totalEncours = products.reduce((s, p) => s + p.encours, 0)
  const opened30 = products.reduce((s, p) => s + p.opened30, 0)

  const kpis = [
    { label: "Produits actifs",  value: String(counts.actif), unit: `/ ${counts.tous}`, delta: "+1", dir: "up", note: "ce trimestre", icon: "wallet" },
    { label: "Encours total",    value: fmt(totalEncours),    unit: "FCFA", delta: "+5,8%", dir: "up", note: "vs. avr.", icon: "coin" },
    { label: "Souscriptions",    value: String(totalClients), unit: "comptes", delta: `+${opened30}`, dir: "up", note: "30 derniers j", icon: "users" },
    { label: "Familles",         value: String(PRODUCT_FAMILIES.length), unit: "", delta: "stable", dir: "up", note: "épargne, crédit, …", icon: "receipt" },
  ]

  const onSave = (p) => {
    setProducts(prev => {
      const id = p.id || ("PRD-" + (p.code || "NEW").replace(/\s+/g, "-").toUpperCase())
      const np = { ...p, id, updated: "Aujourd'hui" }
      const idx = prev.findIndex(x => x.id === p.id)
      if (idx === -1) return [{ ...np, created: "Aujourd'hui", clients: 0, encours: 0, opened30: 0 }, ...prev]
      const next = [...prev]
      next[idx] = np
      return next
    })
    setEditor(null)
  }

  const onDuplicate = (p) => {
    setProducts(prev => [{
      ...p,
      id: p.id + "-COPY-" + Date.now().toString(36).slice(-3),
      code: p.code + "-2",
      name: p.name + " (copie)",
      status: "brouillon", clients: 0, encours: 0, opened30: 0,
    }, ...prev])
  }

  return (
    <div className="products-page">
      <PageHeader crumbs={["Produits"]} title="Catalogue de produits">

      </PageHeader>
      <div style={{ display: "flex", justifyContent: "flex-end", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <button className="btn"><I.Export size={14}/>Exporter</button>
        <button className="btn brand" onClick={() => setEditor({ mode: "create", product: blankProduct() })}>
          <I.Plus size={14} stroke="white"/>Nouveau produit
        </button>
      </div>
      <section className="kpi-row">
        {kpis.map(k => <KPI key={k.label} k={k}/>)}
      </section>

      <section className="family-band">
        {PRODUCT_FAMILIES.map(f => {
          const ps = products.filter(p => p.family === f.k)
          const enc = ps.reduce((s, p) => s + p.encours, 0)
          const Ic = I[f.icon]
          return (
            <button key={f.k}
                    className={"family-tile " + (fam === f.k ? "on" : "")}
                    onClick={() => setFam(fam === f.k ? "toutes" : f.k)}>
              <span className="family-icon" style={{ background: f.color }}>
                <Ic size={16} stroke="white"/>
              </span>
              <span className="family-text">
                <span className="family-name">{f.label}</span>
                <span className="family-sub">{ps.length} produits · {fmt(enc)} FCFA</span>
              </span>
              <I.Arrow size={12}/>
            </button>
          )
        })}
      </section>
      
      
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="filter-bar">
          <div className="seg-tabs">
            {[
              { k: "tous",      label: "Tous",      n: counts.tous },
              { k: "actif",     label: "Actifs",    n: counts.actif },
              { k: "brouillon", label: "Brouillons",n: counts.brouillon },
              { k: "archive",   label: "Archivés",  n: counts.archive },
            ].map(t => (
              <button key={t.k} className={"seg-tab " + (seg === t.k ? "on" : "")} onClick={() => setSeg(t.k)}>
                {t.label}<span className="seg-count">{t.n}</span>
              </button>
            ))}
          </div>
          <div className="filter-spacer"/>
          <div className="filter-group">
            <label className="filter-label">Famille</label>
            <select className="filter-select" value={fam} onChange={e => setFam(e.target.value)}>
              <option value="toutes">Toutes</option>
              {PRODUCT_FAMILIES.map(f => <option key={f.k} value={f.k}>{f.label}</option>)}
            </select>
          </div>
          <div className="seg">
            <button className={view === "cards" ? "on" : ""} onClick={() => setView("cards")}>Cartes</button>
            <button className={view === "table" ? "on" : ""} onClick={() => setView("table")}>Tableau</button>
          </div>
        </div>

        {view === "cards" ? (
          <div className="prod-grid">
            {filtered.map(p => (
              <ProductCard key={p.id} p={p}
                onEdit={() => setEditor({ mode: "edit", product: p })}
                onDuplicate={() => onDuplicate(p)}
              />
            ))}
            {filtered.length === 0 && (
              <div style={{ padding: 40, textAlign: "center", color: "var(--ink-3)", fontSize: 13, gridColumn: "1/-1" }}>
                Aucun produit ne correspond aux filtres.
              </div>
            )}
          </div>
        ) : (
          <div className="table-wrap">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Produit</th>
                  <th>Famille</th>
                  <th style={{ textAlign: "right" }}>Taux</th>
                  <th style={{ textAlign: "right" }}>Plafond</th>
                  <th style={{ textAlign: "right" }}>Clients</th>
                  <th style={{ textAlign: "right" }}>Encours</th>
                  <th>Statut</th>
                  <th style={{ width: 30 }}></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(p => {
                  const f = familyMeta(p.family)
                  const sm = STATUS_META[p.status]
                  const Ic = I[f.icon]
                  return (
                    <tr key={p.id} onClick={() => setEditor({ mode: "edit", product: p })}>
                      <td>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <span className="prod-glyph" style={{ background: f.color }}><Ic size={13} stroke="white"/></span>
                          <div>
                            <div style={{ fontWeight: 550 }}>{p.name}</div>
                            <div className="cell-sub" style={{ fontFamily: "var(--font-mono)" }}>{p.code}</div>
                          </div>
                        </div>
                      </td>
                      <td><span className="chip">{f.label}</span></td>
                      <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
                        {p.rate > 0 ? `${p.rate} %` : "—"}
                      </td>
                      <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", color: "var(--ink-2)" }}>
                        {p.maxBalance ? fmt(p.maxBalance) : "—"}
                      </td>
                      <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums" }}>{p.clients}</td>
                      <td style={{ textAlign: "right", fontVariantNumeric: "tabular-nums", fontWeight: 550 }}>
                        {fmt(p.encours)}<span className="cell-sub" style={{ marginLeft: 4 }}>FCFA</span>
                      </td>
                      <td><span className={"tag " + sm.class}>{sm.label}</span></td>
                      <td>
                        <button className="btn ghost sm" style={{ padding: 4 }}
                          onClick={e => { e.stopPropagation(); setEditor({ mode: "edit", product: p }) }}>
                          <I.Arrow size={12}/>
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {editor && (
        <ProductEditor
          mode={editor.mode}
          initial={editor.product}
          onClose={() => setEditor(null)}
          onSave={onSave}
        />
      )}
    </div>
  )
}

function ProductCard({ p, onEdit, onDuplicate }) {
  const f = familyMeta(p.family)
  const sm = STATUS_META[p.status]
  const Ic = I[f.icon]
  const dur = p.durationMin === 0 && p.durationMax === 0 ? "Libre"
    : p.durationMin === p.durationMax ? `${p.durationMin} mois`
    : `${p.durationMin}–${p.durationMax} mois`
  return (
    <div className="prod-card" onClick={onEdit}>
      <div className="prod-card-top">
        <span className="prod-glyph lg" style={{ background: f.color }}><Ic size={18} stroke="white"/></span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div className="prod-name">{p.name}</div>
          <div className="cell-sub" style={{ fontFamily: "var(--font-mono)", letterSpacing: "0.01em" }}>{p.code}</div>
        </div>
        <span className={"tag " + sm.class}>{sm.label}</span>
      </div>

      <div className="prod-summary">{p.summary}</div>

      <div className="prod-stats">
        <div>
          <div className="cell-sub">Taux</div>
          <div className="prod-stat-v">{p.rate > 0 ? p.rate : "—"}<span className="u">{p.rate > 0 ? "% / an" : ""}</span></div>
        </div>
        <div>
          <div className="cell-sub">Durée</div>
          <div className="prod-stat-v">{dur}</div>
        </div>
        <div>
          <div className="cell-sub">Min. ouverture</div>
          <div className="prod-stat-v">{fmt(p.minDeposit)}<span className="u">FCFA</span></div>
        </div>
      </div>

      <div className="prod-foot">
        <div className="prod-usage">
          <I.Users size={12}/> <strong>{p.clients}</strong> clients · <strong>{fmt(p.encours)}</strong> FCFA
        </div>
        <div style={{ display: "flex", gap: 4 }}>
          <button className="btn ghost sm" onClick={e => { e.stopPropagation(); onDuplicate() }} title="Dupliquer">
            <I.Folder size={12}/>
          </button>
          <button className="btn sm" onClick={e => { e.stopPropagation(); onEdit() }}>Modifier</button>
        </div>
      </div>
    </div>
  )
}

const EDITOR_TABS = [
  { k: "identite",     label: "Identité",      icon: "Receipt" },
  { k: "conditions",   label: "Conditions",    icon: "Coin" },
  { k: "distribution", label: "Distribution",  icon: "Users" },
  { k: "apercu",       label: "Aperçu",        icon: "Star" },
]

function ProductEditor({ mode, initial, onClose, onSave }) {
  const [tab, setTab] = useState("identite")
  const [p, setP] = useState({ ...initial })
  const isNew = mode === "create"

  const set = (k, v) => setP(prev => ({ ...prev, [k]: v }))

  const toggleArr = (k, v) => setP(prev => {
    const arr = prev[k] || []
    return { ...prev, [k]: arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v] }
  })

  const f = familyMeta(p.family)
  const Ic = I[f.icon]

  const dur = p.durationMin === 0 && p.durationMax === 0 ? "Libre"
    : p.durationMin === p.durationMax ? `${p.durationMin} mois`
    : `${p.durationMin}–${p.durationMax} mois`

  return (
    <>
      <div className="drawer-scrim" onClick={onClose}/>
      <div className="drawer prod-drawer">
        <div className="drawer-head">
          <div>
            <div style={{ fontWeight: 600, fontSize: 15 }}>
              {isNew ? "Nouveau produit" : p.name}
            </div>
            <div className="cell-sub">{isNew ? "Créer un produit financier" : `Code : ${p.code}`}</div>
          </div>
          <button className="btn ghost sm" onClick={onClose}><I.Plus size={14} style={{ transform: "rotate(45deg)" }}/></button>
        </div>

        <div className="prod-tabs">
          {EDITOR_TABS.map(t => {
            const TIc = I[t.icon]
            return (
              <button key={t.k} className={"prod-tab " + (tab === t.k ? "on" : "")} onClick={() => setTab(t.k)}>
                <TIc size={14}/>{t.label}
              </button>
            )
          })}
        </div>

        <div className="drawer-body">
          {tab === "identite" && (
            <>
              <div className="field">
                <label className="field-label">Famille</label>
                <div className="family-radio">
                  {PRODUCT_FAMILIES.map(fam => {
                    const FIc = I[fam.icon]
                    return (
                      <button key={fam.k} className={"family-radio-tile " + (p.family === fam.k ? "on" : "")}
                              onClick={() => set("family", fam.k)}>
                        <span className="prod-glyph" style={{ background: fam.color, width: 26, height: 26 }}>
                          <FIc size={13} stroke="white"/>
                        </span>
                        {fam.label}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className="field">
                <label className="field-label">Nom du produit</label>
                <input className="input" value={p.name} onChange={e => set("name", e.target.value)} placeholder="Ex : Épargne solidaire"/>
              </div>

              <div className="field">
                <label className="field-label">Code interne</label>
                <input className="input" value={p.code} onChange={e => set("code", e.target.value.toUpperCase())} placeholder="Ex : SOLID-01" style={{ fontFamily: "var(--font-mono)" }}/>
              </div>

              <div className="field">
                <label className="field-label">Description courte</label>
                <textarea className="input" value={p.summary} onChange={e => set("summary", e.target.value)} placeholder="Résumé visible sur la carte produit…"/>
              </div>

              <div className="field">
                <label className="field-label">Statut</label>
                <select className="input" value={p.status} onChange={e => set("status", e.target.value)}>
                  <option value="brouillon">Brouillon</option>
                  <option value="actif">Actif</option>
                  <option value="archive">Archivé</option>
                </select>
              </div>

              <div className="field">
                <label className="field-label">Niveau KYC requis</label>
                <select className="input" value={p.kycLevel} onChange={e => set("kycLevel", e.target.value)}>
                  {KYC_LEVELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </>
          )}

          {tab === "conditions" && (
            <>
              <div className="field">
                <label className="field-label">Taux d'intérêt annuel (%)</label>
                <input className="input" type="number" min="0" step="0.1" value={p.rate}
                       onChange={e => set("rate", parseFloat(e.target.value) || 0)}/>
              </div>

              <div className="field">
                <label className="field-label">Durée (mois)</label>
                <div className="dur-row">
                  <div className="input-row">
                    <input className="input" type="number" min="0" placeholder="Min" value={p.durationMin}
                           onChange={e => set("durationMin", parseInt(e.target.value) || 0)}/>
                    <span style={{ color: "var(--ink-3)" }}>—</span>
                    <input className="input" type="number" min="0" placeholder="Max" value={p.durationMax}
                           onChange={e => set("durationMax", parseInt(e.target.value) || 0)}/>
                  </div>
                  <span className="chip">{dur}</span>
                </div>
                <div className="cell-sub" style={{ marginTop: 4 }}>Mettre 0 / 0 pour une durée libre.</div>
              </div>

              <div className="field">
                <label className="field-label">Dépôt minimum d'ouverture (FCFA)</label>
                <input className="input" type="number" min="0" value={p.minDeposit}
                       onChange={e => set("minDeposit", parseInt(e.target.value) || 0)}/>
              </div>

              <div className="field">
                <label className="field-label">Plafond de solde (FCFA — 0 = illimité)</label>
                <input className="input" type="number" min="0" value={p.maxBalance}
                       onChange={e => set("maxBalance", parseInt(e.target.value) || 0)}/>
              </div>

              <div className="field">
                <label className="field-label">Frais d'ouverture</label>
                <div className="input-row">
                  <input className="input" type="number" min="0" step="0.1" value={p.fees}
                         onChange={e => set("fees", parseFloat(e.target.value) || 0)}/>
                  <select className="input" style={{ width: 90 }} value={p.feesUnit} onChange={e => set("feesUnit", e.target.value)}>
                    <option value="FCFA">FCFA</option>
                    <option value="%">%</option>
                  </select>
                </div>
              </div>

              <div className="field">
                <label className="field-label">Délai de grâce (jours)</label>
                <input className="input" type="number" min="0" value={p.grace}
                       onChange={e => set("grace", parseInt(e.target.value) || 0)}/>
              </div>
            </>
          )}

          {tab === "distribution" && (
            <>
              <div className="field">
                <label className="field-label">Agences habilitées</label>
                <div className="chip-picker">
                  {ALL_BRANCHES.map(b => (
                    <button key={b} className={"chip-pick " + (p.branches.includes(b) ? "on" : "")}
                            onClick={() => toggleArr("branches", b)}>
                      {p.branches.includes(b) && <I.Check size={12}/>}{b}
                    </button>
                  ))}
                </div>
              </div>

              <div className="field">
                <label className="field-label">Cibles clients</label>
                <div className="chip-picker">
                  {ALL_TARGETS.map(t => (
                    <button key={t} className={"chip-pick " + (p.targets.includes(t) ? "on" : "")}
                            onClick={() => toggleArr("targets", t)}>
                      {p.targets.includes(t) && <I.Check size={12}/>}{t}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {tab === "apercu" && (
            <>
              <div className="preview-card">
                <div className="prod-card-top">
                  <span className="prod-glyph lg" style={{ background: f.color }}><Ic size={18} stroke="white"/></span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className="prod-name">{p.name || "Nom du produit"}</div>
                    <div className="cell-sub" style={{ fontFamily: "var(--font-mono)" }}>{p.code || "CODE"}</div>
                  </div>
                  <span className={"tag " + STATUS_META[p.status].class}>{STATUS_META[p.status].label}</span>
                </div>
                <div className="prod-summary" style={{ WebkitLineClamp: "unset" }}>{p.summary || "—"}</div>
                <div className="prod-stats">
                  <div>
                    <div className="cell-sub">Taux</div>
                    <div className="prod-stat-v">{p.rate > 0 ? p.rate : "—"}<span className="u">{p.rate > 0 ? "% / an" : ""}</span></div>
                  </div>
                  <div>
                    <div className="cell-sub">Durée</div>
                    <div className="prod-stat-v">{dur}</div>
                  </div>
                  <div>
                    <div className="cell-sub">Min. ouverture</div>
                    <div className="prod-stat-v">{fmt(p.minDeposit)}<span className="u">FCFA</span></div>
                  </div>
                </div>
              </div>

              <div className="example-box">
                <div className="cell-sub" style={{ marginBottom: 8 }}>Résumé des conditions</div>
                <dl className="info-list">
                  <dt>Famille</dt><dd>{f.label}</dd>
                  <dt>KYC requis</dt><dd>{p.kycLevel}</dd>
                  <dt>Frais</dt><dd>{p.fees > 0 ? `${p.fees} ${p.feesUnit}` : "Aucun"}</dd>
                  <dt>Délai de grâce</dt><dd>{p.grace > 0 ? `${p.grace} j` : "—"}</dd>
                  <dt>Plafond</dt><dd>{p.maxBalance ? `${fmt(p.maxBalance)} FCFA` : "Illimité"}</dd>
                  <dt>Agences</dt><dd>{p.branches.join(", ") || "—"}</dd>
                  <dt>Cibles</dt><dd>{p.targets.join(", ") || "—"}</dd>
                </dl>
              </div>
            </>
          )}
        </div>

        <div className="drawer-foot">
          <button className="btn brand" onClick={() => onSave(p)}>
            <I.Check size={14} stroke="white"/>{isNew ? "Créer le produit" : "Enregistrer"}
          </button>
          <button className="btn" onClick={onClose}>Annuler</button>
          {!isNew && (
            <button className="btn ghost sm" style={{ marginLeft: "auto", color: "var(--neg)" }}
                    onClick={() => { onSave({ ...p, status: "archive" }) }}>
              Archiver
            </button>
          )}
        </div>
      </div>
    </>
  )
}
