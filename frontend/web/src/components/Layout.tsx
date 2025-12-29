import { ReactNode } from 'react'
import { Link, useLocation } from 'react-router-dom'
import './Layout.css'

interface LayoutProps {
  children: ReactNode
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  
  return (
    <div className="layout">
      <nav className="navbar">
        <div className="nav-brand">
          <h1>OGIM</h1>
          <span>Oil & Gas Intelligent Monitoring</span>
        </div>
        <div className="nav-links">
          <Link 
            to="/" 
            className={location.pathname === '/' ? 'active' : ''}
          >
            Dashboard
          </Link>
          <Link 
            to="/wells" 
            className={location.pathname === '/wells' ? 'active' : ''}
          >
            Wells
          </Link>
          <Link 
            to="/alerts" 
            className={location.pathname === '/alerts' ? 'active' : ''}
          >
            Alerts
          </Link>
          <Link 
            to="/reports" 
            className={location.pathname === '/reports' ? 'active' : ''}
          >
            Reports
          </Link>
          <Link 
            to="/dvr" 
            className={location.pathname === '/dvr' ? 'active' : ''}
          >
            DVR
          </Link>
          <Link 
            to="/remote-operations" 
            className={location.pathname === '/remote-operations' ? 'active' : ''}
          >
            Remote Ops
          </Link>
          <Link 
            to="/data-variables" 
            className={location.pathname === '/data-variables' ? 'active' : ''}
          >
            Data Variables
          </Link>
          <Link 
            to="/maintenance" 
            className={location.pathname === '/maintenance' ? 'active' : ''}
          >
            PDM
          </Link>
          <Link 
            to="/scada" 
            className={location.pathname === '/scada' ? 'active' : ''}
          >
            SCADA/PLC
          </Link>
          <Link 
            to="/lstm-forecast" 
            className={location.pathname === '/lstm-forecast' ? 'active' : ''}
          >
            LSTM Forecast
          </Link>
          <Link 
            to="/storage-optimization" 
            className={location.pathname === '/storage-optimization' ? 'active' : ''}
          >
            Storage
          </Link>
          <Link 
            to="/well3d" 
            className={location.pathname === '/well3d' ? 'active' : ''}
          >
            3D Visualization
          </Link>
          <Link 
            to="/edge-computing" 
            className={location.pathname === '/edge-computing' ? 'active' : ''}
          >
            Edge Computing
          </Link>
          <Link 
            to="/federated-learning" 
            className={location.pathname === '/federated-learning' ? 'active' : ''}
          >
            Federated Learning
          </Link>
          <Link 
            to="/ar-integration" 
            className={location.pathname === '/ar-integration' ? 'active' : ''}
          >
            AR Integration
          </Link>
          <Link 
            to="/blockchain-audit" 
            className={location.pathname === '/blockchain-audit' ? 'active' : ''}
          >
            Blockchain Audit
          </Link>
        </div>
      </nav>
      <main className="main-content">
        {children}
      </main>
    </div>
  )
}

