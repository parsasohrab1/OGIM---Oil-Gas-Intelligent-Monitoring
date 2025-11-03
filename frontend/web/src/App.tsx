import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Alerts from './pages/Alerts'
import Wells from './pages/Wells'
import Reports from './pages/Reports'
import './App.css'

const queryClient = new QueryClient()

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <Layout>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/alerts" element={<Alerts />} />
            <Route path="/wells" element={<Wells />} />
            <Route path="/reports" element={<Reports />} />
          </Routes>
        </Layout>
      </Router>
    </QueryClientProvider>
  )
}

export default App

