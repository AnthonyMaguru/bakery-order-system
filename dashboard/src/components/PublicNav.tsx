import { useState } from 'react'
import { Link } from 'react-router-dom'

export function PublicNav() {
  const [open, setOpen] = useState(false)

  return (
    <nav className="marketing-nav" aria-label="Main navigation">
      <Link className="wordmark" to="/" onClick={() => setOpen(false)}>
        Bakery Orders<span aria-hidden="true">.</span>
      </Link>
      <button
        type="button"
        className="public-menu-toggle"
        aria-expanded={open}
        aria-controls="public-navigation-links"
        onClick={() => setOpen((current) => !current)}
      >
        {open ? 'Close' : 'Menu'}
      </button>
      <div id="public-navigation-links" className={`marketing-nav-links${open ? ' is-open' : ''}`}>
        <a href="/#workflow" onClick={() => setOpen(false)}>How it works</a>
        <Link to="/apply" onClick={() => setOpen(false)}>Apply your bakery</Link>
        <Link className="nav-sign-in" to="/signin" onClick={() => setOpen(false)}>
          Staff sign in <span aria-hidden="true">↗</span>
        </Link>
      </div>
    </nav>
  )
}
