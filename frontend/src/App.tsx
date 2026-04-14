import { Navigate, Route, Routes } from 'react-router-dom'
import { AppShell } from './components/AppShell'
import { PlaceholderPage } from './components/PlaceholderPage'

function App() {
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<Navigate replace to="/ingestion" />} />
        <Route
          path="/ingestion"
          element={
            <PlaceholderPage
              title="Regulatory Ingestion"
              description="Upload regulations and extract obligations. The ingestion workflow will be implemented in Phase 1."
            />
          }
        />
        <Route
          path="/obligations"
          element={
            <PlaceholderPage
              title="Obligation Explorer"
              description="Search and triage obligations with status and risk context."
            />
          }
        />
        <Route
          path="/controls"
          element={
            <PlaceholderPage
              title="Controls Catalogue"
              description="Manage control records and map them to systems and obligations."
            />
          }
        />
        <Route
          path="/systems"
          element={
            <PlaceholderPage
              title="Systems Catalogue"
              description="Track service metadata, ownership and API dependencies."
            />
          }
        />
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
