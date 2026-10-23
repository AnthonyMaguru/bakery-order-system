import { NavLink, Outlet } from 'react-router-dom'
import { signOut } from 'firebase/auth'
import { useState } from 'react'
import { useBakery } from '../context/bakery-context'
import { firebaseAuth, firebaseEnabled } from '../lib/firebase'
import { Icon, type IconName } from './Icon'

const GROUPS: { label: string; links: { to: string; label: string; icon: IconName }[] }[] = [
  { label: 'Work', links: [
  { to: '/orders', label: 'Orders', icon: 'orders' },
  { to: '/schedule', label: 'Schedule', icon: 'schedule' },
  ] },
  { label: 'Catalogue', links: [
  { to: '/products', label: 'Products', icon: 'products' },
  { to: '/builder', label: 'Builder options', icon: 'options' },
  { to: '/stock', label: 'Stock', icon: 'stock' },
  ] },
  { label: 'Workspace', links: [
  { to: '/settings', label: 'Settings', icon: 'settings' },
  ] },
]

export function Layout() {
  const { me, bakery, isOwner, newOrders, stockAlerts, switchBakery } = useBakery()
  const isAdmin = me.role === 'ADMIN'
  const [menuOpen, setMenuOpen] = useState(false)

  const badge = (to: string) => {
    if (to === '/orders' && newOrders > 0) return <span className="nav-badge">{newOrders} new</span>
    if (to === '/stock' && stockAlerts > 0) return <span className="nav-badge nav-badge-warn">{stockAlerts} low</span>
    return null
  }

  const nav = (
    <nav className="nav" aria-label="Dashboard">
      {GROUPS.map((group) => (
        <div className="nav-group" key={group.label}>
          <span className="nav-group-label">{group.label}</span>
          {group.links.map((link) => (
            <NavLink key={link.to} to={link.to} onClick={() => setMenuOpen(false)}>
              <Icon name={link.icon} />
              <span>{link.label}</span>
              {badge(link.to)}
            </NavLink>
          ))}
        </div>
      ))}
      {isAdmin && (
        <div className="nav-group nav-admin-group">
          <span className="nav-group-label">Platform</span>
          <NavLink to="/admin/applications" onClick={() => setMenuOpen(false)}>
            <Icon name="settings" />
            <span>Bakery applications</span>
          </NavLink>
        </div>
      )}
    </nav>
  )

  return (
    <div className="app">
      <header className="mobile-topbar">
        <strong>Bakery Orders<span aria-hidden="true">.</span></strong>
        <button type="button" className="menu-button" aria-label={menuOpen ? 'Close dashboard navigation' : 'Open dashboard navigation'} aria-expanded={menuOpen} aria-controls="dashboard-sidebar" onClick={() => setMenuOpen((open) => !open)}>
          <span aria-hidden="true" className={`menu-icon${menuOpen ? ' is-open' : ''}`}>
            <span />
            <span />
            <span />
          </span>
        </button>
      </header>
      <aside id="dashboard-sidebar" className={`sidebar${menuOpen ? ' is-open' : ''}`}>
        <div className="sidebar-brand">
          <strong>Bakery Orders</strong>
          {me.bakeries.length > 1 ? (
            <label>
              <span className="visually-hidden">Bakery</span>
              <select value={bakery.id} onChange={(e) => switchBakery(e.target.value)}>
                {me.bakeries.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <span>{bakery.name}</span>
          )}
        </div>
        {nav}
        <div className="sidebar-user">
          <strong>{me.name ?? me.email ?? 'Signed in'}</strong>
          <span>{isOwner ? 'Owner' : 'Staff'}</span>
          {firebaseEnabled && (
            <button type="button" className="btn btn-sm sidebar-sign-out" onClick={() => void signOut(firebaseAuth())}>
              Sign out
            </button>
          )}
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}
