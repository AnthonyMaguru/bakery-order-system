import { NavLink, Outlet } from 'react-router-dom'
import { useBakery } from '../context/bakery-context'
import { Icon, type IconName } from './Icon'

const LINKS: { to: string; label: string; icon: IconName }[] = [
  { to: '/orders', label: 'Orders', icon: 'orders' },
  { to: '/schedule', label: 'Schedule', icon: 'schedule' },
  { to: '/products', label: 'Products', icon: 'products' },
  { to: '/builder', label: 'Builder options', icon: 'options' },
  { to: '/stock', label: 'Stock', icon: 'stock' },
  { to: '/settings', label: 'Settings', icon: 'settings' },
]

export function Layout() {
  const { me, bakery, isOwner, newOrders, stockAlerts, switchBakery } = useBakery()

  const badge = (to: string) => {
    if (to === '/orders' && newOrders > 0) return <span className="nav-badge">{newOrders} new</span>
    if (to === '/stock' && stockAlerts > 0) return <span className="nav-badge nav-badge-warn">{stockAlerts} low</span>
    return null
  }

  return (
    <div className="app">
      <aside className="sidebar">
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
        <nav className="nav" aria-label="Dashboard">
          {LINKS.map((link) => (
            <NavLink key={link.to} to={link.to}>
              <Icon name={link.icon} />
              <span>{link.label}</span>
              {badge(link.to)}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-user">
          <strong>{me.name ?? me.email ?? 'Signed in'}</strong>
          <span>{isOwner ? 'Owner' : 'Staff'}</span>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}
