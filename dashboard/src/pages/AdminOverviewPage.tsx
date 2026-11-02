import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { getAdminOverview, type AdminOverview } from '../api/admin'
import { ApiError } from '../api/client'

export function AdminOverviewPage() {
  const [data, setData] = useState<AdminOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    getAdminOverview()
      .then(setData)
      .catch((cause) => setError(cause instanceof ApiError ? cause.message : 'Could not load platform overview.'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <>
      <header className="page-header">
        <div className="stack">
          <p className="eyebrow">Platform Governance</p>
          <h1>Platform Overview</h1>
          <p>Marketplace metrics, active bakeries, and applications.</p>
        </div>
      </header>

      {error && <p className="form-error" role="alert">{error}</p>}

      {/* Privacy Guard Notice */}
      <div
        style={{
          background: 'var(--sand)',
          border: '1px solid var(--line-strong)',
          borderRadius: 'var(--radius)',
          padding: '16px 20px',
          marginBottom: 24,
          display: 'flex',
          gap: 14,
          alignItems: 'flex-start',
        }}
      >
        <span style={{ fontSize: 20 }}>🛡️</span>
        <div className="stack" style={{ gap: 4 }}>
          <strong style={{ color: 'var(--ink)' }}>Bakery Privacy Protection Active</strong>
          <p className="small muted" style={{ lineHeight: 1.5 }}>
            As a Platform Administrator, you govern marketplace infrastructure, bakery verification, and platform roles.
            In accordance with platform security rules, individual bakery business secrets—including secret recipes,
            ingredient stock levels, customer orders, custom cake briefs, and pricing quotations—are strictly confidential
            and isolated to each bakery’s staff.
          </p>
        </div>
      </div>

      {loading ? (
        <p className="loading">Loading platform metrics…</p>
      ) : data ? (
        <div className="stack-lg">
          {/* Key Metrics Grid */}
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
              gap: 16,
            }}
          >
            <div
              style={{
                background: 'var(--surface)',
                border: '1.5px solid var(--line)',
                borderRadius: 'var(--radius)',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <span className="muted small uppercase" style={{ letterSpacing: '0.05em', fontWeight: 600 }}>
                Total Bakeries
              </span>
              <strong style={{ fontSize: 32, fontFamily: 'var(--font-display)', color: 'var(--ink)' }}>
                {data.totalBakeries}
              </strong>
              <span className="small muted">
                <strong style={{ color: 'var(--ok)' }}>{data.activeBakeries} active</strong>
                {data.suspendedBakeries > 0 && ` · ${data.suspendedBakeries} suspended`}
              </span>
            </div>

            <div
              style={{
                background: 'var(--surface)',
                border: '1.5px solid var(--line)',
                borderRadius: 'var(--radius)',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <span className="muted small uppercase" style={{ letterSpacing: '0.05em', fontWeight: 600 }}>
                Pending Applications
              </span>
              <strong style={{ fontSize: 32, fontFamily: 'var(--font-display)', color: data.pendingApplications > 0 ? 'var(--warn)' : 'var(--ink)' }}>
                {data.pendingApplications}
              </strong>
              <span className="small muted">
                {data.pendingApplications > 0 ? 'Awaiting your review & onboarding' : 'All applications reviewed'}
              </span>
            </div>

            <div
              style={{
                background: 'var(--surface)',
                border: '1.5px solid var(--line)',
                borderRadius: 'var(--radius)',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <span className="muted small uppercase" style={{ letterSpacing: '0.05em', fontWeight: 600 }}>
                Registered Users
              </span>
              <strong style={{ fontSize: 32, fontFamily: 'var(--font-display)', color: 'var(--ink)' }}>
                {data.totalUsers}
              </strong>
              <span className="small muted">Platform customers & staff accounts</span>
            </div>

            <div
              style={{
                background: 'var(--surface)',
                border: '1.5px solid var(--line)',
                borderRadius: 'var(--radius)',
                padding: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <span className="muted small uppercase" style={{ letterSpacing: '0.05em', fontWeight: 600 }}>
                Marketplace Orders Placed
              </span>
              <strong style={{ fontSize: 32, fontFamily: 'var(--font-display)', color: 'var(--ink)' }}>
                {data.totalOrders}
              </strong>
              <span className="small muted">Total orders processed platform-wide</span>
            </div>
          </div>

          {/* Quick Actions */}
          <div
            style={{
              background: 'var(--surface)',
              border: '1.5px solid var(--line)',
              borderRadius: 'var(--radius)',
              padding: 24,
            }}
          >
            <h2>Admin Quick Actions</h2>
            <p className="muted" style={{ marginTop: 4, marginBottom: 16 }}>
              Manage incoming partner bakeries, control directory access, and audit platform accounts.
            </p>
            <div className="row" style={{ gap: 12 }}>
              <Link to="/admin/applications" className="btn btn-primary">
                Review Applications ({data.pendingApplications})
              </Link>
              <Link to="/admin/bakeries" className="btn btn-outline">
                Manage Bakeries Directory ({data.totalBakeries})
              </Link>
              <Link to="/admin/users" className="btn btn-outline">
                Manage Platform Users ({data.totalUsers})
              </Link>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
