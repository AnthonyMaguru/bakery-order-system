import { useState, useEffect } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { getMe } from '../api/bakeries'
import { getAdminOverview } from '../api/admin'
import { firebaseAuth, firebaseEnabled } from '../lib/firebase'
import { Icon, type IconName } from './Icon'
import type { Me } from '../types/api'

const ADMIN_LINKS: { to: string; label: string; icon: IconName }[] = [
  { to: '/admin/overview', label: 'Overview', icon: 'schedule' },
  { to: '/admin/applications', label: 'Bakery applications', icon: 'settings' },
  { to: '/admin/bakeries', label: 'Bakeries directory', icon: 'products' },
  { to: '/admin/users', label: 'Platform users', icon: 'users' },
]

export function AdminLayout() {
  const [me, setMe] = useState<Me | null>(null)
  const [pendingApps, setPendingApps] = useState<number>(0)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    getMe().then(setMe).catch(() => undefined)
    getAdminOverview()
      .then((data) => setPendingApps(data.pendingApplications))
      .catch(() => undefined)
  }, [])

  const handleSignOut = async () => {
    try {
      if (firebaseEnabled) {
        await signOut(firebaseAuth())
      }
    } catch (err) {
      console.error('Sign out error', err)
    } finally {
      localStorage.clear()
      sessionStorage.clear()
      window.location.href = '/signin'
    }
  }

  return (
    <div className="app">
      <header className="mobile-topbar">
        <strong>Platform Admin<span aria-hidden="true">.</span></strong>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            type="button"
            className="btn btn-sm btn-danger-outline"
            style={{
              minHeight: 34,
              padding: '0 10px',
              fontSize: 12,
              background: 'rgba(220, 53, 69, 0.2)',
              color: '#ffc9ce',
              borderColor: 'rgba(220, 53, 69, 0.5)',
              borderRadius: 8,
            }}
            onClick={handleSignOut}
            aria-label="Sign out"
          >
            <Icon name="logout" size={15} />
            <span>Sign out</span>
          </button>
          <button
            type="button"
            className="menu-button"
            aria-label={menuOpen ? 'Close navigation' : 'Open navigation'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <span aria-hidden="true" className={`menu-icon${menuOpen ? ' is-open' : ''}`}>
              <span />
              <span />
              <span />
            </span>
          </button>
        </div>
      </header>

      <aside id="dashboard-sidebar" className={`sidebar${menuOpen ? ' is-open' : ''}`}>
        <div className="sidebar-brand">
          <strong>Crumb & Co.</strong>
          <span className="nav-badge" style={{ background: 'var(--accent)', color: '#fff', fontSize: 11, padding: '2px 8px' }}>
            Platform Admin
          </span>
        </div>

        <nav className="nav" aria-label="Platform Admin">
          <div className="nav-group">
            <span className="nav-group-label">Platform Governance</span>
            {ADMIN_LINKS.map((link) => (
              <NavLink key={link.to} to={link.to} onClick={() => setMenuOpen(false)}>
                <Icon name={link.icon} />
                <span>{link.label}</span>
                {link.to === '/admin/applications' && pendingApps > 0 && (
                  <span className="nav-badge nav-badge-warn">{pendingApps} new</span>
                )}
              </NavLink>
            ))}
          </div>
        </nav>

        <div className="sidebar-user">
          <div className="sidebar-user-info">
            <strong title={me?.name ?? me?.email ?? 'Administrator'}>
              {me?.name ?? me?.email ?? 'Administrator'}
            </strong>
            <span className="sidebar-user-role">Platform Administrator</span>
          </div>
          <button
            type="button"
            className="sidebar-sign-out"
            onClick={handleSignOut}
            aria-label="Sign out"
          >
            <Icon name="logout" size={16} />
            <span>Sign out</span>
          </button>
        </div>
      </aside>

      <div style={{ flex: '1 1 0', display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <span className="badge badge-accent" style={{ fontWeight: 700, letterSpacing: '0.04em' }}>
              Platform Admin Console
            </span>
          </div>
          <div className="admin-topbar-right">
            <div className="admin-user-badge">
              <span className="admin-avatar" aria-hidden="true">🛡️</span>
              <div className="admin-user-text">
                <span className="admin-user-name">{me?.name ?? me?.email ?? 'Administrator'}</span>
                <span className="admin-user-tag">Platform Administrator</span>
              </div>
            </div>
            <button
              type="button"
              className="btn btn-sm btn-danger-outline"
              onClick={handleSignOut}
              id="admin-topbar-signout"
              aria-label="Sign out"
              style={{ fontWeight: 600 }}
            >
              <Icon name="logout" size={16} />
              <span>Sign out</span>
            </button>
          </div>
        </header>

        <main className="main" tabIndex={-1}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}
