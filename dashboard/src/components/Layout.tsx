import { NavLink, Outlet } from 'react-router-dom'

export function Layout() {
  return (
    <div className="layout">
      <header className="topbar">
        <strong>Bakery Orders</strong>
        <nav>
          <NavLink to="/orders">Orders</NavLink>
          <NavLink to="/products">Products</NavLink>
        </nav>
      </header>
      <main className="content">
        <Outlet />
      </main>
    </div>
  )
}
