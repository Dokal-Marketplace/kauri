import { useState } from 'react'
import { Sidebar } from './components'
import AppCommandPalette from './components/CommandPalette'
import DashboardPage from './pages/DashboardPage'
import ClientsPage from './pages/ClientsPage'
import TransactionsPage from './pages/TransactionsPage'
import AgentsPage from './pages/AgentsPage'
import ObjectifsPage from './pages/ObjectifsPage'
import SettingsPage from './pages/SettingsPage'
import ProductsPage from './pages/ProductsPage'
import ReconciliationPage from './pages/ReconciliationPage'

const PAGES = {
  dashboard:      DashboardPage,
  clients:        ClientsPage,
  tx:             TransactionsPage,
  agents:         AgentsPage,
  objectifs:      ObjectifsPage,
  produits:       ProductsPage,
  reconciliation: ReconciliationPage,
  settings:       SettingsPage,
}

export default function App() {
  const [active, setActive] = useState('dashboard')
  const Page = PAGES[active] ?? DashboardPage

  return (
    <div className="app">
      <Sidebar active={active} setActive={setActive} />
      <main className="main">
        <Page />
      </main>
      <AppCommandPalette setActive={setActive} />
    </div>
  )
}
