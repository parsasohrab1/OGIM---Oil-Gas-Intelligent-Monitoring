import { ReactNode, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { kpiAPI } from '../api/services'
import './Layout.css'

interface LayoutProps {
  children: ReactNode
}

function featureFromPath(pathname: string): string {
  if (pathname === '/') return 'dashboard'
  const segment = pathname.replace(/^\//, '').split('/')[0]
  return segment || 'dashboard'
}

export default function Layout({ children }: LayoutProps) {
  const location = useLocation()
  const { user } = useAuth()

  useEffect(() => {
    const feature = featureFromPath(location.pathname)
    kpiAPI.recordFeatureUsage(feature).catch(() => {
      /* non-blocking adoption metric */
    })
  }, [location.pathname])

  return (
    <div className="layout" dir="rtl">
      <nav className="navbar">
        <div className="nav-brand">
          <h1>هوشمندسازی میادین</h1>
          <span>میدان دهلران · شرکت ملی نفت مناطق مرکزی</span>
        </div>
        {user && (
          <div className="nav-user">
            <span>
              {user.username} ({roleFa(user.role)})
            </span>
          </div>
        )}
        <div className="nav-links">
          <Link to="/" className={location.pathname === '/' ? 'active' : ''}>
            داشبورد
          </Link>
          <Link to="/wells" className={location.pathname === '/wells' ? 'active' : ''}>
            چاه‌ها
          </Link>
          <Link to="/alerts" className={location.pathname === '/alerts' ? 'active' : ''}>
            هشدارها
          </Link>
          <Link
            to="/production-forecast"
            className={location.pathname === '/production-forecast' ? 'active' : ''}
          >
            پیش‌بینی تولید
          </Link>
          <Link to="/dvr" className={location.pathname === '/dvr' ? 'active' : ''}>
            اعتبارسنجی داده
          </Link>
          <Link to="/maintenance" className={location.pathname === '/maintenance' ? 'active' : ''}>
            نگهداری پیش‌بینانه
          </Link>
          <Link to="/scada" className={location.pathname === '/scada' ? 'active' : ''}>
            اسکادا و کنترل‌گر منطقی
          </Link>
          <Link to="/well3d" className={location.pathname === '/well3d' ? 'active' : ''}>
            نمایش سه‌بعدی
          </Link>
          <Link
            to="/ar-integration"
            className={location.pathname === '/ar-integration' ? 'active' : ''}
          >
            واقعیت افزوده
          </Link>
          <Link
            to="/report-builder"
            className={location.pathname === '/report-builder' ? 'active' : ''}
          >
            گزارش‌ساز
          </Link>
          <Link to="/system" className={location.pathname === '/system' ? 'active' : ''}>
            سیستم
          </Link>
        </div>
      </nav>
      <main className="main-content">{children}</main>
    </div>
  )
}

function roleFa(role: string) {
  const map: Record<string, string> = {
    system_admin: 'مدیر سیستم',
    field_operator: 'اپراتور میدان',
    data_engineer: 'مهندس داده',
    viewer: 'بازدیدکننده',
    admin: 'مدیر',
    guest: 'مهمان',
  }
  return map[role] || role
}
