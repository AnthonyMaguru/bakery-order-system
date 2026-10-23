import { useState } from 'react'
import { Link } from 'react-router-dom'

export function PublicNav() {
  const [open, setOpen] = useState(false)

  return (
    <nav className="marketing-nav" aria-label="Main navigation">
      <Link className="wordmark" to="/" onClick={() => setOpen(false)}>
        Crumb & Co.<span aria-hidden="true">.</span>
      </Link>
      <button
        type="button"
        className="public-menu-toggle"
        aria-label={open ? 'Close navigation menu' : 'Open navigation menu'}
        aria-expanded={open}
        aria-controls="public-navigation-links"
        onClick={() => setOpen((current) => !current)}
      >
        <span aria-hidden="true" className={`menu-icon${open ? ' is-open' : ''}`}>
          <span />
          <span />
          <span />
        </span>
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
