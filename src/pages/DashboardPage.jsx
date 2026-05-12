import { useState } from 'react'
import {
  Topbar, KPI, ClientsCard, TransactionsCard,
  VolumeChart, QuickActionsCard,
} from '../components'
import { KPIS, CLIENTS, TRANSACTIONS, VOLUME } from '../data'
import Novu from '../components/Inbox'

export default function DashboardPage() {
  const [online, setOnline] = useState(true)

  return (
    <>
      <Topbar online={online} setOnline={setOnline} inbox={<Novu />} />
      <h1 className="h1">Bonsoir, Djibril</h1>
      <div className="h1-sub mb-6">Mardi 5 mai 2026 · Agence Bobo-Dioulasso · 6 agents en service</div>
      <section className="kpi-row">
        {KPIS.map(k => <KPI key={k.label} k={k} />)}
      </section>

      <div className="row cols-2" style={{ marginBottom: 14 }}>
        <VolumeChart data={VOLUME} />
        <QuickActionsCard />

      </div>

      <div className="row cols-2">
        <ClientsCard clients={CLIENTS.slice(0,5)} />
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <TransactionsCard tx={TRANSACTIONS} />
        </div>
      </div>
    </>
  )
}
