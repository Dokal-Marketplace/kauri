//pages/DisbursementsPage.jsx
import { Fragment, useState } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { I } from '../icons'
import { fmt, KPI, PageHeader } from '../components'
import { SkeletonTableRows } from '../components/Skeleton'
import { EmptyState } from '../components/EmptyState'
import { DisbursementIllustration } from '../components/Illustrations'

const STATUS_META = {
  pending: { label: 'En attente', class: 'attente' },
  approved: { label: 'Approuvé', class: 'actif' },
  rejected: { label: 'Rejeté', class: 'archive' },
  executed: { label: 'Exécuté', class: 'actif' },
}

const METHOD_META = {
  cash: { label: 'Espèces', icon: 'Coin' },
  mobile_money: { label: 'Mobile Money', icon: 'Wallet' },
}

function todayStart() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

function fmtDate(ts) {
  return new Date(ts).toLocaleString('fr-FR', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default function DisbursementsPage() {
  const { tenantId: branchId } = useCurrentUser()

  const shouldQuery = !!branchId
  const pendingQuery = useQuery(api.disbursements.listPending, shouldQuery ? { branchId } : 'skip')
  const historyQuery = useQuery(api.disbursements.listHistory, shouldQuery ? { branchId } : 'skip')
  const canApprove = useQuery(api.disbursements.canApproveDisbursements) ?? false

  const isLoading = shouldQuery && (pendingQuery === undefined || historyQuery === undefined)
  const pending = pendingQuery ?? []
  const history = historyQuery ?? []

  const approveMut = useMutation(api.disbursements.approveDisbursement)
  const rejectMut = useMutation(api.disbursements.rejectDisbursement)

  const [tab, setTab] = useState('pending')
  const [rejectModal, setRejectModal] = useState(null) // disbursementId | null
  const [rejectReason, setRejectReason] = useState('')
  const [fraudError, setFraudError] = useState(null) // disbursementId | null
  const [actionError, setActionError] = useState(null) // generic error message | null
  const [loadingId, setLoadingId] = useState(null) // disbursementId in-flight | null
  const [rejectLoading, setRejectLoading] = useState(false)

  // KPIs
  const t0 = todayStart()
  const totalPending = pending.reduce((s, d) => s + d.amount, 0)
  const approvedToday = history.filter((d) => d.status === 'approved' && d.timestamp >= t0).length
  const rejectedToday = history.filter((d) => d.status === 'rejected' && d.timestamp >= t0).length

  const kpis = [
    {
      label: 'En attente',
      value: String(pending.length),
      unit: 'dossiers',
      delta: pending.length > 0 ? `+${pending.length}` : '0',
      dir: 'up',
      note: 'à traiter',
      icon: 'receipt',
    },
    {
      label: 'Montant en attente',
      value: fmt(totalPending),
      unit: 'FCFA',
      delta: '—',
      dir: 'up',
      note: 'total engagé',
      icon: 'coin',
    },
    {
      label: "Approuvés aujourd'hui",
      value: String(approvedToday),
      unit: 'dossiers',
      delta: `+${approvedToday}`,
      dir: 'up',
      note: 'depuis minuit',
      icon: 'wallet',
    },
    {
      label: "Rejetés aujourd'hui",
      value: String(rejectedToday),
      unit: 'dossiers',
      delta: String(rejectedToday),
      dir: rejectedToday > 0 ? 'down' : 'up',
      note: 'depuis minuit',
      icon: 'users',
    },
  ]

  const handleApprove = async (id) => {
    // Prevent concurrent submissions
    if (loadingId) return
    // Clear any prior fraud/action error, including one left over from a different row
    setFraudError(null)
    setActionError(null)
    setLoadingId(id)
    try {
      await approveMut({ disbursementId: id })
    } catch (err) {
      if (err?.message?.includes('Fraud Prevention')) {
        setFraudError(id)
      } else {
        setActionError(
          err?.message ?? "Une erreur est survenue lors de l'approbation. Veuillez réessayer."
        )
      }
    } finally {
      // Always stop the spinner — even on the fraud path where we didn't previously reach here
      setLoadingId(null)
    }
  }

  const handleRejectOpen = (id) => {
    setFraudError(null)
    setActionError(null)
    setRejectModal(id)
  }

  const handleRejectConfirm = async () => {
    const trimmedReason = rejectReason.trim()
    if (!rejectModal || !trimmedReason || rejectLoading) return
    setActionError(null)
    setRejectLoading(true)
    try {
      // Send the normalized (trimmed) reason so the backend never receives leading/trailing whitespace
      await rejectMut({ disbursementId: rejectModal, reason: trimmedReason })
      setRejectModal(null)
      setRejectReason('')
    } catch (err) {
      // Surface the error inside the modal so context isn't lost
      setActionError(err?.message ?? 'Une erreur est survenue lors du rejet. Veuillez réessayer.')
    } finally {
      setRejectLoading(false)
    }
  }

  const handleRejectClose = () => {
    setRejectModal(null)
    setRejectReason('')
    setActionError(null)
  }

  return (
    <div className="products-page">
      <PageHeader crumbs={['Décaissements']} title="Décaissements" />

      <section className="kpi-row">
        {kpis.map((k) => (
          <KPI key={k.label} k={k} />
        ))}
      </section>

      {/* Generic action error banner (approve failures, non-modal context) */}
      {actionError && !rejectModal && (
        <div
          style={{
            margin: '0 0 14px',
            padding: '10px 14px',
            background: 'oklch(0.97 0.02 20)',
            border: '1px solid oklch(0.88 0.06 20)',
            borderRadius: 8,
            fontSize: 13,
            color: 'var(--neg)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
          }}
        >
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <I.Shield size={13} />
            {actionError}
          </span>
          <button
            className="btn ghost sm"
            style={{ padding: '2px 6px', fontSize: 11 }}
            onClick={() => setActionError(null)}
          >
            Fermer
          </button>
        </div>
      )}

      <div className="card" style={{ marginBottom: 14 }}>
        <div className="filter-bar">
          <div className="seg-tabs">
            {[
              { k: 'pending', label: 'En attente', n: pending.length },
              { k: 'history', label: 'Historique', n: history.length },
            ].map((t) => (
              <button
                key={t.k}
                className={'seg-tab ' + (tab === t.k ? 'on' : '')}
                onClick={() => setTab(t.k)}
              >
                {t.label}
                <span className="seg-count">{t.n}</span>
              </button>
            ))}
          </div>
        </div>

        {isLoading ? (
          <div className="table-wrap">
            <table className="data-table">
              <tbody>
                <SkeletonTableRows cols={[160, 80, 70, 80, 90, 90, 70]} rows={6} />
              </tbody>
            </table>
          </div>
        ) : tab === 'pending' ? (
          <PendingTable
            rows={pending}
            canApprove={canApprove}
            fraudError={fraudError}
            loadingId={loadingId}
            onApprove={handleApprove}
            onReject={handleRejectOpen}
          />
        ) : (
          <HistoryTable rows={history} />
        )}
      </div>

      {rejectModal && (
        <>
          <div className="drawer-scrim" onClick={handleRejectClose} />
          <div className="drawer" style={{ maxWidth: 420 }}>
            <div className="drawer-head">
              <div>
                <div style={{ fontWeight: 600, fontSize: 15 }}>Rejeter la demande</div>
                <div className="cell-sub">Indiquez le motif de rejet</div>
              </div>
              <button className="btn ghost sm" onClick={handleRejectClose}>
                <I.Plus size={14} style={{ transform: 'rotate(45deg)' }} />
              </button>
            </div>
            <div className="drawer-body">
              <div className="field">
                <label className="field-label">Motif *</label>
                <textarea
                  className="input"
                  rows={4}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Ex : Pièces justificatives insuffisantes…"
                />
              </div>
              {/* Error shown inside modal to preserve the user's typed reason */}
              {actionError && (
                <div
                  style={{
                    marginTop: 10,
                    padding: '8px 12px',
                    background: 'oklch(0.97 0.02 20)',
                    border: '1px solid oklch(0.88 0.06 20)',
                    borderRadius: 6,
                    fontSize: 12,
                    color: 'var(--neg)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <I.Shield size={13} />
                  {actionError}
                </div>
              )}
            </div>
            <div className="drawer-foot">
              <button
                className="btn brand"
                style={{ background: 'var(--neg)' }}
                disabled={!rejectReason.trim() || rejectLoading}
                onClick={handleRejectConfirm}
              >
                {rejectLoading ? (
                  '…'
                ) : (
                  <>
                    <I.Check size={14} stroke="white" />
                    Confirmer le rejet
                  </>
                )}
              </button>
              <button className="btn" onClick={handleRejectClose} disabled={rejectLoading}>
                Annuler
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function PendingTable({ rows, canApprove, fraudError, loadingId, onApprove, onReject }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        variant="celebration"
        emoji="✅"
        eyebrow="File vide"
        eyebrowColor="var(--pos)"
        title="Tout est traité"
        description="Aucun décaissement en attente de validation. Revenez plus tard ou attendez une nouvelle demande."
        celebrationStyle={{
          background:
            'linear-gradient(135deg, var(--tofee-success-bg, oklch(0.96 0.04 155)), oklch(0.96 0.03 155))',
        }}
      />
    )
  }
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Référence</th>
            <th>Méthode</th>
            <th style={{ textAlign: 'right' }}>Montant</th>
            <th>Date</th>
            <th>Statut</th>
            {canApprove && <th style={{ width: 180 }}>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {rows.map((d) => {
            const method = METHOD_META[d.payoutMethod] ?? { label: d.payoutMethod, icon: 'Coin' }
            const MIc = I[method.icon]
            const sm = STATUS_META[d.status]
            const isFraud = fraudError === d._id
            const isInFlight = loadingId === d._id
            return (
              <Fragment key={d._id}>
                <tr>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span className="prod-glyph" style={{ background: 'var(--brand)' }}>
                        <I.Coin size={13} stroke="white" />
                      </span>
                      <div>
                        <div style={{ fontWeight: 550 }}>{d.customerId}</div>
                        <div className="cell-sub" style={{ fontFamily: 'var(--font-mono)' }}>
                          {d._id.slice(-8)}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td>
                    <span
                      className="chip"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                    >
                      <MIc size={11} />
                      {method.label}
                    </span>
                  </td>
                  <td
                    style={{
                      textAlign: 'right',
                      fontVariantNumeric: 'tabular-nums',
                      fontWeight: 550,
                    }}
                  >
                    {fmt(d.amount)}
                    <span className="cell-sub" style={{ marginLeft: 4 }}>
                      FCFA
                    </span>
                  </td>
                  <td style={{ color: 'var(--ink-2)', fontSize: 12 }}>{fmtDate(d.timestamp)}</td>
                  <td>
                    <span className={'tag ' + sm.class}>{sm.label}</span>
                  </td>
                  {canApprove && (
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          className="btn sm brand"
                          disabled={isInFlight || !!loadingId}
                          onClick={() => onApprove(d._id)}
                        >
                          {isInFlight ? (
                            '…'
                          ) : (
                            <>
                              <I.Check size={12} stroke="white" />
                              Approuver
                            </>
                          )}
                        </button>
                        <button
                          className="btn sm ghost"
                          style={{ color: 'var(--neg)' }}
                          disabled={isInFlight || !!loadingId}
                          onClick={() => onReject(d._id)}
                        >
                          Rejeter
                        </button>
                      </div>
                    </td>
                  )}
                </tr>
                {isFraud && (
                  <tr>
                    <td colSpan={canApprove ? 6 : 5} style={{ padding: '0 16px 10px' }}>
                      <div
                        style={{
                          background: 'oklch(0.97 0.02 20)',
                          border: '1px solid oklch(0.88 0.06 20)',
                          borderRadius: 6,
                          padding: '8px 12px',
                          fontSize: 12,
                          color: 'var(--neg)',
                          fontWeight: 500,
                          display: 'flex',
                          alignItems: 'center',
                          gap: 6,
                        }}
                      >
                        <I.Shield size={13} />
                        Prévention fraude : vous ne pouvez pas approuver votre propre demande.
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function HistoryTable({ rows }) {
  if (rows.length === 0) {
    return (
      <EmptyState
        illustration={<DisbursementIllustration />}
        title="Aucun historique"
        description="Les décaissements approuvés ou rejetés apparaîtront ici une fois traités."
      />
    )
  }
  return (
    <div className="table-wrap">
      <table className="data-table">
        <thead>
          <tr>
            <th>Référence</th>
            <th>Méthode</th>
            <th style={{ textAlign: 'right' }}>Montant</th>
            <th>Date</th>
            <th>Statut</th>
            <th>Détail</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((d) => {
            const method = METHOD_META[d.payoutMethod] ?? { label: d.payoutMethod, icon: 'Coin' }
            const MIc = I[method.icon]
            const sm = STATUS_META[d.status] ?? { label: d.status, class: '' }
            // Backend stores reason in transactionId as workaround until schema adds rejectionReason
            const rejectionReason = d.reason ?? d.rejectionReason ?? d.transactionId
            return (
              <tr key={d._id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span className="prod-glyph" style={{ background: 'var(--ink-3)' }}>
                      <I.Coin size={13} stroke="white" />
                    </span>
                    <div>
                      <div style={{ fontWeight: 550 }}>{d.customerId}</div>
                      <div className="cell-sub" style={{ fontFamily: 'var(--font-mono)' }}>
                        {d._id.slice(-8)}
                      </div>
                    </div>
                  </div>
                </td>
                <td>
                  <span
                    className="chip"
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}
                  >
                    <MIc size={11} />
                    {method.label}
                  </span>
                </td>
                <td
                  style={{
                    textAlign: 'right',
                    fontVariantNumeric: 'tabular-nums',
                    fontWeight: 550,
                  }}
                >
                  {fmt(d.amount)}
                  <span className="cell-sub" style={{ marginLeft: 4 }}>
                    FCFA
                  </span>
                </td>
                <td style={{ color: 'var(--ink-2)', fontSize: 12 }}>{fmtDate(d.timestamp)}</td>
                <td>
                  <span className={'tag ' + sm.class}>{sm.label}</span>
                </td>
                <td style={{ fontSize: 12, maxWidth: 220 }}>
                  {d.status === 'rejected' ? (
                    <span style={{ color: 'var(--neg)' }}>
                      {rejectionReason || 'Motif non renseigné'}
                    </span>
                  ) : d.approvedBy ? (
                    <span style={{ color: 'var(--ink-2)' }}>
                      Approuvé · {String(d.approvedBy).slice(-6)}
                    </span>
                  ) : (
                    <span style={{ color: 'var(--ink-3)' }}>—</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
