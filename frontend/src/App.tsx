import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { PlaceholderPage } from './components/PlaceholderPage'
import { ControlsPage } from './pages/ControlsPage'
import { IngestionPage } from './pages/IngestionPage'
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
        <Route
          path="/mappings"
          element={
            <PlaceholderPage
              title="AI-Assisted Mappings"
              description="Review and approve suggested obligation-to-control/system mappings."
            />
          }
        />
        <Route
          path="/impact"
          element={
            <PlaceholderPage
              title="Impact Analyses"
              description="Generate implementation guidance and engineering backlog suggestions."
            />
          }
        />
        <Route
          path="/ai-registry"
          element={
            <PlaceholderPage
              title="AI Registry"
              description="Catalog AI systems, linked controls, and governance posture."
            />
          }
        />
        <Route
          path="/workflow"
          element={
            <PlaceholderPage
              title="Workflow Timeline"
              description="Audit obligation lifecycle events and approval history."
            />
          }
        />
        <Route path="*" element={<Navigate replace to="/ingestion" />} />
      </Route>
    </Routes>
  )
}

export default App
