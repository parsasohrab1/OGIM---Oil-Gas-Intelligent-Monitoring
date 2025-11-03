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
        </div>
      </nav>
      <main className="main-content">
        {children}
      </main>
    </div>
  )
}

