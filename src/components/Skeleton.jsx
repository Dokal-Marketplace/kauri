// Primitive — a single shimmer block
export function Skel({ w, h = 14, r, className = '', style }) {
  return (
    <span
      className={
        'skel' +
        (r === 'pill' ? ' skel-pill' : r === 'circle' ? ' skel-circle' : '') +
        (className ? ' ' + className : '')
      }
      style={{ width: w, height: h, ...style }}
    />
  )
}

// ── KPI card skeleton ────────────────────────────────────────────────────────
export function SkeletonKpi() {
  return (
    <div className="kpi">
      <div className="kpi-label">
        <Skel w={90} h={12} r="pill" />
      </div>
      <div className="kpi-value" style={{ marginTop: 10 }}>
        <Skel w={120} h={28} />
      </div>
      <div className="kpi-foot" style={{ marginTop: 12 }}>
        <Skel w={48} h={18} r="pill" />
        <Skel w={80} h={12} r="pill" />
      </div>
    </div>
  )
}

// Four KPI tiles in a row
export function SkeletonKpiRow() {
  return (
    <section className="kpi-row">
      <SkeletonKpi />
      <SkeletonKpi />
      <SkeletonKpi />
      <SkeletonKpi />
    </section>
  )
}

// ── Generic card shell skeleton ──────────────────────────────────────────────
export function SkeletonCard({ rows = 4, style }) {
  return (
    <div className="card" style={style}>
      <div className="card-head">
        <Skel w={130} h={16} />
        <Skel w={60} h={12} r="pill" style={{ marginLeft: 'auto' }} />
      </div>
      <div style={{ padding: '4px 18px 18px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Skel w={28} h={28} r="circle" />
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
              <Skel w={`${55 + (i % 3) * 15}%`} h={13} />
              <Skel w={`${35 + (i % 2) * 10}%`} h={11} r="pill" />
            </div>
            <Skel w={56} h={13} r="pill" />
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Table rows skeleton ───────────────────────────────────────────────────────
// colWidths: array of pixel widths or percentages for each column
function SkeletonTableRow({ colWidths }) {
  return (
    <tr className="skel-row">
      {colWidths.map((w, i) => (
        <td key={i}>
          {i === 0 ? (
            <Skel w={14} h={14} />
          ) : i === 1 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <Skel w={26} h={26} r="circle" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <Skel w={90} h={13} />
                <Skel w={68} h={11} r="pill" />
              </div>
            </div>
          ) : (
            <Skel w={w} h={13} r={i === colWidths.length - 2 ? 'pill' : undefined} />
          )}
        </td>
      ))}
    </tr>
  )
}

export function SkeletonTableRows({ cols, rows = 8 }) {
  return (
    <>
      {Array.from({ length: rows }).map((_, i) => (
        <SkeletonTableRow key={i} colWidths={cols} />
      ))}
    </>
  )
}

// ── Dashboard shell skeleton ─────────────────────────────────────────────────
export function SkeletonDashboard() {
  return (
    <>
      {/* heading */}
      <div style={{ marginBottom: 6 }}>
        <Skel w={220} h={26} />
      </div>
      <div style={{ marginBottom: 20 }}>
        <Skel w={320} h={13} r="pill" />
      </div>

      {/* KPI row */}
      <SkeletonKpiRow />

      {/* two-col row */}
      <div className="row cols-2" style={{ marginBottom: 14 }}>
        <SkeletonCard rows={5} />
        <SkeletonCard rows={4} />
      </div>

      {/* two-col row */}
      <div className="row cols-2">
        <SkeletonCard rows={5} />
        <SkeletonCard rows={4} />
      </div>
    </>
  )
}

// ── Page table skeleton (card + filter bar + table) ──────────────────────────
export function SkeletonTablePage({ cols = 6, rows = 8 }) {
  // Accepts an array of column widths or a column count
  const colWidths = Array.isArray(cols) ? cols : Array.from({ length: cols }, () => 90)
  return (
    <div className="card" style={{ marginTop: 16 }}>
      {/* filter bar placeholder */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '14px 18px',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        <Skel w={200} h={32} />
        <Skel w={100} h={32} />
        <Skel w={80} h={32} style={{ marginLeft: 'auto' }} />
        <Skel w={80} h={32} />
      </div>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              {colWidths.map((w, i) => (
                <th key={i}>
                  <Skel w={i === 0 ? 14 : w * 0.6} h={10} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <SkeletonTableRows cols={colWidths} rows={rows} />
          </tbody>
        </table>
      </div>

      {/* footer */}
      <div className="table-foot">
        <Skel w={180} h={12} r="pill" />
        <div style={{ display: 'flex', gap: 4 }}>
          {[1, 2, 3].map((i) => (
            <Skel key={i} w={26} h={26} />
          ))}
        </div>
      </div>
    </div>
  )
}
