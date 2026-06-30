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

export default function FleetPage() {
  const { tenantId, isLoaded } = useCurrentUser()
  const [showAddDevice, setShowAddDevice] = useState(false)
  const [filterAssignment, setFilterAssignment] = useState('all') // all, assigned, unassigned
  const [filterBrand, setFilterBrand] = useState('all')
  const [filterStatus, setFilterStatus] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [menuOpenId, setMenuOpenId] = useState(null)
  const [detailDevice, setDetailDevice] = useState(null)

  // Fetch all devices for the branch
  const devices =
    useQuery(api.devices.listByBranch, isLoaded && tenantId ? { branchId: tenantId } : 'skip') ?? []

  // Fetch agents to display assigned agent names
  const agents =
    useQuery(api.agents.listByBranch, isLoaded && tenantId ? { branchId: tenantId } : 'skip') ?? []

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
      }
    })
  }, [devices, agents])

  // Get unique brands for filter
  const brands = useMemo(() => {
    const uniqueBrands = new Set(enrichedDevices.map((d) => d.brand).filter(Boolean))
    return ['all', ...Array.from(uniqueBrands)]
  }, [enrichedDevices])

  // Filter devices
  const filteredDevices = useMemo(() => {
    return enrichedDevices.filter((d) => {
      // Assignment filter
      if (filterAssignment === 'assigned' && !d.assignedTo) return false
      if (filterAssignment === 'unassigned' && d.assignedTo) return false

      // Brand filter
      if (filterBrand !== 'all' && d.brand !== filterBrand) return false

      // Status filter
      if (filterStatus !== 'all' && d.status !== filterStatus) return false

      // Search filter
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

  // Stats
  const totalDevices = enrichedDevices.length
  const assignedCount = enrichedDevices.filter((d) => d.assignedTo).length
  const unassignedCount = totalDevices - assignedCount
  const activeCount = enrichedDevices.filter((d) => d.status === 'active').length

  const handleAssign = async (deviceId, agentId) => {
    try {
      await assignDevice({ deviceId, agentId })
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
        <DeviceDetailModal device={detailDevice} onClose={() => setDetailDevice(null)} />
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
              {Math.round((assignedCount / totalDevices) * 100) || 0}%
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
                  <th>Marque</th>
                  <th>Modèle</th>
                  <th>Statut</th>
                  <th>Batterie</th>
                  <th>Dernière sync</th>
                  <th>Agent assigné</th>
                  <th>Localisation</th>
                  <th></th>
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
                      </td>
                      <td>
                        <div>{device.model}</div>
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
                          <div>
                            <div style={{ fontWeight: 500 }}>{device.agentName}</div>
                            <div className="cell-sub">{device.agentPhone}</div>
                          </div>
                        ) : (
                          <span style={{ color: 'var(--ink-3)', fontSize: 12 }}>Non assigné</span>
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
                            }}
                          >
                            📍 Voir sur carte
                          </a>
                        ) : (
                          <span style={{ color: 'var(--ink-3)', fontSize: 12 }}>—</span>
                        )}
                      </td>
                      <td style={{ position: 'relative' }}>
                        <button
                          className="btn ghost sm"
                          style={{ padding: 4 }}
                          onClick={() =>
                            setMenuOpenId(menuOpenId === device._id ? null : device._id)
                          }
                        >
                          <I.More size={14} />
                        </button>

                        {menuOpenId === device._id && (
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
                              minWidth: 180,
                              boxShadow: 'var(--shadow-md)',
                            }}
                          >
                            <button
                              className="dropdown-item"
                              onClick={() => {
                                setMenuOpenId(null)
                                setDetailDevice(device)
                              }}
                            >
                              Voir détails
                            </button>

                            {device.assignedTo ? (
                              <button
                                className="dropdown-item"
                                onClick={() => handleUnassign(device._id)}
                              >
                                Désassigner
                              </button>
                            ) : (
                              <AssignDeviceMenu
                                deviceId={device._id}
                                agents={agents.filter((a) => !a.device)}
                                onAssign={handleAssign}
                                onClose={() => setMenuOpenId(null)}
                              />
                            )}
                          </div>
                        )}
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

// Sub-menu pour assigner un TPE à un agent
function AssignDeviceMenu({ deviceId, agents, onAssign, onClose }) {
  const [showSubmenu, setShowSubmenu] = useState(false)

  if (agents.length === 0) {
    return (
      <button className="dropdown-item" disabled>
        Aucun agent disponible
      </button>
    )
  }

  return (
    <>
      <button className="dropdown-item" onClick={() => setShowSubmenu(!showSubmenu)}>
        Assigner à un agent ▸
      </button>

      {showSubmenu && (
        <div
          style={{
            position: 'absolute',
            right: '100%',
            top: 0,
            background: 'var(--surface)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: '4px 0',
            minWidth: 200,
            maxHeight: 300,
            overflowY: 'auto',
            boxShadow: 'var(--shadow-md)',
          }}
        >
          {agents.map((agent) => (
            <button
              key={agent._id}
              className="dropdown-item"
              onClick={() => {
                onAssign(deviceId, agent._id)
                onClose()
              }}
              style={{ textAlign: 'left' }}
            >
              <div style={{ fontWeight: 500 }}>{agent.fullName}</div>
              <div className="cell-sub">{agent.phoneNumber}</div>
            </button>
          ))}
        </div>
      )}
    </>
  )
}

// Modal de détails d'un TPE
function DeviceDetailModal({ device, onClose }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 100,
        background: 'rgba(0,0,0,0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: 'var(--surface)',
          borderRadius: 12,
          padding: 28,
          minWidth: 500,
          maxWidth: 600,
          boxShadow: 'var(--shadow-lg)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ fontWeight: 650, fontSize: 18, marginBottom: 4 }}>
          {device.brand} {device.model}
        </div>
        <div style={{ color: 'var(--ink-2)', fontSize: 13, marginBottom: 20 }}>
          {device.serialNumber}
        </div>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '12px 24px',
            fontSize: 13,
            marginBottom: 24,
          }}
        >
          <div>
            <span style={{ color: 'var(--ink-3)', fontSize: 11, textTransform: 'uppercase' }}>
              Statut
            </span>
            <br />
            <span style={{ fontWeight: 500 }}>{STATUS_TAGS[device.status]?.label || 'Actif'}</span>
          </div>

          <div>
            <span style={{ color: 'var(--ink-3)', fontSize: 11, textTransform: 'uppercase' }}>
              Batterie
            </span>
            <br />
            <Battery pct={device.batteryPct} />
          </div>

          <div>
            <span style={{ color: 'var(--ink-3)', fontSize: 11, textTransform: 'uppercase' }}>
              Dernière sync
            </span>
            <br />
            <span style={{ fontWeight: 500 }}>{formatLastSync(device.lastSync)}</span>
          </div>

          <div>
            <span style={{ color: 'var(--ink-3)', fontSize: 11, textTransform: 'uppercase' }}>
              Agent assigné
            </span>
            <br />
            <span style={{ fontWeight: 500 }}>{device.agentName || 'Non assigné'}</span>
            {device.agentPhone && <div className="cell-sub">{device.agentPhone}</div>}
          </div>

          {device.registrationLocation && (
            <div style={{ gridColumn: '1 / -1' }}>
              <span style={{ color: 'var(--ink-3)', fontSize: 11, textTransform: 'uppercase' }}>
                Localisation d'enregistrement
              </span>
              <br />
              <a
                href={`https://www.google.com/maps?q=${device.registrationLocation.latitude},${device.registrationLocation.longitude}`}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  color: 'var(--brand)',
                  textDecoration: 'none',
                  fontSize: 13,
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
          )}

          {device.registrationDate && (
            <div style={{ gridColumn: '1 / -1' }}>
              <span style={{ color: 'var(--ink-3)', fontSize: 11, textTransform: 'uppercase' }}>
                Date d'enregistrement
              </span>
              <br />
              <span style={{ fontWeight: 500 }}>
                {new Date(device.registrationDate).toLocaleDateString('fr-FR', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            </div>
          )}
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button className="btn" onClick={onClose}>
            Fermer
          </button>
        </div>
      </div>
    </div>
  )
}
