// src/pages/FleetPage.jsx
import { useState, useMemo } from 'react'
import { useQuery, useMutation } from 'convex/react'
import { api } from '../../convex/_generated/api'
import { useCurrentUser } from '../hooks/useCurrentUser'
import { I } from '../icons'
import { PageHeader } from '../components'
import { EmptyState } from '../components/EmptyState'
import { AddDeviceModal } from '../components/AddDeviceModal'
import { StaffIllustration } from '../components/Illustrations'

const STATUS_TAGS = {
  active: { label: 'Actif', bg: 'var(--green-1, #e6f9ed)', fg: 'var(--green-6, #16a34a)' },
  maintenance: {
    label: 'Maintenance',
    bg: 'var(--yellow-1, #fffbeb)',
    fg: 'var(--yellow-8, #92400e)',
  },
  lost: { label: 'Perdu', bg: 'var(--red-1, #fef2f2)', fg: 'var(--red-6, #dc2626)' },
}

function Battery({ pct }) {
  if (pct === null || pct === undefined)
    return <span style={{ color: 'var(--ink-3)', fontSize: 12 }}>—</span>

  const color = pct < 25 ? 'var(--neg)' : pct < 50 ? 'var(--warn)' : 'var(--pos)'
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <div
        style={{
          width: 24,
          height: 12,
          border: '1.5px solid var(--border-strong)',
          borderRadius: 2,
          position: 'relative',
          display: 'inline-block',
        }}
      >
        <div
          style={{
            position: 'absolute',
            left: 1,
            top: 1,
            bottom: 1,
            width: `calc(${pct}% - 2px)`,
            background: color,
            borderRadius: 1,
          }}
        />
        <div
          style={{
            position: 'absolute',
            right: -3,
            top: 3,
            bottom: 3,
            width: 2,
            background: 'var(--border-strong)',
            borderRadius: '0 1px 1px 0',
          }}
        />
      </div>
      <span style={{ fontSize: 12, color: 'var(--ink-2)', fontVariantNumeric: 'tabular-nums' }}>
        {pct}%
      </span>
    </div>
  )
}

function formatLastSync(ts) {
  if (!ts || ts === 0) return 'Jamais'
  const mins = Math.floor((Date.now() - ts) / 60000)
  if (mins < 1) return "À l'instant"
  if (mins < 60) return `Il y a ${mins} min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `Il y a ${hrs}h`
  const days = Math.floor(hrs / 24)
  return `Il y a ${days}j`
}

function AgentAvatar({ name, size = 28 }) {
  const initials = name
    ? name
        .trim()
        .split(/\s+/)
        .map((w) => w[0])
        .slice(0, 2)
        .join('')
        .toUpperCase()
    : '?'
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'var(--brand-softer)',
        color: 'var(--brand-ink)',
        display: 'grid',
        placeItems: 'center',
        fontSize: size * 0.4,
        fontWeight: 600,
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  )
}

export default function FleetPage() {
  const { tenantId, isLoaded } = useCurrentUser()
  const [showAddDevice, setShowAddDevice] = useState(false)
  const [filterAssignment, setFilterAssignment] = useState('all')
  const [filterBrand, setFilterBrand] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [menuOpenId, setMenuOpenId] = useState(null)
  const [detailDevice, setDetailDevice] = useState(null)
  const [assignDeviceTarget, setAssignDeviceTarget] = useState(null) // Device à assigner

  const devicesQuery = useQuery(
    api.devices.listByBranch,
    isLoaded && tenantId ? { branchId: tenantId } : 'skip'
  )
  const agentsQuery = useQuery(
    api.agents.listByBranch,
    isLoaded && tenantId ? { branchId: tenantId } : 'skip'
  )
  const devices = useMemo(() => devicesQuery ?? [], [devicesQuery])
  const agents = useMemo(() => agentsQuery ?? [], [agentsQuery])

  const assignDevice = useMutation(api.devices.assignDeviceToAgent)
  const unassignDevice = useMutation(api.devices.unassignDevice)

  // Enrich devices with agent info
  const enrichedDevices = useMemo(() => {
    return devices.map((device) => {
      const assignedAgent = device.assignedTo
        ? agents.find((a) => a._id === device.assignedTo)
        : null

      return {
        ...device,
        agentName: assignedAgent?.fullName ?? null,
        agentPhone: assignedAgent?.phoneNumber ?? null,
        agentRole: assignedAgent?.role ?? null,
      }
    })
  }, [devices, agents])

  // Agents disponibles pour assignation (sans device)
  const availableAgents = useMemo(() => {
    return agents.filter((a) => !a.device)
  }, [agents])

  const brands = useMemo(() => {
    const uniqueBrands = new Set(enrichedDevices.map((d) => d.brand).filter(Boolean))
    return ['all', ...Array.from(uniqueBrands)]
  }, [enrichedDevices])

  const filteredDevices = useMemo(() => {
    return enrichedDevices.filter((d) => {
      if (filterAssignment === 'assigned' && !d.assignedTo) return false
      if (filterAssignment === 'unassigned' && d.assignedTo) return false
      if (filterBrand !== 'all' && d.brand !== filterBrand) return false
      if (filterStatus !== 'all' && d.status !== filterStatus) return false

      if (searchQuery) {
        const query = searchQuery.toLowerCase()
        const matchesSerial = d.serialNumber.toLowerCase().includes(query)
        const matchesModel = d.model.toLowerCase().includes(query)
        const matchesBrand = d.brand?.toLowerCase().includes(query)
        const matchesAgent = d.agentName?.toLowerCase().includes(query)
        if (!matchesSerial && !matchesModel && !matchesBrand && !matchesAgent) return false
      }

      return true
    })
  }, [enrichedDevices, filterAssignment, filterBrand, filterStatus, searchQuery])

  const totalDevices = enrichedDevices.length
  const assignedCount = enrichedDevices.filter((d) => d.assignedTo).length
  const unassignedCount = totalDevices - assignedCount
  const activeCount = enrichedDevices.filter((d) => d.status === 'active').length

  const handleAssign = async (deviceId, agentId) => {
    try {
      await assignDevice({ deviceId, agentId })
      setAssignDeviceTarget(null)
      setMenuOpenId(null)
    } catch (err) {
      alert(err.message || "Erreur lors de l'assignation")
    }
  }

  const handleUnassign = async (deviceId) => {
    if (!window.confirm('Êtes-vous sûr de vouloir désassigner ce TPE ?')) return
    try {
      await unassignDevice({ deviceId })
      setMenuOpenId(null)
    } catch (err) {
      alert(err.message || 'Erreur lors de la désassignation')
    }
  }

  return (
    <div className="fleet-page">
      <AddDeviceModal
        isOpen={showAddDevice}
        onClose={() => setShowAddDevice(false)}
        onSuccess={() => setShowAddDevice(false)}
      />

      {detailDevice && (
        <DeviceDetailModal
          device={detailDevice}
          onClose={() => setDetailDevice(null)}
          onAssign={() => {
            setAssignDeviceTarget(detailDevice)
            setDetailDevice(null)
          }}
          onUnassign={handleUnassign}
        />
      )}

      {assignDeviceTarget && (
        <AssignDeviceModal
          device={assignDeviceTarget}
          agents={availableAgents}
          onAssign={handleAssign}
          onClose={() => setAssignDeviceTarget(null)}
        />
      )}

      <PageHeader
        crumbs={['Admin', 'Flotte TPE']}
        title="Flotte TPE"
        sub={`${totalDevices} terminaux · ${assignedCount} assignés · ${activeCount} actifs`}
      />

      {/* Stats Cards */}
      <div className="kpi-row" style={{ marginBottom: 20 }}>
        <div className="kpi">
          <div className="kpi-label">
            <I.Terminal />
            Total TPE
          </div>
          <div className="kpi-value">{totalDevices}</div>
          <div className="kpi-foot">
            <span>Terminaux enregistrés</span>
          </div>
        </div>

        <div className="kpi">
          <div className="kpi-label">
            <I.Users />
            Assignés
          </div>
          <div className="kpi-value">{assignedCount}</div>
          <div className="kpi-foot">
            <span className="delta up">
              <I.ArrowUR size={10} stroke="currentColor" />
              {totalDevices > 0 ? Math.round((assignedCount / totalDevices) * 100) : 0}%
            </span>
            <span>Taux d'utilisation</span>
          </div>
        </div>

        <div className="kpi">
          <div className="kpi-label">
            <I.Cloud />
            Non assignés
          </div>
          <div className="kpi-value">{unassignedCount}</div>
          <div className="kpi-foot">
            <span>Disponibles pour assignation</span>
          </div>
        </div>

        <div className="kpi">
          <div className="kpi-label">
            <I.Check />
            Actifs
          </div>
          <div className="kpi-value">{activeCount}</div>
          <div className="kpi-foot">
            <span>En service</span>
          </div>
        </div>
      </div>

      {/* Filters & Actions */}
      <div className="card" style={{ marginBottom: 14 }}>
        <div className="card-head">
          <div className="card-title">Inventaire des terminaux</div>
          <div className="filter-spacer" />

          <div className="filter-group">
            <label className="filter-label">Assignation</label>
            <select
              className="filter-select"
              value={filterAssignment}
              onChange={(e) => setFilterAssignment(e.target.value)}
            >
              <option value="all">Tous</option>
              <option value="assigned">Assignés</option>
              <option value="unassigned">Non assignés</option>
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">Marque</label>
            <select
              className="filter-select"
              value={filterBrand}
              onChange={(e) => setFilterBrand(e.target.value)}
            >
              {brands.map((b) => (
                <option key={b} value={b}>
                  {b === 'all' ? 'Toutes' : b}
                </option>
              ))}
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">Statut</label>
            <select
              className="filter-select"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="all">Tous</option>
              <option value="active">Actif</option>
              <option value="maintenance">Maintenance</option>
              <option value="lost">Perdu</option>
            </select>
          </div>

          <div className="filter-group">
            <label className="filter-label">Recherche</label>
            <input
              className="filter-select"
              placeholder="N° série, modèle, agent..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ minWidth: 200 }}
            />
          </div>

          <button
            className="btn brand"
            onClick={() => setShowAddDevice(true)}
            style={{ marginLeft: 8 }}
          >
            <I.Plus size={14} stroke="white" />
            Ajouter un TPE
          </button>
        </div>

        <div className="table-wrap">
          {filteredDevices.length === 0 ? (
            <EmptyState
              illustration={<StaffIllustration />}
              title="Aucun TPE trouvé"
              description={
                totalDevices === 0
                  ? 'Commencez par ajouter votre premier terminal de paiement.'
                  : 'Aucun terminal ne correspond aux filtres sélectionnés.'
              }
              actions={
                totalDevices === 0 ? (
                  <button
                    className="btn brand"
                    style={{ marginTop: 4 }}
                    onClick={() => setShowAddDevice(true)}
                  >
                    <I.Plus size={13} stroke="white" />
                    Ajouter un TPE
                  </button>
                ) : undefined
              }
            />
          ) : (
            <table className="data-table">
              <thead>
                <tr>
                  <th>N° Série</th>
                  <th>Marque / Modèle</th>
                  <th>Statut</th>
                  <th>Batterie</th>
                  <th>Dernière sync</th>
                  <th>Agent assigné</th>
                  <th>Localisation</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredDevices.map((device) => {
                  const statusTag = STATUS_TAGS[device.status] || STATUS_TAGS.active

                  return (
                    <tr key={device._id}>
                      <td>
                        <div
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: 12,
                            fontWeight: 600,
                          }}
                        >
                          {device.serialNumber}
                        </div>
                      </td>
                      <td>
                        <div style={{ fontWeight: 500 }}>{device.brand || '—'}</div>
                        <div className="cell-sub">{device.model}</div>
                      </td>
                      <td>
                        <span
                          className="tag"
                          style={{
                            background: statusTag.bg,
                            color: statusTag.fg,
                            borderColor: 'transparent',
                          }}
                        >
                          {statusTag.label}
                        </span>
                      </td>
                      <td>
                        <Battery pct={device.batteryPct} />
                      </td>
                      <td>
                        <div style={{ fontSize: 12, color: 'var(--ink-2)' }}>
                          {formatLastSync(device.lastSync)}
                        </div>
                      </td>
                      <td>
                        {device.agentName ? (
                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: 8,
                            }}
                          >
                            <AgentAvatar name={device.agentName} size={28} />
                            <div style={{ minWidth: 0 }}>
                              <div
                                style={{
                                  fontWeight: 500,
                                  fontSize: 13,
                                  whiteSpace: 'nowrap',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                }}
                              >
                                {device.agentName}
                              </div>
                              <div className="cell-sub">{device.agentPhone}</div>
                            </div>
                          </div>
                        ) : (
                          <button
                            className="btn ghost sm"
                            onClick={() => setAssignDeviceTarget(device)}
                            style={{
                              fontSize: 12,
                              padding: '6px 10px',
                              color: 'var(--brand)',
                              border: '1px dashed var(--brand-soft)',
                            }}
                          >
                            <I.Plus size={12} />
                            Assigner
                          </button>
                        )}
                      </td>
                      <td>
                        {device.registrationLocation ? (
                          <a
                            href={`https://www.google.com/maps?q=${device.registrationLocation.latitude},${device.registrationLocation.longitude}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{
                              fontSize: 12,
                              color: 'var(--brand)',
                              textDecoration: 'none',
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            📍 Voir
                          </a>
                        ) : (
                          <span style={{ color: 'var(--ink-3)', fontSize: 12 }}>—</span>
                        )}
                      </td>
                      <td style={{ textAlign: 'right' }}>
                        <div
                          style={{
                            display: 'inline-flex',
                            gap: 4,
                            alignItems: 'center',
                          }}
                        >
                          <button
                            className="btn ghost sm"
                            onClick={() => setDetailDevice(device)}
                            title="Voir détails"
                            style={{ padding: 6 }}
                          >
                            <I.Search size={14} />
                          </button>
                          <div style={{ position: 'relative', display: 'inline-block' }}>
                            <button
                              className="btn ghost sm"
                              style={{ padding: 6 }}
                              onClick={() =>
                                setMenuOpenId(menuOpenId === device._id ? null : device._id)
                              }
                              title="Plus d'actions"
                            >
                              <I.More size={14} />
                            </button>

                            {menuOpenId === device._id && (
                              <>
                                <div
                                  style={{
                                    position: 'fixed',
                                    inset: 0,
                                    zIndex: 9,
                                  }}
                                  onClick={() => setMenuOpenId(null)}
                                />
                                <div
                                  style={{
                                    position: 'absolute',
                                    right: 0,
                                    top: '100%',
                                    zIndex: 10,
                                    background: 'var(--surface)',
                                    border: '1px solid var(--border)',
                                    borderRadius: 8,
                                    padding: '4px 0',
                                    minWidth: 200,
                                    boxShadow: 'var(--shadow-md)',
                                    marginTop: 4,
                                  }}
                                >
                                  <button
                                    className="dropdown-item"
                                    onClick={() => {
                                      setMenuOpenId(null)
                                      setDetailDevice(device)
                                    }}
                                    style={{
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: 8,
                                      width: '100%',
                                      textAlign: 'left',
                                    }}
                                  >
                                    <I.Search size={14} />
                                    Voir les détails
                                  </button>

                                  {device.assignedTo ? (
                                    <>
                                      <button
                                        className="dropdown-item"
                                        onClick={() => {
                                          setMenuOpenId(null)
                                          setAssignDeviceTarget(device)
                                        }}
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: 8,
                                          width: '100%',
                                          textAlign: 'left',
                                        }}
                                      >
                                        <I.Edit size={14} />
                                        Changer d'agent
                                      </button>
                                      <button
                                        className="dropdown-item"
                                        onClick={() => handleUnassign(device._id)}
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: 8,
                                          width: '100%',
                                          textAlign: 'left',
                                          color: 'var(--red-6)',
                                        }}
                                      >
                                        <I.Close size={14} />
                                        Désassigner
                                      </button>
                                    </>
                                  ) : (
                                    <button
                                      className="dropdown-item"
                                      onClick={() => {
                                        setMenuOpenId(null)
                                        setAssignDeviceTarget(device)
                                      }}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 8,
                                        width: '100%',
                                        textAlign: 'left',
                                        color: 'var(--brand)',
                                        fontWeight: 500,
                                      }}
                                    >
                                      <I.Users size={14} />
                                      Assigner à un agent
                                    </button>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── Modal d'assignation ─────────────────────────────────────────────────────
function AssignDeviceModal({ device, agents, onAssign, onClose }) {
  const [selectedAgentId, setSelectedAgentId] = useState('')
  const [search, setSearch] = useState('')

  const filteredAgents = useMemo(() => {
    if (!search.trim()) return agents
    const q = search.toLowerCase()
    return agents.filter(
      (a) =>
        a.fullName.toLowerCase().includes(q) ||
        a.phoneNumber.includes(q) ||
        a.email?.toLowerCase().includes(q)
    )
  }, [agents, search])

  const handleAssign = () => {
    if (!selectedAgentId) return
    onAssign(device._id, selectedAgentId)
  }

  return (
    <>
      <div className="modal-scrim" onClick={onClose} />
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        style={{ minWidth: 500, maxWidth: 600 }}
      >
        <div className="modal-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                background: 'var(--brand-softer)',
                display: 'grid',
                placeItems: 'center',
                color: 'var(--brand-ink)',
              }}
            >
              <I.Users size={18} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Assigner un agent</h2>
              <div style={{ fontSize: 12, color: 'var(--ink-3)', marginTop: 2 }}>
                TPE :{' '}
                <strong style={{ fontFamily: 'var(--font-mono)' }}>{device.serialNumber}</strong>
                {' · '}
                {device.model}
              </div>
            </div>
          </div>
          <button
            className="btn ghost sm"
            onClick={onClose}
            aria-label="Fermer"
            style={{ padding: 6 }}
          >
            ✕
          </button>
        </div>

        <div className="modal-body">
          {agents.length === 0 ? (
            <div
              style={{
                padding: 32,
                textAlign: 'center',
                color: 'var(--ink-3)',
                fontSize: 13,
              }}
            >
              <I.Users size={32} style={{ opacity: 0.3, marginBottom: 12 }} />
              <div style={{ fontWeight: 500, marginBottom: 4 }}>Aucun agent disponible</div>
              <div style={{ fontSize: 12 }}>
                Tous les agents ont déjà un TPE assigné ou aucun agent n'existe dans cette agence.
              </div>
            </div>
          ) : (
            <>
              {/* Recherche */}
              <div className="search" style={{ marginBottom: 12, width: '100%' }}>
                <I.Search size={14} />
                <input
                  placeholder="Rechercher un agent..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  autoFocus
                />
              </div>

              {/* Liste des agents */}
              <div
                style={{
                  maxHeight: 320,
                  overflowY: 'auto',
                  border: '1px solid var(--border)',
                  borderRadius: 8,
                }}
              >
                {filteredAgents.length === 0 ? (
                  <div
                    style={{
                      padding: 24,
                      textAlign: 'center',
                      color: 'var(--ink-3)',
                      fontSize: 13,
                    }}
                  >
                    Aucun agent ne correspond à votre recherche.
                  </div>
                ) : (
                  filteredAgents.map((agent) => (
                    <button
                      key={agent._id}
                      onClick={() => setSelectedAgentId(agent._id)}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 12,
                        padding: '12px 14px',
                        background:
                          selectedAgentId === agent._id ? 'var(--brand-softer)' : 'transparent',
                        border: 'none',
                        borderBottom: '1px solid var(--border-subtle, var(--border))',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => {
                        if (selectedAgentId !== agent._id) {
                          e.currentTarget.style.background = 'var(--surface-inset)'
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedAgentId !== agent._id) {
                          e.currentTarget.style.background = 'transparent'
                        }
                      }}
                    >
                      <AgentAvatar name={agent.fullName} size={36} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontWeight: 500, fontSize: 13, color: 'var(--ink)' }}>
                          {agent.fullName}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: 'var(--ink-3)',
                            display: 'flex',
                            gap: 8,
                            flexWrap: 'wrap',
                          }}
                        >
                          <span>📱 {agent.phoneNumber}</span>
                          {agent.email && <span>· ✉️ {agent.email}</span>}
                        </div>
                      </div>
                      {selectedAgentId === agent._id && (
                        <div
                          style={{
                            width: 20,
                            height: 20,
                            borderRadius: '50%',
                            background: 'var(--brand)',
                            display: 'grid',
                            placeItems: 'center',
                          }}
                        >
                          <I.Check size={12} stroke="white" />
                        </div>
                      )}
                    </button>
                  ))
                )}
              </div>

              {/* Actions */}
              <div
                style={{
                  display: 'flex',
                  gap: 8,
                  justifyContent: 'flex-end',
                  marginTop: 16,
                }}
              >
                <button type="button" className="btn" onClick={onClose}>
                  Annuler
                </button>
                <button
                  type="button"
                  className="btn brand"
                  onClick={handleAssign}
                  disabled={!selectedAgentId}
                >
                  <I.Check size={14} />
                  Assigner
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  )
}

// ─── Modal de détails ────────────────────────────────────────────────────────
function DeviceDetailModal({ device, onClose, onAssign, onUnassign }) {
  return (
    <>
      <div className="modal-scrim" onClick={onClose} />
      <div
        className="modal"
        role="dialog"
        aria-modal="true"
        style={{ minWidth: 500, maxWidth: 600 }}
      >
        <div className="modal-head">
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 44,
                height: 44,
                borderRadius: 10,
                background: 'var(--brand-softer)',
                display: 'grid',
                placeItems: 'center',
                color: 'var(--brand-ink)',
              }}
            >
              <I.Terminal size={22} />
            </div>
            <div>
              <h2 style={{ margin: 0, fontSize: 16, fontWeight: 600 }}>
                {device.brand} {device.model}
              </h2>
              <div
                style={{
                  color: 'var(--ink-2)',
                  fontSize: 12,
                  fontFamily: 'var(--font-mono)',
                  marginTop: 2,
                }}
              >
                {device.serialNumber}
              </div>
            </div>
          </div>
          <button
            className="btn ghost sm"
            onClick={onClose}
            aria-label="Fermer"
            style={{ padding: 6 }}
          >
            ✕
          </button>
        </div>

        <div className="modal-body">
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '12px 24px',
              fontSize: 13,
              marginBottom: 20,
            }}
          >
            <div>
              <span style={{ color: 'var(--ink-3)', fontSize: 11, textTransform: 'uppercase' }}>
                Statut
              </span>
              <div style={{ marginTop: 4 }}>
                <span
                  className="tag"
                  style={{
                    background: STATUS_TAGS[device.status]?.bg,
                    color: STATUS_TAGS[device.status]?.fg,
                    borderColor: 'transparent',
                  }}
                >
                  {STATUS_TAGS[device.status]?.label || 'Actif'}
                </span>
              </div>
            </div>

            <div>
              <span style={{ color: 'var(--ink-3)', fontSize: 11, textTransform: 'uppercase' }}>
                Batterie
              </span>
              <div style={{ marginTop: 6 }}>
                <Battery pct={device.batteryPct} />
              </div>
            </div>

            <div>
              <span style={{ color: 'var(--ink-3)', fontSize: 11, textTransform: 'uppercase' }}>
                Dernière sync
              </span>
              <div style={{ fontWeight: 500, marginTop: 4 }}>{formatLastSync(device.lastSync)}</div>
            </div>

            <div>
              <span style={{ color: 'var(--ink-3)', fontSize: 11, textTransform: 'uppercase' }}>
                Agent assigné
              </span>
              <div style={{ marginTop: 4 }}>
                {device.agentName ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <AgentAvatar name={device.agentName} size={24} />
                    <div>
                      <div style={{ fontWeight: 500, fontSize: 13 }}>{device.agentName}</div>
                      {device.agentPhone && (
                        <div className="cell-sub" style={{ fontSize: 11 }}>
                          {device.agentPhone}
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <span style={{ color: 'var(--ink-3)', fontSize: 12 }}>Non assigné</span>
                )}
              </div>
            </div>

            {device.registrationLocation && (
              <div style={{ gridColumn: '1 / -1' }}>
                <span style={{ color: 'var(--ink-3)', fontSize: 11, textTransform: 'uppercase' }}>
                  Localisation d'enregistrement
                </span>
                <div style={{ marginTop: 4 }}>
                  <a
                    href={`https://www.google.com/maps?q=${device.registrationLocation.latitude},${device.registrationLocation.longitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: 'var(--brand)',
                      textDecoration: 'none',
                      fontSize: 13,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4,
                    }}
                  >
                    📍 {device.registrationLocation.latitude.toFixed(4)},{' '}
                    {device.registrationLocation.longitude.toFixed(4)}
                    {device.registrationLocation.accuracy && (
                      <span style={{ color: 'var(--ink-3)', fontSize: 11 }}>
                        {' '}
                        (±{Math.round(device.registrationLocation.accuracy)}m)
                      </span>
                    )}
                  </a>
                </div>
              </div>
            )}

            {device.registrationDate && (
              <div style={{ gridColumn: '1 / -1' }}>
                <span style={{ color: 'var(--ink-3)', fontSize: 11, textTransform: 'uppercase' }}>
                  Date d'enregistrement
                </span>
                <div style={{ fontWeight: 500, marginTop: 4 }}>
                  {new Date(device.registrationDate).toLocaleDateString('fr-FR', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div
            style={{
              display: 'flex',
              gap: 8,
              justifyContent: 'flex-end',
              paddingTop: 16,
              borderTop: '1px solid var(--border)',
            }}
          >
            {device.assignedTo ? (
              <button
                type="button"
                className="btn"
                onClick={() => onUnassign(device._id)}
                style={{ color: 'var(--red-6)' }}
              >
                <I.Close size={14} />
                Désassigner
              </button>
            ) : (
              <button type="button" className="btn brand" onClick={onAssign}>
                <I.Users size={14} />
                Assigner un agent
              </button>
            )}
            <button type="button" className="btn" onClick={onClose}>
              Fermer
            </button>
          </div>
        </div>
      </div>
    </>
  )
}
