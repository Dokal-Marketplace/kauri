import { useState } from 'react'
import {
  Topbar, QuickActionsCard
} from '../components'
import Novu from '../components/Inbox'

function PendingCard({ label }) {
  return (
    <div className="card" style={{ padding: 24, color: "var(--ink-3)", fontSize: 13, textAlign: "center" }}>
      {label} — données en attente
    </div>
  )
}

export default function DashboardPage() {
  const [online, setOnline] = useState(true)

  return (
    <>
      <Topbar online={online} setOnline={setOnline} inbox={<Novu />} />
      <h1 className="h1">Bonsoir, Djibril</h1>
      <div className="h1-sub mb-6">Mardi 5 mai 2026 · Agence Bobo-Dioulasso · 6 agents en service</div>
      <section className="kpi-row">
        <PendingCard label="KPIs" />
      </section>

      <div className="row cols-2" style={{ marginBottom: 14 }}>
        <PendingCard label="Graphique volume" />
        <QuickActionsCard />

      </div>

      <div className="row cols-2">
        <PendingCard label="Derniers Clients" />
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <PendingCard label="Transactions récentes" />
        </div>
      </div>
    </>
  )
}
