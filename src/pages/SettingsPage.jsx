// pages/SettingsPage.jsx
// Fix #76 — fully wired settings page
//
// Changes vs original:
// • isEditing flow: "Modifier" button sets isEditing(true); "Enregistrer" calls
//   handleSave() (Convex mutation stub); "Annuler" resets to savedValues.
// • All form inputs use value + onChange (no more defaultValue for editable fields).
// • Hard-coded no-op toggles (blockWithdrawals, autoExport) replaced with real state.
// • Branch table reads from `branches` state (would be api.branches.listByOrg in prod).
// • "Ajouter une agence" opens AddBranchModal wired to a create mutation.
// • "⋯" per-branch opens a BranchActionsMenu.
// • "Déployer" shows a ConfirmDeployDialog before acting.
// • Billing plan / payment are driven by state; all three billing buttons have handlers.
// • Each integration row has real state; "Configurer" opens CredentialsDrawer;
//   "Connecter" launches an auth flow stub.

import { useState } from 'react'
import { I } from '../icons'
import { PageHeader } from '../components'
import Novu from '../components/Inbox'

// ---------------------------------------------------------------------------
// Tiny primitives (unchanged API, same look)
// ---------------------------------------------------------------------------

function SetCard({ title, sub, children }) {
  return (
    <div className="card">
      <div
        className="card-head"
        style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 2 }}
      >
        <div className="card-title">{title}</div>
        {sub && <div className="card-sub">{sub}</div>}
      </div>
      <div className="set-body">{children}</div>
    </div>
  )
}

function Field({ label, sub, children }) {
  return (
    <div className="field">
      <label className="field-label">
        {label}
        {sub && (
          <span className="cell-sub" style={{ fontWeight: 400, marginLeft: 6 }}>
            · {sub}
          </span>
        )}
      </label>
      {children}
    </div>
  )
}

function Toggle({ label, sub, value, onChange }) {
  return (
    <div className="toggle-row" onClick={() => onChange(!value)}>
      <div>
        <div style={{ fontWeight: 550, fontSize: 13 }}>{label}</div>
        {sub && <div className="cell-sub">{sub}</div>}
      </div>
      <span className={'switch ' + (value ? 'on' : '')}>
        <span className="knob" />
      </span>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Modal / Drawer shells (replace with your real modal system)
// ---------------------------------------------------------------------------

function Modal({ title, onClose, children }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div className="card" style={{ width: 420, maxWidth: '90vw', padding: 0 }}>
        <div className="card-head" style={{ justifyContent: 'space-between' }}>
          <div className="card-title">{title}</div>
          <button className="btn ghost sm" onClick={onClose}>
            <I.Close size={14} />
          </button>
        </div>
        <div style={{ padding: '0 20px 20px' }}>{children}</div>
      </div>
    </div>
  )
}

function Drawer({ title, onClose, children }) {
  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,.45)',
        display: 'flex',
        justifyContent: 'flex-end',
        zIndex: 1000,
      }}
    >
      <div
        className="card"
        style={{
          width: 380,
          height: '100%',
          borderRadius: '12px 0 0 12px',
          overflow: 'auto',
          padding: 0,
        }}
      >
        <div
          className="card-head"
          style={{
            justifyContent: 'space-between',
            position: 'sticky',
            top: 0,
            background: 'var(--surface)',
            zIndex: 1,
          }}
        >
          <div className="card-title">{title}</div>
          <button className="btn ghost sm" onClick={onClose}>
            <I.Close size={14} />
          </button>
        </div>
        <div style={{ padding: '0 20px 20px' }}>{children}</div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Confirm dialog
// ---------------------------------------------------------------------------

function ConfirmDialog({ message, confirmLabel = 'Confirmer', onConfirm, onCancel, loading }) {
  return (
    <Modal title="Confirmation" onClose={onCancel}>
      <p style={{ fontSize: 14, marginBottom: 20, color: 'var(--text-2)' }}>{message}</p>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="btn" onClick={onCancel} disabled={loading}>
          Annuler
        </button>
        <button className="btn brand" onClick={onConfirm} disabled={loading}>
          {loading ? 'En cours…' : confirmLabel}
        </button>
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Add branch modal
// ---------------------------------------------------------------------------

function AddBranchModal({ onClose, onAdd }) {
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [saving, setSaving] = useState(false)

  async function handleSubmit() {
    if (!name.trim() || !code.trim()) return
    setSaving(true)
    // TODO: replace with await api.branches.create({ name, code })
    await new Promise((r) => setTimeout(r, 600))
    onAdd({ id: Date.now(), n: name.trim(), c: code.trim().toUpperCase(), a: 0 })
    setSaving(false)
    onClose()
  }

  return (
    <Modal title="Ajouter une agence" onClose={onClose}>
      <Field label="Nom de l'agence">
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="ex. Ouagadougou Centre"
        />
      </Field>
      <Field label="Code">
        <input
          className="input"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="ex. OUA"
          maxLength={5}
          style={{ textTransform: 'uppercase' }}
        />
      </Field>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 8 }}>
        <button className="btn" onClick={onClose}>
          Annuler
        </button>
        <button className="btn brand" onClick={handleSubmit} disabled={saving || !name || !code}>
          {saving ? 'Enregistrement…' : 'Ajouter'}
        </button>
      </div>
    </Modal>
  )
}

// ---------------------------------------------------------------------------
// Branch actions menu (inline popover)
// ---------------------------------------------------------------------------

function BranchActionsMenu({ branch, onArchive, onClose }) {
  return (
    <div
      style={{
        position: 'absolute',
        right: 0,
        top: 28,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 8,
        boxShadow: '0 4px 16px rgba(0,0,0,.1)',
        zIndex: 100,
        minWidth: 160,
        padding: '4px 0',
      }}
    >
      <button
        className="btn ghost sm"
        style={{
          width: '100%',
          justifyContent: 'flex-start',
          borderRadius: 0,
          padding: '8px 14px',
        }}
        onClick={onClose}
      >
        Modifier
      </button>
      <button
        className="btn ghost sm"
        style={{
          width: '100%',
          justifyContent: 'flex-start',
          borderRadius: 0,
          padding: '8px 14px',
          color: 'var(--danger)',
        }}
        onClick={() => {
          onArchive(branch.c)
          onClose()
        }}
      >
        Archiver
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Integration credentials drawer
// ---------------------------------------------------------------------------

function CredentialsDrawer({ integration, onClose, onSave }) {
  const [key, setKey] = useState(integration.apiKey || '')
  const [webhookUrl, setWebhookUrl] = useState(integration.webhookUrl ?? '')
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    // TODO: await api.integrations.updateCredentials({ name: integration.n, apiKey: key })
    await new Promise((r) => setTimeout(r, 600))
    onSave({
      ...integration,
      apiKey: key,
      ...(integration.webhookUrl !== undefined && { webhookUrl }),
      dot: 'actif',
      s: 'Connecté',
    })
    setSaving(false)
    onClose()
  }

  return (
    <Drawer title={`Configurer · ${integration.n}`} onClose={onClose}>
      <p style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 16 }}>{integration.d}</p>
      <Field label="Clé API / Token">
        <input
          className="input"
          type="password"
          value={key}
          onChange={(e) => setKey(e.target.value)}
          placeholder="sk-…"
        />
      </Field>
      {integration.webhookUrl !== undefined && (
        <Field label="URL de webhook">
          <input
            className="input"
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            placeholder="https://votre-serveur.com/hook"
          />
        </Field>
      )}
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 16 }}>
        <button className="btn" onClick={onClose}>
          Annuler
        </button>
        <button className="btn brand" onClick={handleSave} disabled={saving || !key}>
          {saving ? 'Enregistrement…' : 'Enregistrer'}
        </button>
      </div>
    </Drawer>
  )
}

// ---------------------------------------------------------------------------
// Main page
// ---------------------------------------------------------------------------

export default function SettingsPage() {
  const [section, setSection] = useState('agence')
  const [online, setOnline] = useState(true)

  // ── isEditing flow ──────────────────────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)

  // ── Agence / identity fields (all controlled) ───────────────────────────
  const defaultIdentity = {
    orgName: 'Kauri Microfinance',
    agrement: 'MFI-BF-2024-0142',
    currency: 'FCFA (XOF)',
    timezone: 'GMT+0 · Ouagadougou',
  }
  const [identity, setIdentity] = useState(defaultIdentity)
  const [savedIdentity, setSavedIdentity] = useState(defaultIdentity)

  // ── Branches (would come from api.branches.listByOrg) ───────────────────
  const [branches, setBranches] = useState([
    { id: 1, n: 'Bobo-Dioulasso', c: 'BBO', a: 3 },
    { id: 2, n: 'Banfora', c: 'BNF', a: 2 },
    { id: 3, n: 'Hounde', c: 'HND', a: 1 },
  ])
  const [showAddBranch, setShowAddBranch] = useState(false)
  const [branchMenu, setBranchMenu] = useState(null) // branch code with open menu

  // ── TPE settings (all controlled) ───────────────────────────────────────
  const defaultTpe = {
    bgSync: true,
    offlineDays: 3,
    blockWithdrawals: true, // was hard-coded no-op
    maxDeposit: '500 000',
    maxWithdrawal: '200 000',
    maxTontine: '50 000',
  }
  const [tpe, setTpe] = useState(defaultTpe)
  const [savedTpe, setSavedTpe] = useState(defaultTpe)
  const [deployConfirm, setDeployConfirm] = useState(false)
  const [deploying, setDeploying] = useState(false)

  // ── Security (all controlled) ────────────────────────────────────────────
  const defaultSecurity = {
    twoFA: true,
    autoLock: 5,
    pinPolicy: '6 chiffres · rotation 90 j',
    logRetention: '36 mois',
    autoExport: true, // was hard-coded no-op
  }
  const [security, setSecurity] = useState(defaultSecurity)
  const [savedSecurity, setSavedSecurity] = useState(defaultSecurity)

  // ── Notifications ────────────────────────────────────────────────────────
  const defaultNotif = {
    deposit: true,
    withdraw: true,
    lowBattery: true,
    syncFail: true,
    weekly: false,
  }
  const [notif, setNotif] = useState(defaultNotif)
  const [savedNotif, setSavedNotif] = useState(defaultNotif)

  // ── Billing (state-driven, not hard-coded strings) ───────────────────────
  const [plan] = useState({
    name: 'Croissance',
    desc: "Jusqu'à 5 TPE · 200 clients par agent · sync illimitée",
    price: '240 000',
    renewal: '14 août 2026',
  })
  const [payment] = useState({ label: 'Mobile Money · Orange BF', masked: '+226 70 •• •• 22' })

  // ── Integrations (state-driven) ──────────────────────────────────────────
  const [integrations, setIntegrations] = useState([
    {
      id: 'orange',
      n: 'Orange Money',
      s: 'Connecté',
      dot: 'actif',
      d: 'Encaissements MoMo en temps réel',
    },
    {
      id: 'moov',
      n: 'Moov Africa',
      s: 'Connecté',
      dot: 'actif',
      d: 'Encaissements MoMo en temps réel',
    },
    { id: 'sms', n: 'SMS Gateway', s: 'Connecté', dot: 'actif', d: 'Confirmations client par SMS' },
    {
      id: 'sage',
      n: 'Comptabilité Sage',
      s: 'Non connecté',
      dot: 'archive',
      d: 'Export automatique du grand livre',
    },
    {
      id: 'webhook',
      n: 'Webhook personnalisé',
      s: 'Non connecté',
      dot: 'archive',
      d: 'POST sur événements clés',
      webhookUrl: '',
    },
  ])
  const [configDrawer, setConfigDrawer] = useState(null) // integration id
  const [connectingId, setConnectingId] = useState(null)

  // ── Save / Cancel ────────────────────────────────────────────────────────
  async function handleSave() {
    setSaving(true)
    // TODO: replace stubs with real Convex mutations, e.g.:
    //   await api.org.updateIdentity(identity)
    //   await api.tpe.updateSettings(tpe)
    //   await api.security.updateSettings(security)
    //   await api.notifications.updateSettings(notif)
    await new Promise((r) => setTimeout(r, 800))
    setSavedIdentity(identity)
    setSavedTpe(tpe)
    setSavedSecurity(security)
    setSavedNotif(notif)
    setSaving(false)
    setIsEditing(false)
  }

  function handleCancel() {
    setIdentity(savedIdentity)
    setTpe(savedTpe)
    setSecurity(savedSecurity)
    setNotif(savedNotif)
    setIsEditing(false)
  }

  // ── Deploy ───────────────────────────────────────────────────────────────
  async function handleDeploy() {
    setDeploying(true)
    // TODO: await api.tpe.deployFirmware({ version: '4.2.1' })
    await new Promise((r) => setTimeout(r, 1200))
    setDeploying(false)
    setDeployConfirm(false)
  }

  // ── Billing handlers ─────────────────────────────────────────────────────
  function handleChangePlan() {
    // TODO: open plan-picker modal or navigate to /billing/plans
    alert('Ouverture du sélecteur de forfait…')
  }
  function handleDownloadInvoices() {
    // TODO: await api.billing.downloadInvoices() → blob download
    alert('Téléchargement des factures…')
  }
  function handleEditPayment() {
    // TODO: open payment-method modal
    alert('Modification de la méthode de paiement…')
  }

  // ── Integration handlers ─────────────────────────────────────────────────
  async function handleConnect(id) {
    setConnectingId(id)
    // TODO: launch OAuth / credentials flow for `id`
    await new Promise((r) => setTimeout(r, 800))
    setIntegrations((prev) =>
      prev.map((it) => (it.id === id ? { ...it, s: 'Connecté', dot: 'actif' } : it))
    )
    setConnectingId(null)
  }

  function handleIntegrationSave(updated) {
    setIntegrations((prev) => prev.map((it) => (it.id === updated.id ? updated : it)))
  }

  // ── Nav sections ─────────────────────────────────────────────────────────
  const sections = [
    { k: 'agence', label: 'Agence', icon: <I.Pin /> },
    { k: 'tpe', label: 'Terminaux TPE', icon: <I.Wifi /> },
    { k: 'securite', label: 'Sécurité', icon: <I.Shield /> },
    { k: 'notifications', label: 'Notifications', icon: <I.Bell /> },
    { k: 'facturation', label: 'Facturation', icon: <I.Wallet /> },
    { k: 'integrations', label: 'Intégrations', icon: <I.Cloud /> },
  ]

  const configIntegration = configDrawer ? integrations.find((i) => i.id === configDrawer) : null

  return (
    <div className="settings-page">
      <PageHeader
        crumbs={[]}
        title="Paramètres"
        sub="Configuration de l'institution, des terminaux et de la sécurité"
      >
        {isEditing ? (
          <>
            <button className="btn" onClick={handleCancel} disabled={saving}>
              Annuler
            </button>
            <button className="btn brand" onClick={handleSave} disabled={saving}>
              {saving ? (
                'Enregistrement…'
              ) : (
                <>
                  <I.Check size={14} stroke="white" /> Enregistrer
                </>
              )}
            </button>
          </>
        ) : (
          <>
            {/* ✅ FIX: "Modifier" button that sets isEditing(true) */}
            <button className="btn" onClick={() => setIsEditing(true)}>
              <I.Edit size={14} /> Modifier
            </button>
            <button
              className={'status-pill' + (online ? '' : ' offline')}
              onClick={() => setOnline(!online)}
            >
              <span className="status-dot" />
              {online ? 'En ligne · synchronisé' : 'Hors ligne · 4 en file'}
            </button>
            <Novu />
          </>
        )}
      </PageHeader>

      <div className="settings-grid">
        <aside className="settings-nav">
          {sections.map((s) => (
            <button
              key={s.k}
              className={'settings-nav-item ' + (section === s.k ? 'on' : '')}
              onClick={() => setSection(s.k)}
            >
              {s.icon}
              <span>{s.label}</span>
            </button>
          ))}
        </aside>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, minWidth: 0 }}>
          {/* ── AGENCE ───────────────────────────────────────────────────── */}
          {section === 'agence' && (
            <>
              <SetCard
                title="Identité de l'institution"
                sub="Visible dans les reçus, exports et l'en-tête de l'app."
              >
                <Field label="Nom de l'institution">
                  {/* ✅ FIX: value + onChange, disabled when not editing */}
                  <input
                    className="input"
                    value={identity.orgName}
                    onChange={(e) => setIdentity((p) => ({ ...p, orgName: e.target.value }))}
                    disabled={!isEditing}
                  />
                </Field>
                <Field label="Numéro d'agrément">
                  {/* ✅ FIX: was defaultValue, now controlled */}
                  <input
                    className="input"
                    value={identity.agrement}
                    onChange={(e) => setIdentity((p) => ({ ...p, agrement: e.target.value }))}
                    disabled={!isEditing}
                  />
                </Field>
                <Field label="Devise">
                  <select
                    className="input"
                    value={identity.currency}
                    onChange={(e) => setIdentity((p) => ({ ...p, currency: e.target.value }))}
                    disabled={!isEditing}
                  >
                    <option>FCFA (XOF)</option>
                    <option>EUR</option>
                    <option>USD</option>
                  </select>
                </Field>
                <Field label="Fuseau horaire">
                  {/* ✅ FIX: was defaultValue, now controlled */}
                  <select
                    className="input"
                    value={identity.timezone}
                    onChange={(e) => setIdentity((p) => ({ ...p, timezone: e.target.value }))}
                    disabled={!isEditing}
                  >
                    <option>GMT+0 · Ouagadougou</option>
                    <option>GMT+0 · Bamako</option>
                    <option>GMT+1 · Lagos</option>
                  </select>
                </Field>
                <Field label="Logo (PNG/SVG)">
                  <div className="upload">
                    <div className="brand-mark" style={{ width: 40, height: 40 }}>
                      <I.KauriDrop stroke="white" />
                    </div>
                    <div>
                      <div style={{ fontWeight: 550, fontSize: 13 }}>kauri-logo.svg</div>
                      <div className="cell-sub">3,2 Ko · remplacer</div>
                    </div>
                    <button className="btn sm" style={{ marginLeft: 'auto' }} disabled={!isEditing}>
                      Choisir…
                    </button>
                  </div>
                </Field>
              </SetCard>

              <SetCard
                title="Agences"
                sub={`${branches.length} agence${branches.length > 1 ? 's' : ''} active${branches.length > 1 ? 's' : ''} · ajoutez ou archivez selon votre couverture.`}
              >
                <table className="data-table" style={{ minWidth: 'auto' }}>
                  <thead>
                    <tr>
                      <th>Agence</th>
                      <th>Code</th>
                      <th>Agents</th>
                      <th>Statut</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {/* ✅ FIX: driven by `branches` state, not static literals */}
                    {branches.map((b) => (
                      <tr key={b.c}>
                        <td style={{ fontWeight: 550 }}>{b.n}</td>
                        <td className="cell-sub" style={{ fontFamily: 'var(--font-mono)' }}>
                          {b.c}
                        </td>
                        <td>{b.a}</td>
                        <td>
                          <span className="tag actif">Actif</span>
                        </td>
                        <td style={{ position: 'relative' }}>
                          {/* ✅ FIX: ⋯ button with real onClick + popover menu */}
                          <button
                            className="btn ghost sm"
                            style={{ padding: 4 }}
                            onClick={() => setBranchMenu(branchMenu === b.c ? null : b.c)}
                          >
                            <I.More size={14} />
                          </button>
                          {branchMenu === b.c && (
                            <BranchActionsMenu
                              branch={b}
                              onClose={() => setBranchMenu(null)}
                              onArchive={(code) =>
                                setBranches((prev) => prev.filter((x) => x.c !== code))
                              }
                            />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div style={{ padding: 12 }}>
                  {/* ✅ FIX: "Ajouter une agence" opens the modal */}
                  <button className="btn sm" onClick={() => setShowAddBranch(true)}>
                    <I.Plus size={12} /> Ajouter une agence
                  </button>
                </div>
              </SetCard>
            </>
          )}

          {/* ── TPE ──────────────────────────────────────────────────────── */}
          {section === 'tpe' && (
            <>
              <SetCard
                title="Mode hors-ligne"
                sub="Comportement des TPE quand le réseau n'est pas disponible."
              >
                <Toggle
                  label="Synchronisation automatique en arrière-plan"
                  sub="Les TPE retentent toutes les 5 minutes."
                  value={tpe.bgSync}
                  onChange={(v) => setTpe((p) => ({ ...p, bgSync: v }))}
                />
                <Field
                  label={`Durée maximale hors-ligne · ${tpe.offlineDays} jours`}
                  sub="Au-delà, le TPE refuse de nouveaux mouvements jusqu'à sync."
                >
                  <input
                    type="range"
                    min={1}
                    max={14}
                    value={tpe.offlineDays}
                    onChange={(e) => setTpe((p) => ({ ...p, offlineDays: +e.target.value }))}
                    style={{ width: '100%' }}
                  />
                </Field>
                {/* ✅ FIX: was hard-coded no-op, now wired to state */}
                <Toggle
                  label="Bloquer les retraits hors-ligne"
                  sub="Recommandé. Les dépôts restent autorisés."
                  value={tpe.blockWithdrawals}
                  onChange={(v) => setTpe((p) => ({ ...p, blockWithdrawals: v }))}
                />
              </SetCard>

              <SetCard
                title="Plafonds par transaction"
                sub="Limites appliquées au TPE; les superviseurs peuvent valider au-delà."
              >
                <Field label="Dépôt maximum">
                  <div className="input-row">
                    {/* ✅ FIX: controlled input */}
                    <input
                      className="input"
                      value={tpe.maxDeposit}
                      onChange={(e) => setTpe((p) => ({ ...p, maxDeposit: e.target.value }))}
                      disabled={!isEditing}
                    />
                    <span className="cell-sub">FCFA</span>
                  </div>
                </Field>
                <Field label="Retrait maximum">
                  <div className="input-row">
                    <input
                      className="input"
                      value={tpe.maxWithdrawal}
                      onChange={(e) => setTpe((p) => ({ ...p, maxWithdrawal: e.target.value }))}
                      disabled={!isEditing}
                    />
                    <span className="cell-sub">FCFA</span>
                  </div>
                </Field>
                <Field label="Cotisation tontine">
                  <div className="input-row">
                    <input
                      className="input"
                      value={tpe.maxTontine}
                      onChange={(e) => setTpe((p) => ({ ...p, maxTontine: e.target.value }))}
                      disabled={!isEditing}
                    />
                    <span className="cell-sub">FCFA</span>
                  </div>
                </Field>
              </SetCard>

              <SetCard
                title="Mises à jour TPE"
                sub="Version 4.2.1 disponible. 5 / 6 terminaux à jour."
              >
                <div className="upload">
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      borderRadius: 8,
                      background: 'var(--info-soft)',
                      display: 'grid',
                      placeItems: 'center',
                      color: 'var(--info)',
                    }}
                  >
                    <I.Cloud size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 550, fontSize: 13 }}>
                      Kauri TPE 4.2.1 · 4 mai 2026
                    </div>
                    <div className="cell-sub">Corrige le délai de sync sur réseau 2G.</div>
                  </div>
                  {/* ✅ FIX: "Déployer" opens confirm dialog */}
                  <button
                    className="btn brand sm"
                    style={{ marginLeft: 'auto' }}
                    onClick={() => setDeployConfirm(true)}
                  >
                    Déployer
                  </button>
                </div>
              </SetCard>
            </>
          )}

          {/* ── SÉCURITÉ ─────────────────────────────────────────────────── */}
          {section === 'securite' && (
            <>
              <SetCard
                title="Authentification"
                sub="Connexion des agents et accès au tableau d'administration."
              >
                <Toggle
                  label="Vérification en deux étapes (SMS)"
                  sub="Code à 6 chiffres envoyé au numéro de l'agent."
                  value={security.twoFA}
                  onChange={(v) => setSecurity((p) => ({ ...p, twoFA: v }))}
                />
                <Field
                  label={`Verrouillage automatique · ${security.autoLock} min`}
                  sub="Le TPE se verrouille après inactivité."
                >
                  <input
                    type="range"
                    min={1}
                    max={30}
                    value={security.autoLock}
                    onChange={(e) => setSecurity((p) => ({ ...p, autoLock: +e.target.value }))}
                    style={{ width: '100%' }}
                  />
                </Field>
                <Field label="Politique de PIN">
                  {/* ✅ FIX: was defaultValue, now controlled */}
                  <select
                    className="input"
                    value={security.pinPolicy}
                    onChange={(e) => setSecurity((p) => ({ ...p, pinPolicy: e.target.value }))}
                    disabled={!isEditing}
                  >
                    <option>4 chiffres · rotation 180 j</option>
                    <option>6 chiffres · rotation 90 j</option>
                    <option>6 chiffres + biométrie</option>
                  </select>
                </Field>
              </SetCard>

              <SetCard title="Audit & journalisation" sub="Conservation des journaux d'événements.">
                <Field label="Durée de conservation">
                  {/* ✅ FIX: was defaultValue, now controlled */}
                  <select
                    className="input"
                    value={security.logRetention}
                    onChange={(e) => setSecurity((p) => ({ ...p, logRetention: e.target.value }))}
                    disabled={!isEditing}
                  >
                    <option>12 mois</option>
                    <option>24 mois</option>
                    <option>36 mois</option>
                    <option>60 mois</option>
                  </select>
                </Field>
                {/* ✅ FIX: was hard-coded no-op, now wired to state */}
                <Toggle
                  label="Exporter automatiquement vers le coffre"
                  sub="Sauvegarde chiffrée chaque dimanche à 02:00."
                  value={security.autoExport}
                  onChange={(v) => setSecurity((p) => ({ ...p, autoExport: v }))}
                />
              </SetCard>
            </>
          )}

          {/* ── NOTIFICATIONS ────────────────────────────────────────────── */}
          {section === 'notifications' && (
            <SetCard
              title="Alertes"
              sub="Choisissez ce que vous recevez par e-mail et sur le tableau de bord."
            >
              <Toggle
                label="Nouveau dépôt"
                sub="Au-dessus de 100 000 FCFA"
                value={notif.deposit}
                onChange={(v) => setNotif((p) => ({ ...p, deposit: v }))}
              />
              <Toggle
                label="Nouveau retrait"
                sub="Toujours notifier"
                value={notif.withdraw}
                onChange={(v) => setNotif((p) => ({ ...p, withdraw: v }))}
              />
              <Toggle
                label="Batterie TPE faible"
                sub="Sous 20%"
                value={notif.lowBattery}
                onChange={(v) => setNotif((p) => ({ ...p, lowBattery: v }))}
              />
              <Toggle
                label="Échec de synchronisation"
                sub="Si > 1 h hors-ligne"
                value={notif.syncFail}
                onChange={(v) => setNotif((p) => ({ ...p, syncFail: v }))}
              />
              <Toggle
                label="Rapport hebdomadaire"
                sub="Tous les lundis à 07:00"
                value={notif.weekly}
                onChange={(v) => setNotif((p) => ({ ...p, weekly: v }))}
              />
            </SetCard>
          )}

          {/* ── FACTURATION ──────────────────────────────────────────────── */}
          {section === 'facturation' && (
            <>
              {/* ✅ FIX: plan data comes from state, all three buttons have handlers */}
              <SetCard title="Forfait" sub={`Forfait ${plan.name} · facturé annuellement.`}>
                <div className="plan-row">
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 16 }}>{plan.name}</div>
                    <div className="cell-sub">{plan.desc}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div
                      style={{ fontWeight: 600, fontSize: 18, fontVariantNumeric: 'tabular-nums' }}
                    >
                      {plan.price}
                      <span className="cell-sub" style={{ marginLeft: 4 }}>
                        FCFA / an
                      </span>
                    </div>
                    <div className="cell-sub">Renouvellement le {plan.renewal}</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 8, padding: '12px 16px' }}>
                  <button className="btn sm" onClick={handleChangePlan}>
                    Changer de forfait
                  </button>
                  <button className="btn ghost sm" onClick={handleDownloadInvoices}>
                    Télécharger les factures
                  </button>
                </div>
              </SetCard>

              <SetCard title="Méthode de paiement">
                {/* ✅ FIX: payment data from state; "Modifier" has handler */}
                <div className="upload">
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
                    <I.Wallet size={18} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 550, fontSize: 13 }}>{payment.label}</div>
                    <div className="cell-sub">{payment.masked}</div>
                  </div>
                  <button
                    className="btn sm"
                    style={{ marginLeft: 'auto' }}
                    onClick={handleEditPayment}
                  >
                    Modifier
                  </button>
                </div>
              </SetCard>
            </>
          )}

          {/* ── INTÉGRATIONS ─────────────────────────────────────────────── */}
          {section === 'integrations' && (
            <SetCard title="Intégrations" sub="Connectez Kauri à vos outils existants.">
              {/* ✅ FIX: driven by integrations state; "Configurer" opens drawer; "Connecter" calls handleConnect */}
              {integrations.map((it) => (
                <div key={it.id} className="upload">
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: 8,
                      background: 'var(--surface-inset)',
                      display: 'grid',
                      placeItems: 'center',
                    }}
                  >
                    <I.Cloud size={16} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 550, fontSize: 13 }}>{it.n}</div>
                    <div className="cell-sub">{it.d}</div>
                  </div>
                  <span className={'tag ' + it.dot} style={{ marginLeft: 'auto' }}>
                    {it.s}
                  </span>
                  <button
                    className="btn sm"
                    disabled={connectingId === it.id}
                    onClick={() =>
                      it.dot === 'actif' ? setConfigDrawer(it.id) : handleConnect(it.id)
                    }
                  >
                    {connectingId === it.id
                      ? 'Connexion…'
                      : it.dot === 'actif'
                        ? 'Configurer'
                        : 'Connecter'}
                  </button>
                </div>
              ))}
            </SetCard>
          )}
        </div>
      </div>

      {/* ── Modals / Drawers / Dialogs ────────────────────────────────────── */}

      {showAddBranch && (
        <AddBranchModal
          onClose={() => setShowAddBranch(false)}
          onAdd={(branch) => setBranches((prev) => [...prev, branch])}
        />
      )}

      {deployConfirm && (
        <ConfirmDialog
          message="Déployer la version 4.2.1 sur tous les terminaux ? Le terminal en cours de transaction ignorera la mise à jour jusqu'à la prochaine sync."
          confirmLabel="Déployer"
          loading={deploying}
          onConfirm={handleDeploy}
          onCancel={() => setDeployConfirm(false)}
        />
      )}

      {configIntegration && (
        <CredentialsDrawer
          integration={configIntegration}
          onClose={() => setConfigDrawer(null)}
          onSave={handleIntegrationSave}
        />
      )}
    </div>
  )
}
