import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { useAuth } from './hooks/useAuth'
import { AiRegistryPage } from './pages/AiRegistryPage'
import { ControlsPage } from './pages/ControlsPage'
import { ImpactDashboardPage } from './pages/ImpactDashboardPage'
import { IngestionPage } from './pages/IngestionPage'
import { LoginPage } from './pages/LoginPage'
import { MappingsWorkQueuePage } from './pages/MappingsWorkQueuePage'
import { ObligationExplorerPage } from './pages/ObligationExplorerPage'
import { SystemsPage } from './pages/SystemsPage'
import { WorkflowPage } from './pages/WorkflowPage'

function ProtectedRoutes() {
  const { isAuthenticated } = useAuth()
  if (!isAuthenticated) {
    return <Navigate replace to="/login" />
  }

  return <AppShell />
}

function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route element={<ProtectedRoutes />}>
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
        <Route path="/workflow" element={<WorkflowPage />} />
        <Route path="*" element={<Navigate replace to="/ingestion" />} />
      </Route>
    </Routes>
  )
}

export default App
