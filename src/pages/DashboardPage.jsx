//pages/DashboardPage.jsx
import { useQuery } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useState } from 'react'
import { Topbar, QuickActionsCard } from '../components'
import Novu from '../components/Inbox'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { SkeletonDashboard } from '../components/Skeleton'

// ─── Skeleton primitives ─────────────────────────────────────────────────────

function Bone({ w = '100%', h = 16, radius = 6, style = {} }) {
  return (
    <div
      className="skeleton-bone"
      style={{ width: w, height: h, borderRadius: radius, ...style }}
    />
  )
}

function KpiSkeleton() {
  return (
    <div className="kpi-card skeleton-card">
      <Bone w="60%" h={12} style={{ marginBottom: 12 }} />
      <Bone w="45%" h={28} style={{ marginBottom: 8 }} />
      <Bone w="30%" h={10} />
    </div>
  )
}

function CardSkeleton({ rows = 4 }) {
  return (
    <div className="card skeleton-card" style={{ padding: 20 }}>
      <Bone w="40%" h={14} style={{ marginBottom: 18 }} />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} style={{ display: 'flex', gap: 10, marginBottom: 14, alignItems: 'center' }}>
          <Bone w={36} h={36} radius={18} style={{ flexShrink: 0 }} />
          <div style={{ flex: 1 }}>
            <Bone w="55%" h={12} style={{ marginBottom: 6 }} />
            <Bone w="35%" h={10} />
          </div>
          <Bone w={60} h={12} />
        </div>
      ))}
    </div>
  )
}

function ChartSkeleton() {
  return (
    <div className="card skeleton-card" style={{ padding: 20, height: 220 }}>
      <Bone w="35%" h={14} style={{ marginBottom: 20 }} />
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 140 }}>
        {Array.from({ length: 12 }).map((_, i) => (
          <Bone
            key={i}
            w="100%"
            h={`${30 + Math.random() * 70}%`}
            radius={4}
            style={{ flex: 1 }}
          />
        ))}
      </div>
    </div>
  )
}

function DashboardSkeleton() {
  return (
    <>
      <div className="kpi-row">
        {Array.from({ length: 5 }).map((_, i) => <KpiSkeleton key={i} />)}
      </div>
      <div className="row cols-2" style={{ marginBottom: 14 }}>
        <ChartSkeleton />
        <QuickActionsCard />
      </div>
      <div className="row cols-2">
        <CardSkeleton rows={5} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <CardSkeleton rows={4} />
        </div>
      </div>
    </>
  )
}

// ─── KPI card ────────────────────────────────────────────────────────────────

function KPI({ label, value, sub, icon, trend }) {
  const trendPositive = trend > 0
  return (
    <div className="kpi-card">
      <div className="kpi-icon">{icon}</div>
      <div className="kpi-label">{label}</div>
      <div className="kpi-value">{value}</div>
      {sub && <div className="kpi-sub">{sub}</div>}
      {trend !== undefined && (
        <div className={`kpi-trend ${trendPositive ? 'up' : 'down'}`}>
          {trendPositive ? '↑' : '↓'} {Math.abs(trend)}%
        </div>
      )}
    </div>
  )
}

// ─── Volume chart (pure CSS bars) ────────────────────────────────────────────

function VolumeChart({ data }) {
  const maxVal = Math.max(...data.map(d => Math.max(d.in, d.out)), 1)

  return (
    <div className="card" style={{ padding: 20 }}>
      <div className="card-title">Volume mensuel</div>
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, height: 140, marginTop: 12 }}>
        {data.map(d => (
          <div key={d.m} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <div style={{ width: '100%', display: 'flex', alignItems: 'flex-end', gap: 2, height: 120 }}>
              <div
                className="bar-in"
                style={{ flex: 1, height: `${(d.in / maxVal) * 100}%`, borderRadius: '3px 3px 0 0' }}
                title={`Dépôts: ${fmt(d.in)}`}
              />
              <div
                className="bar-out"
                style={{ flex: 1, height: `${(d.out / maxVal) * 100}%`, borderRadius: '3px 3px 0 0' }}
                title={`Retraits: ${fmt(d.out)}`}
              />
            </div>
            <div style={{ fontSize: 9, color: 'var(--ink-3)', textAlign: 'center' }}>{d.label}</div>
          </div>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
        <span style={{ fontSize: 11, color: 'var(--ink-3)' }}><span className="legend-dot in" /> Dépôts</span>
        <span style={{ fontSize: 11, color: 'var(--ink-3)' }}><span className="legend-dot out" /> Retraits</span>
      </div>
    </div>
  )
}

// ─── Recent clients ───────────────────────────────────────────────────────────

function ClientsCard({ clients }) {
  return (
    <div className="card" style={{ padding: 20 }}>
      <div className="card-title">Derniers clients</div>
      {clients.map(c => (
        <div key={c.id} className="feed-row">
          <div className="avatar">{c.name?.[0] ?? '?'}</div>
          <div className="feed-info">
            <div className="feed-name">{c.name}</div>
            <div className="feed-sub">{c.phone ?? '—'}</div>
          </div>
          <div className="feed-amount">{fmt(c.balance)}</div>
          <div className={`badge badge-${c.status}`}>{c.status}</div>
        </div>
      ))}
    </div>
  )
}

// ─── Recent transactions ──────────────────────────────────────────────────────

function TransactionsCard({ tx }) {
  return (
    <div className="card" style={{ padding: 20 }}>
      <div className="card-title">Transactions récentes</div>
      {tx.map(t => (
        <div key={t._id} className="feed-row">
          <div className={`tx-icon tx-${t.type}`}>
            {t.type === 'deposit' ? '↓' : '↑'}
          </div>
          <div className="feed-info">
            <div className="feed-name">{t.customerName}</div>
            <div className="feed-sub">{new Date(t.timestamp).toLocaleDateString('fr-FR')}</div>
          </div>
          <div className={`feed-amount ${t.type}`}>{fmt(t.amount)}</div>
          <div className={`badge badge-${t.status}`}>{t.status}</div>
        </div>
      ))}
    </div>
  )
}

// ─── Activity feed ────────────────────────────────────────────────────────────

function ActivityFeed({ feed }) {
  return (
    <div className="card" style={{ padding: 20 }}>
      <div className="card-title">Activité récente</div>
      {feed.map(item => (
        <div key={item.id} className="feed-row">
          <div className={`tx-icon tx-${item.type}`}>
            {item.kind === 'reconciliation' ? '⚖' : item.type === 'deposit' ? '↓' : '↑'}
          </div>
          <div className="feed-info">
            <div className="feed-name">{item.customer}</div>
            <div className="feed-sub">
              {item.kind === 'reconciliation' ? 'Réconciliation' : item.type === 'deposit' ? 'Dépôt' : 'Retrait'}
              {item.ref ? ` · ${item.ref}` : ''}
            </div>
          </div>
          <div className="feed-amount">{fmt(item.amount)}</div>
          <div className="feed-time">{timeAgo(item.timestamp)}</div>
        </div>
      ))}
    </div>
  )
}

// ─── Savings goals ────────────────────────────────────────────────────────────

function GoalsCard({ goals }) {
  return (
    <div className="card" style={{ padding: 20 }}>
      <div className="card-title">Objectifs d'épargne</div>
      {goals.map(g => (
        <div key={g._id} style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
            <span>{g.name}</span>
            <span style={{ color: 'var(--ink-3)' }}>{g.pct ?? 0}%</span>
          </div>
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${Math.min(g.pct ?? 0, 100)}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n = 0) =>
  new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'XOF', maximumFractionDigits: 0 }).format(n)

function timeAgo(ts) {
  const diff = Date.now() - ts
  if (diff < 60_000)  return 'à l\'instant'
  if (diff < 3600_000) return `${Math.floor(diff / 60_000)} min`
  if (diff < 86400_000) return `${Math.floor(diff / 3600_000)} h`
  return `${Math.floor(diff / 86400_000)} j`
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const [online, setOnline] = useState(true)
  const { isLoaded, convexUser } = useCurrentUser()
  const branchId = convexUser?.branchId ?? null

  const summary = useQuery(
    api.dashboard.branchSummary,
    branchId ? { branchId } : 'skip'
  )

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
  })

  if (!isLoaded) {
    return (
      <>
        <Topbar online={online} setOnline={setOnline} inbox={<Novu />} />
        <SkeletonDashboard />
      </>
    )
  }

  return (
    <>
      <Topbar online={online} setOnline={setOnline} inbox={<Novu />} />

      {/* ── skeleton while loading ── */}
      {branchId && summary === undefined && <DashboardSkeleton />}

      {/* ── branch unavailable / no data ── */}
      {(!branchId || summary === null) && (
        <div className="card" style={{ padding: 32, textAlign: 'center', color: 'var(--ink-3)' }}>
          <div style={{ fontSize: 32, marginBottom: 12 }}>📭</div>
          <div style={{ fontWeight: 600, marginBottom: 4 }}>Données indisponibles</div>
          <div style={{ fontSize: 13 }}>
            Aucune donnée trouvée pour cette agence. Vérifiez votre contexte de branche ou réessayez.
          </div>
        </div>
      )}

      {/* ── live data ── */}
      {summary != null && (
        <>
          {/* KPIs */}
          <section className="kpi-row">
            <KPI
              label="Clients actifs"
              value={summary.activeClients.toLocaleString('fr-FR')}
              sub={`+${summary.newClients} ce mois`}
              icon="👥"
            />
            <KPI
              label="Épargne totale"
              value={fmt(summary.totalSavings)}
              sub="dépôts ce mois"
              icon="💰"
            />
            <KPI
              label="Retraits"
              value={fmt(summary.totalWithdrawals)}
              sub="ce mois"
              icon="📤"
            />
            <KPI
              label="Transactions en attente"
              value={summary.pendingTx}
              icon="⏳"
            />
          </section>

          {/* Volume chart + quick actions */}
          <div className="row cols-2" style={{ marginBottom: 14 }}>
            <VolumeChart data={summary.monthlyVolume} />
            <QuickActionsCard />
          </div>

          {/* Clients + transactions */}
          <div className="row cols-2" style={{ marginBottom: 14 }}>
            <ClientsCard clients={summary.recentClients} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <TransactionsCard tx={summary.recentTx} />
            </div>
          </div>

          {/* Goals + activity feed */}
          <div className="row cols-2">
            <GoalsCard goals={summary.topGoals} />
            <ActivityFeed feed={summary.activityFeed} />
          </div>
        </>
      )}

      {/*
        ── Skeleton animation styles (add to your global CSS or a <style> tag) ──
        .skeleton-bone {
          background: linear-gradient(90deg, var(--surface-2) 25%, var(--surface-3) 50%, var(--surface-2) 75%);
          background-size: 200% 100%;
          animation: shimmer 1.4s infinite;
        }
        @keyframes shimmer { from { background-position: 200% 0 } to { background-position: -200% 0 } }

        .bar-in  { background: var(--accent); opacity: 0.85; }
        .bar-out { background: var(--danger);  opacity: 0.75; }
        .legend-dot { display: inline-block; width: 8px; height: 8px; border-radius: 50%; margin-right: 4px; }
        .legend-dot.in  { background: var(--accent); }
        .legend-dot.out { background: var(--danger);  }

        .progress-track { height: 6px; background: var(--surface-2); border-radius: 3px; }
        .progress-fill  { height: 100%; background: var(--accent); border-radius: 3px; transition: width .4s; }

        .feed-row { display: flex; align-items: center; gap: 10px; padding: 8px 0; border-bottom: 1px solid var(--border); }
        .feed-row:last-child { border-bottom: none; }
        .avatar { width: 36px; height: 36px; border-radius: 50%; background: var(--surface-2); display: grid; place-items: center; font-weight: 600; font-size: 14px; flex-shrink: 0; }
        .feed-info { flex: 1; min-width: 0; }
        .feed-name { font-size: 13px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .feed-sub  { font-size: 11px; color: var(--ink-3); }
        .feed-amount { font-size: 13px; font-weight: 600; white-space: nowrap; }
        .feed-amount.deposit   { color: var(--success); }
        .feed-amount.withdrawal { color: var(--danger); }
        .feed-time { font-size: 11px; color: var(--ink-3); white-space: nowrap; }

        .tx-icon { width: 32px; height: 32px; border-radius: 50%; display: grid; place-items: center; font-size: 14px; flex-shrink: 0; }
        .tx-icon.tx-deposit    { background: color-mix(in srgb, var(--success) 15%, transparent); color: var(--success); }
        .tx-icon.tx-withdrawal { background: color-mix(in srgb, var(--danger)  15%, transparent); color: var(--danger);  }
        .tx-icon.tx-reconciliation { background: color-mix(in srgb, var(--accent) 15%, transparent); color: var(--accent); }

        .badge { font-size: 10px; padding: 2px 6px; border-radius: 10px; font-weight: 600; text-transform: uppercase; }
        .badge-verified { background: color-mix(in srgb, var(--success) 15%, transparent); color: var(--success); }
        .badge-pending  { background: color-mix(in srgb, var(--warning) 15%, transparent); color: var(--warning); }
        .badge-completed { background: color-mix(in srgb, var(--success) 15%, transparent); color: var(--success); }
        .badge-failed   { background: color-mix(in srgb, var(--danger)  15%, transparent); color: var(--danger);  }

        .card-title { font-size: 13px; font-weight: 600; color: var(--ink-2); margin-bottom: 4px; }
      */}
    </>
  )
}
