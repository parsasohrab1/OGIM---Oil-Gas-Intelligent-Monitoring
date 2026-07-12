import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { AuthProvider } from './context/AuthContext'
import RequireAuth from './components/RequireAuth'
import Layout from './components/Layout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import Alerts from './pages/Alerts'
import Wells from './pages/Wells'
import Reports from './pages/Reports'
import DVR from './pages/DVR'
import RemoteOperations from './pages/RemoteOperations'
import DataVariables from './pages/DataVariables'
import Maintenance from './pages/Maintenance'
import SCADA from './pages/SCADA'
import LSTMForecast from './pages/LSTMForecast'
import StorageOptimization from './pages/StorageOptimization'
import Well3D from './pages/Well3D'
import EdgeComputing from './pages/EdgeComputing'
import FederatedLearning from './pages/FederatedLearning'
import ARIntegration from './pages/ARIntegration'
import BlockchainAudit from './pages/BlockchainAudit'
import DataQualityLineage from './pages/DataQualityLineage'
import WorkflowAutomation from './pages/WorkflowAutomation'
import MLModels from './pages/MLModels'
import Performance from './pages/Performance'
import ReportBuilder from './pages/ReportBuilder'
import SecurityCenter from './pages/SecurityCenter'
import './App.css'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router
        future={{
          v7_startTransition: true,
          v7_relativeSplatPath: true,
        }}
      >
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route
              path="/*"
              element={
                <RequireAuth>
                  <Layout>
                    <Routes>
                      <Route path="/" element={<Dashboard />} />
                      <Route path="/alerts" element={<Alerts />} />
                      <Route path="/wells" element={<Wells />} />
                      <Route path="/reports" element={<Reports />} />
                      <Route path="/dvr" element={<DVR />} />
                      <Route path="/remote-operations" element={<RemoteOperations />} />
                      <Route path="/data-variables" element={<DataVariables />} />
                      <Route path="/maintenance" element={<Maintenance />} />
                      <Route path="/scada" element={<SCADA />} />
                      <Route path="/lstm-forecast" element={<LSTMForecast />} />
                      <Route path="/storage-optimization" element={<StorageOptimization />} />
                      <Route path="/well3d" element={<Well3D />} />
                      <Route path="/edge-computing" element={<EdgeComputing />} />
                      <Route path="/federated-learning" element={<FederatedLearning />} />
                      <Route path="/ar-integration" element={<ARIntegration />} />
                      <Route path="/blockchain-audit" element={<BlockchainAudit />} />
                      <Route path="/data-quality-lineage" element={<DataQualityLineage />} />
                      <Route path="/workflow-automation" element={<WorkflowAutomation />} />
                      <Route path="/ml-models" element={<MLModels />} />
                      <Route path="/performance" element={<Performance />} />
                      <Route path="/report-builder" element={<ReportBuilder />} />
                      <Route path="/security" element={<SecurityCenter />} />
                    </Routes>
                  </Layout>
                </RequireAuth>
              }
            />
          </Routes>
        </AuthProvider>
      </Router>
    </QueryClientProvider>
  )
}

export default App

