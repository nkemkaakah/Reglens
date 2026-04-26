import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { PlaceholderPage } from './components/PlaceholderPage'
import { AiRegistryPage } from './pages/AiRegistryPage'
import { ControlsPage } from './pages/ControlsPage'
import { ImpactDashboardPage } from './pages/ImpactDashboardPage'
import { IngestionPage } from './pages/IngestionPage'
import { MappingsWorkQueuePage } from './pages/MappingsWorkQueuePage'
import { ObligationExplorerPage } from './pages/ObligationExplorerPage'
import { SystemsPage } from './pages/SystemsPage'

function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate replace to="/ingestion" />} />
        <Route
          path="/ingestion"
          element={
            <IngestionPage />
          }
        />
        <Route
          path="/obligations"
          element={
            <ObligationExplorerPage />
          }
        />
        <Route path="/controls" element={<ControlsPage />} />
        <Route path="/systems" element={<SystemsPage />} />
        <Route path="/mappings" element={<MappingsWorkQueuePage />} />
        <Route path="/impact" element={<ImpactDashboardPage />} />
        <Route path="/ai-registry" element={<AiRegistryPage />} />
        <Route
          path="/workflow"
          element={
            <PlaceholderPage
              title="Workflow Timeline"
              description="Review who changed each obligation, when, and why—from intake through mapping, impact sign-off, and implementation."
            />
          }
        />
        <Route path="*" element={<Navigate replace to="/ingestion" />} />
      </Route>
    </Routes>
  )
}

export default App
