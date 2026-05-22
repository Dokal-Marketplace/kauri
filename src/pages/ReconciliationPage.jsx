import { useState, useMemo } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { I } from '../icons'
import { fmt, PageHeader } from '../components'

// ─── Constants ────────────────────────────────────────────────────────────────

const STATUS_META = {
  settled:     { label: 'Équilibrée',  cls: 'rec-status signed'   },
  discrepancy: { label: 'Écart',       cls: 'rec-status variance' },
  pending:     { label: 'En cours',    cls: 'rec-status open'     },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayISO() {
  return new Date().toISOString().split('T')[0]
}

function formatDate(isoDate) {
  if (!isoDate) return '—'
  const [y, m, d] = isoDate.split('-')
  const months = ['jan.','fév.','mars','avr.','mai','juin','juil.','août','sept.','oct.','nov.','déc.']
  return `${parseInt(d)} ${months[parseInt(m) - 1]} ${y}`
}

function formatTs(ts) {
  if (!ts) return '—'
  return new Date(ts).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
}

// ─── Page entry ───────────────────────────────────────────────────────────────

export default function ReconciliationPage() {
  const [selectedId, setSelectedId] = useState(null)

  if (selectedId) {
    return <ReconciliationDetail reconciliationId={selectedId} onBack={() => setSelectedId(null)} />
  }
  return <ReconciliationIndex onOpen={setSelectedId} />
}

// ─── Index list ───────────────────────────────────────────────────────────────

function ReconciliationIndex({ onOpen }) {
  const [seg, setSeg]     = useState('tous')
  const [agent, setAgent] = useState('tous')
  const [q, setQ]         = useState('')
  const [showForm, setShowForm] = useState(false)

  // Pull current user's branch via identity (adjust query name to your actual query)
  const me = useQuery(api.users.currentUser)
  const branchId = me?.branchId

  const records = useQuery(
    api.reconciliation.listByBranch,
    branchId ? { branchId } : 'skip'
  )

  const agents = useMemo(() => {
    if (!records) return ['tous']
    const names = Array.from(new Set(records.map(r => r.agentName).filter(Boolean)))
    return ['tous', ...names]
  }, [records])

  const filtered = useMemo(() => {
    if (!records) return []
    return records.filter(r => {
      if (seg === 'equilibrees' && r.status !== 'settled')     return false
      if (seg === 'ecarts'      && r.status !== 'discrepancy') return false
      if (agent !== 'tous' && r.agentName !== agent)           return false
      if (q) {
        const blob = [r._id, r.agentName, r.date, r.notes].join(' ').toLowerCase()
        if (!blob.includes(q.toLowerCase())) return false
      }
      return true
    })
  }, [records, seg, agent, q])

  const counts = useMemo(() => ({
    tous:         (records ?? []).length,
    equilibrees:  (records ?? []).filter(r => r.status === 'settled').length,
    ecarts:       (records ?? []).filter(r => r.status === 'discrepancy').length,
  }), [records])

  const totalVarianceAbs = (records ?? []).reduce((s, r) => s + Math.abs(r.variance ?? 0), 0)
  const ecartCount       = counts.ecarts
  const settledCount     = counts.equilibrees

  const kpis = [
    {
      label: 'Sessions totales',
      value: String(counts.tous),
      note: 'Sur la période',
      icon: 'wallet',
      delta: '0',
      dir: 'up',
    },
    {
      label: 'Écarts non résolus',
      value: String(ecartCount),
      note: 'Action requise',
      icon: 'alert',
      delta: ecartCount > 0 ? `+${ecartCount}` : '0',
      dir: ecartCount > 0 ? 'down' : 'up',
    },
    {
      label: 'Écart cumulé',
      value: fmt(totalVarianceAbs),
      unit: 'FCFA',
      note: 'Toutes sessions',
      icon: 'coin',
      delta: '—',
      dir: 'up',
    },
    {
      label: 'Équilibrées',
      value: String(settledCount),
      note: `Sur ${counts.tous} sessions`,
      icon: 'check',
      delta: `+${settledCount}`,
      dir: 'up',
    },
  ]

  return (
    <div className="recon-page">
      <PageHeader crumbs={['Réconciliation']} title="Réconciliation de caisse">
        <button className="btn"><I.Export size={14} />Exporter</button>
        <button className="btn brand" onClick={() => setShowForm(true)}>
          <I.Plus size={14} stroke="white" />Nouveau rapprochement
        </button>
      </PageHeader>

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 18 }}>
        <div className="h1-sub" style={{ flex: 1 }}>
          {formatDate(todayISO())} · {counts.tous} session{counts.tous !== 1 ? 's' : ''}
        </div>
        <div className="search" style={{ width: 240 }}>
          <I.Search />
          <input
            placeholder="Agent, date, notes…"
            value={q}
            onChange={e => setQ(e.target.value)}
          />
        </div>
      </div>

      <section className="kpi-row">
        {kpis.map(k => (
          <div className="kpi" key={k.label}>
            <div className="kpi-label">
              {k.icon === 'wallet' && <I.Wallet />}
              {k.icon === 'coin'   && <I.Coin />}
              {k.icon === 'check'  && <I.Check />}
              {k.icon === 'alert'  && <I.Bell />}
              {k.label}
            </div>
            <div className="kpi-value">
              {k.value}
              {k.unit && <span className="unit"> {k.unit}</span>}
            </div>
            <div className="kpi-foot">
              <span className={'delta ' + (k.dir === 'up' ? 'up' : 'down')}>
                {k.dir === 'up'
                  ? <I.ArrowUR size={10} stroke="currentColor" />
                  : <I.ArrowDR size={10} stroke="currentColor" />}
                {k.delta}
              </span>
              <span>{k.note}</span>
            </div>
          </div>
        ))}
      </section>

      {showForm && (
        <NewReconciliationForm
          branchId={branchId}
          onClose={() => setShowForm(false)}
        />
      )}

      <div className="card">
        <div className="filter-bar">
          <div className="seg-tabs">
            {[
              { k: 'tous',        label: 'Toutes',       n: counts.tous        },
              { k: 'equilibrees', label: 'Équilibrées',  n: counts.equilibrees },
              { k: 'ecarts',      label: 'Écarts',       n: counts.ecarts      },
            ].map(t => (
              <button
                key={t.k}
                className={'seg-tab ' + (seg === t.k ? 'on' : '')}
                onClick={() => setSeg(t.k)}
              >
                {t.label}<span className="seg-count">{t.n}</span>
              </button>
            ))}
          </div>
          <div className="filter-spacer" />
          <div className="filter-group">
            <label className="filter-label">Agent</label>
            <select
              className="filter-select"
              value={agent}
              onChange={e => setAgent(e.target.value)}
            >
              {agents.map(a => (
                <option key={a} value={a}>{a === 'tous' ? 'Tous' : a}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="table-wrap">
          {records === undefined ? (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
              Chargement…
            </div>
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Agent</th>
                  <th style={{ textAlign: 'right' }}>Théorique système</th>
                  <th style={{ textAlign: 'right' }}>Espèces reçues</th>
                  <th style={{ textAlign: 'right' }}>Écart</th>
                  <th>Statut</th>
                  <th>Vérifié par</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const meta     = STATUS_META[r.status] ?? STATUS_META.pending
                  const variance = r.variance ?? 0
                  return (
                    <tr key={r._id} onClick={() => onOpen(r._id)}>
                      <td>
                        <div>{formatDate(r.date)}</div>
                        <div className="cell-sub" style={{ fontVariantNumeric: 'tabular-nums' }}>
                          {formatTs(r.timestamp)}
                        </div>
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div className="avatar sm">
                            {(r.agentName ?? '?').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: 550 }}>{r.agentName ?? '—'}</div>
                            <div className="cell-sub">{r.date}</div>
                          </div>
                        </div>
                      </td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {fmt(r.systemExpectedAmount)}
                        <span className="cell-sub" style={{ marginLeft: 4 }}>FCFA</span>
                      </td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>
                        {fmt(r.physicalCashReceived)}
                        <span className="cell-sub" style={{ marginLeft: 4 }}>FCFA</span>
                      </td>
                      <td style={{
                        textAlign: 'right',
                        fontVariantNumeric: 'tabular-nums',
                        fontWeight: 600,
                        color: variance === 0
                          ? 'var(--ink-3)'
                          : variance > 0 ? 'var(--pos)' : 'var(--neg)',
                      }}>
                        {variance === 0
                          ? '—'
                          : (variance > 0 ? '+' : '−') + fmt(Math.abs(variance))}
                      </td>
                      <td>
                        <span className={meta.cls}>
                          <span className="rec-status-dot" />
                          {meta.label}
                        </span>
                      </td>
                      <td className="cell-sub">{r.verifierName ?? '—'}</td>
                      <td>
                        <button
                          className="btn ghost sm"
                          style={{ padding: 4 }}
                          onClick={e => { e.stopPropagation(); onOpen(r._id) }}
                        >
                          <I.Arrow size={12} />
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}

          {records !== undefined && filtered.length === 0 && (
            <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)', fontSize: 13 }}>
              Aucune réconciliation ne correspond aux filtres.
            </div>
          )}

          {records !== undefined && (
            <div className="table-foot">
              <span>{filtered.length} sur {(records ?? []).length} sessions</span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── New reconciliation form ───────────────────────────────────────────────────

function NewReconciliationForm({ branchId, onClose }) {
  const [agentId, setAgentId]           = useState('')
  const [date, setDate]                 = useState(todayISO())
  const [physicalAmount, setPhysical]   = useState('')
  const [notes, setNotes]               = useState('')
  const [submitting, setSubmitting]     = useState(false)
  const [error, setError]               = useState(null)
  const [success, setSuccess]           = useState(null)

  // Load branch agents
  const agents = useQuery(
    api.users.listByBranch,
    branchId ? { branchId } : 'skip'
  )

  // Load agent daily summary for pre-check
  const summary = useQuery(
    api.reconciliation.getAgentDailySummary,
    agentId && date ? { agentId, date } : 'skip'
  )

  const settleDailyCash = useMutation(api.reconciliation.settleDailyCash)

  const systemExpected = useMemo(() => {
    if (!summary) return null
    return summary.reduce((s, tx) => s + (tx.amount ?? 0), 0)
  }, [summary])

  const physical = parseInt(physicalAmount.replace(/\D/g, ''), 10) || 0
  const variance = systemExpected !== null ? physical - systemExpected : null

  async function handleSubmit() {
    if (!agentId) return setError('Veuillez sélectionner un agent.')
    if (!physicalAmount) return setError('Veuillez saisir le montant physique.')
    setError(null)
    setSubmitting(true)
    try {
      const result = await settleDailyCash({
        agentId,
        date,
        physicalAmount: physical,
        notes: notes || undefined,
      })
      setSuccess(result)
    } catch (err) {
      setError(err.message ?? 'Une erreur est survenue.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Success state ──
  if (success) {
    const v = success.variance
    return (
      <div className="recon-banner" style={{
        marginBottom: 18,
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 10,
        background: v === 0
          ? 'color-mix(in oklch, var(--pos) 10%, var(--surface))'
          : 'color-mix(in oklch, var(--neg) 10%, var(--surface))',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%' }}>
          <div className="recon-banner-icon">
            {v === 0 ? <I.Check size={18} /> : <I.Bell size={18} />}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>
              {v === 0
                ? 'Réconciliation équilibrée — session validée'
                : `Écart constaté : ${v > 0 ? '+' : '−'}${fmt(Math.abs(v))} FCFA`}
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 2 }}>
              {v === 0
                ? 'Les espèces reçues correspondent exactement au total système.'
                : v > 0
                  ? 'Surplus en caisse — vérifiez s\'il y a un dépôt non saisi.'
                  : 'Manque en caisse — vérifiez les retraits ou billets manquants.'}
            </div>
          </div>
          <button className="btn" onClick={onClose}>Fermer</button>
        </div>
      </div>
    )
  }

  return (
    <div className="card" style={{ marginBottom: 18 }}>
      <div className="card-head">
        <div>
          <div className="card-title">Nouveau rapprochement de caisse</div>
          <div className="card-sub">Saisir le montant physique remis par l'agent</div>
        </div>
        <button
          className="btn ghost sm"
          style={{ marginLeft: 'auto' }}
          onClick={onClose}
        >✕</button>
      </div>

      <div style={{ padding: '0 14px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
        {/* Agent selector */}
        <div className="form-field">
          <label className="filter-label">Agent</label>
          <select
            className="filter-select"
            style={{ width: '100%', marginTop: 4 }}
            value={agentId}
            onChange={e => setAgentId(e.target.value)}
          >
            <option value="">— Sélectionner un agent —</option>
            {(agents ?? []).map(a => (
              <option key={a._id} value={a._id}>
                {a.name ?? a.email}
              </option>
            ))}
          </select>
        </div>

        {/* Date */}
        <div className="form-field">
          <label className="filter-label">Date</label>
          <input
            type="date"
            className="filter-select"
            style={{ width: '100%', marginTop: 4 }}
            value={date}
            max={todayISO()}
            onChange={e => setDate(e.target.value)}
          />
        </div>
      </div>

      {/* Pre-check panel */}
      {agentId && date && (
        <div style={{ margin: '0 14px 14px', borderRadius: 8, border: '1px solid var(--border)', overflow: 'hidden' }}>
          <div style={{
            padding: '10px 14px',
            background: 'var(--surface-2)',
            fontSize: 11,
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.05em',
            color: 'var(--ink-3)',
          }}>
            Pré-vérification — Total système
          </div>
          {summary === undefined ? (
            <div style={{ padding: '14px', fontSize: 13, color: 'var(--ink-3)' }}>Chargement…</div>
          ) : summary === null || summary.length === 0 ? (
            <div style={{ padding: '14px', fontSize: 13, color: 'var(--neg)' }}>
              Aucune transaction complétée trouvée pour cet agent à cette date.
            </div>
          ) : (
            <div style={{ padding: '10px 14px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                <span style={{ fontSize: 13, color: 'var(--ink-2)' }}>
                  {summary.length} transaction{summary.length !== 1 ? 's' : ''} complétée{summary.length !== 1 ? 's' : ''}
                </span>
                <span style={{ fontSize: 18, fontWeight: 600, fontVariantNumeric: 'tabular-nums' }}>
                  {fmt(systemExpected)} <span style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 500 }}>FCFA</span>
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {summary.slice(0, 5).map(tx => (
                  <div key={tx._id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 12,
                    color: 'var(--ink-2)',
                    padding: '3px 0',
                    borderBottom: '1px solid var(--border)',
                  }}>
                    <span style={{ color: 'var(--ink-3)' }}>{formatTs(tx.timestamp)}</span>
                    <span>{tx.type ?? tx.transactionType ?? '—'}</span>
                    <span style={{ fontVariantNumeric: 'tabular-nums', fontWeight: 550 }}>
                      {fmt(tx.amount)} FCFA
                    </span>
                  </div>
                ))}
                {summary.length > 5 && (
                  <div style={{ fontSize: 12, color: 'var(--ink-3)', textAlign: 'center', paddingTop: 4 }}>
                    + {summary.length - 5} autres transactions
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Physical amount input */}
      <div style={{ padding: '0 14px 14px' }}>
        <label className="filter-label">Espèces physiques reçues (FCFA)</label>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginTop: 6,
          border: '1px solid var(--border)',
          borderRadius: 8,
          padding: '6px 12px',
          background: 'var(--surface)',
        }}>
          <I.Coin />
          <input
            type="text"
            placeholder="0"
            value={physicalAmount}
            style={{
              flex: 1,
              border: 'none',
              background: 'transparent',
              fontSize: 20,
              fontWeight: 600,
              fontVariantNumeric: 'tabular-nums',
              outline: 'none',
              color: 'var(--ink)',
            }}
            onChange={e => {
              const raw = e.target.value.replace(/\D/g, '')
              setPhysical(raw ? fmt(parseInt(raw, 10)) : '')
            }}
          />
          <span style={{ fontSize: 12, color: 'var(--ink-3)', fontWeight: 600 }}>FCFA</span>
        </div>

        {/* Live variance preview */}
        {variance !== null && physical > 0 && (
          <div style={{
            marginTop: 10,
            padding: '8px 12px',
            borderRadius: 8,
            background: variance === 0
              ? 'color-mix(in oklch, var(--pos) 12%, var(--surface))'
              : 'color-mix(in oklch, var(--neg) 12%, var(--surface))',
            border: `1px solid ${variance === 0 ? 'color-mix(in oklch, var(--pos) 30%, transparent)' : 'color-mix(in oklch, var(--neg) 30%, transparent)'}`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: 12.5, color: 'var(--ink-2)' }}>
                Écart prévu (physique − système)
              </span>
              <span style={{
                fontWeight: 700,
                fontVariantNumeric: 'tabular-nums',
                fontSize: 15,
                color: variance === 0 ? 'var(--pos)' : 'var(--neg)',
              }}>
                {variance === 0
                  ? '✓ Équilibrée'
                  : (variance > 0 ? '+' : '−') + fmt(Math.abs(variance)) + ' FCFA'}
              </span>
            </div>
            {variance !== 0 && (
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 3 }}>
                {variance > 0
                  ? 'Surplus — un dépôt non saisi est probable.'
                  : 'Manque — vérifiez les billets ou retraits non enregistrés.'}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Notes */}
      <div style={{ padding: '0 14px 14px' }}>
        <label className="filter-label">Note (optionnel)</label>
        <textarea
          className="recon-notes"
          style={{ marginTop: 6 }}
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Justification, observations de l'agent, etc."
        />
      </div>

      {error && (
        <div style={{
          margin: '0 14px 14px',
          padding: '8px 12px',
          borderRadius: 8,
          background: 'color-mix(in oklch, var(--neg) 12%, var(--surface))',
          fontSize: 13,
          color: 'var(--neg)',
        }}>
          {error}
        </div>
      )}

      <div className="recon-foot">
        <button className="btn ghost" onClick={onClose}>Annuler</button>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          <button
            className="btn brand"
            onClick={handleSubmit}
            disabled={submitting || !agentId || !physicalAmount}
          >
            <I.Check size={14} stroke="white" />
            {submitting ? 'Envoi…' : variance === 0 ? 'Valider (équilibrée)' : 'Soumettre l\'écart'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── Detail view ───────────────────────────────────────────────────────────────

function ReconciliationDetail({ reconciliationId, onBack }) {
  // All hooks MUST be at the top — no conditional calls (React rules of hooks)
  const me       = useQuery(api.users.currentUser)
  const branchId = me?.branchId
  const records  = useQuery(
    api.reconciliation.listByBranch,
    branchId ? { branchId } : 'skip'
  )
  const record = records?.find(r => r._id === reconciliationId)

  // summary hook always called — 'skip' when record not ready
  const summary = useQuery(
    api.reconciliation.getAgentDailySummary,
    record ? { agentId: record.agentId, date: record.date } : 'skip'
  )

  // Early return AFTER all hooks
  if (!record) {
    return (
      <div className="recon-page">
        <PageHeader crumbs={['Réconciliation', '…']} title={null}>
          <button className="btn ghost sm" onClick={onBack}>← Toutes les sessions</button>
        </PageHeader>
        <div style={{ padding: 40, textAlign: 'center', color: 'var(--ink-3)' }}>
          {records === undefined ? 'Chargement…' : 'Session introuvable.'}
        </div>
      </div>
    )
  }

  const meta     = STATUS_META[record.status] ?? STATUS_META.pending
  const variance = record.variance ?? 0

  return (
    <div className="recon-page">
      <PageHeader crumbs={['Réconciliation', record.date]} title={null}>
        <button className="btn ghost sm" onClick={onBack}>← Toutes les sessions</button>
        <button className="btn"><I.Export size={14} />Exporter PDF</button>
      </PageHeader>

      <div style={{ marginBottom: 14 }}>
        <h1 className="h1" style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 2 }}>
          Session {record.date} · {record.agentName ?? '—'}
          <span className={meta.cls} style={{ fontSize: 12 }}>
            <span className="rec-status-dot" />{meta.label}
          </span>
        </h1>
        <div className="h1-sub">
          {record.agentName} · {formatTs(record.timestamp)} · Vérifié par {record.verifierName ?? '—'}
        </div>
      </div>

      {/* Summary band */}
      <div className="recon-meta">
        <div>
          <div className="recon-meta-l">Théorique (système)</div>
          <div className="recon-meta-v" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {fmt(record.systemExpectedAmount)} <span style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 500 }}>FCFA</span>
          </div>
        </div>
        <div>
          <div className="recon-meta-l">Espèces reçues</div>
          <div className="recon-meta-v" style={{ fontVariantNumeric: 'tabular-nums' }}>
            {fmt(record.physicalCashReceived)} <span style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 500 }}>FCFA</span>
          </div>
        </div>
        <div>
          <div className="recon-meta-l">Écart</div>
          <div className={
            'recon-meta-v ' + (variance === 0 ? 'variance-zero' : variance > 0 ? 'variance-pos' : 'variance-neg')
          } style={{ fontVariantNumeric: 'tabular-nums' }}>
            {variance === 0
              ? '—'
              : (variance > 0 ? '+' : '−') + fmt(Math.abs(variance))}
            {variance !== 0 && (
              <span style={{ fontSize: 11, color: 'currentColor', fontWeight: 500, opacity: 0.7 }}> FCFA</span>
            )}
          </div>
        </div>
        <div>
          <div className="recon-meta-l">Vérifié par</div>
          <div className="recon-meta-v">
            {record.verifierName ?? <span style={{ color: 'var(--ink-3)', fontWeight: 500 }}>—</span>}
            {record.timestamp && (
              <span style={{ fontSize: 11, color: 'var(--ink-3)', fontWeight: 500 }}> · {formatTs(record.timestamp)}</span>
            )}
          </div>
        </div>
      </div>

      <div className="recon-detail">
        {/* LEFT — transactions */}
        <div>
          <div className="card">
            <div className="card-head">
              <div>
                <div className="card-title">Transactions du jour</div>
                <div className="card-sub">
                  {summary === undefined
                    ? 'Chargement…'
                    : `${(summary ?? []).length} transaction${(summary ?? []).length !== 1 ? 's' : ''} complétée${(summary ?? []).length !== 1 ? 's' : ''}`}
                </div>
              </div>
            </div>
            {summary === undefined ? (
              <div style={{ padding: 20, color: 'var(--ink-3)', fontSize: 13 }}>Chargement…</div>
            ) : (summary ?? []).length === 0 ? (
              <div style={{ padding: 20, color: 'var(--ink-3)', fontSize: 13 }}>
                Aucune transaction trouvée.
              </div>
            ) : (
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Heure</th>
                    <th>Type</th>
                    <th>Bénéficiaire</th>
                    <th style={{ textAlign: 'right' }}>Montant</th>
                    <th>Statut</th>
                  </tr>
                </thead>
                <tbody>
                  {(summary ?? []).map(tx => (
                    <tr key={tx._id}>
                      <td className="cell-sub" style={{ fontVariantNumeric: 'tabular-nums' }}>
                        {formatTs(tx.timestamp)}
                      </td>
                      <td>{tx.type ?? tx.transactionType ?? '—'}</td>
                      <td>{tx.beneficiaryName ?? tx.clientName ?? '—'}</td>
                      <td style={{ textAlign: 'right', fontVariantNumeric: 'tabular-nums', fontWeight: 550 }}>
                        {fmt(tx.amount)} <span className="cell-sub">FCFA</span>
                      </td>
                      <td>
                        {/* Block reversal if reconciled */}
                        <ReverseButton tx={tx} reconciled={record.status === 'settled'} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* RIGHT — variance + notes */}
        <div>
          <div className="card" style={{ marginBottom: 14 }}>
            <div className="variance-hero">
              <div style={{ fontSize: 11, color: 'var(--ink-3)', textTransform: 'uppercase', letterSpacing: '0.04em', fontWeight: 600 }}>Écart total</div>
              <div className={'variance-big ' + (variance === 0 ? 'variance-zero' : variance > 0 ? 'variance-pos' : 'variance-neg')}>
                {variance === 0
                  ? 'Équilibrée'
                  : (variance > 0 ? '+' : '−') + fmt(Math.abs(variance)) + ' FCFA'}
              </div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-3)', marginTop: 4 }}>
                {variance === 0
                  ? 'Aucun écart entre espèces reçues et total système.'
                  : variance > 0
                    ? 'Surplus — possible dépôt non saisi.'
                    : 'Manque — possible retrait ou billet non enregistré.'}
              </div>
            </div>
            <div className="variance-rows">
              <VarianceRow
                label="Espèces reçues"
                expected={record.systemExpectedAmount}
                counted={record.physicalCashReceived}
              />
            </div>
          </div>

          {record.notes && (
            <div className="recon-side-card" style={{ marginBottom: 14 }}>
              <div className="card-head">
                <div>
                  <div className="card-title">Note de session</div>
                </div>
              </div>
              <div style={{ padding: '0 14px 14px', fontSize: 13.5, color: 'var(--ink-2)', lineHeight: 1.55 }}>
                {record.notes}
              </div>
            </div>
          )}

          <div className="recon-side-card">
            <div className="card-head">
              <div>
                <div className="card-title">Récapitulatif</div>
              </div>
            </div>
            <div style={{ padding: '8px 14px 14px', display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                { label: 'Agent',          value: record.agentName ?? '—' },
                { label: 'Date',           value: formatDate(record.date) },
                { label: 'Heure de saisie', value: formatTs(record.timestamp) },
                { label: 'Vérifié par',    value: record.verifierName ?? '—' },
                { label: 'Statut',         value: meta.label },
              ].map(row => (
                <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                  <span style={{ color: 'var(--ink-3)' }}>{row.label}</span>
                  <span style={{ fontWeight: 550 }}>{row.value}</span>
                </div>
              ))}
            </div>
            <div className="recon-foot">
              <button className="btn"><I.Export size={14} />Télécharger PV</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function ReverseButton({ tx, reconciled }) {
  if (reconciled) {
    return (
      <span
        title="Annulation impossible — journée réconciliée"
        style={{
          fontSize: 11.5,
          color: 'var(--ink-4)',
          cursor: 'not-allowed',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 4,
        }}
      >
        🔒 Verrouillée
      </span>
    )
  }
  return (
    <button className="btn ghost sm" style={{ fontSize: 11.5 }}>
      Annuler
    </button>
  )
}

function VarianceRow({ label, expected, counted }) {
  const delta = counted - expected
  return (
    <div className="variance-row">
      <span className="v-label">{label}</span>
      <span className="v-num muted">{fmt(expected)}</span>
      <span className="v-num">{fmt(counted)}</span>
      <span className={'v-delta ' + (delta === 0 ? '' : delta > 0 ? 'variance-pos' : 'variance-neg')}>
        {delta === 0
          ? <span style={{ color: 'var(--ink-4)' }}>—</span>
          : (delta > 0 ? '+' : '−') + fmt(Math.abs(delta))}
      </span>
    </div>
  )
}
