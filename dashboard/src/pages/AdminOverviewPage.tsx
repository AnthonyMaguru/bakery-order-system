import { useEffect, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { getAdminOverview, getPlatformSettings, updateCommissionRate, type AdminOverview } from '../api/admin'
import { ApiError } from '../api/client'

export function AdminOverviewPage() {
  const [data, setData] = useState<AdminOverview | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [commissionRate, setCommissionRate] = useState('')
  const [savingRate, setSavingRate] = useState(false)
  const [rateMessage, setRateMessage] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([getAdminOverview(), getPlatformSettings()])
      .then(([overview, settings]) => {
        setData(overview)
        setCommissionRate(settings.commissionRateBps == null ? '' : (settings.commissionRateBps / 100).toString())
      })
      .catch((cause) => setError(cause instanceof ApiError ? cause.message : 'Could not load platform overview.'))
      .finally(() => setLoading(false))
  }, [])

  async function saveCommission(e: FormEvent) {
    e.preventDefault()
    const percent = Number(commissionRate)
    if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
      setRateMessage('Enter a percentage from 0 to 100.')
      return
    }
    setSavingRate(true)
    setRateMessage(null)
    try {
      await updateCommissionRate(Math.round(percent * 100))
      setRateMessage('Commission rate saved. It will apply to orders completed from now on.')
    } catch (cause) {
      setRateMessage(cause instanceof ApiError ? cause.message : 'Could not save the commission rate.')
    } finally {
      setSavingRate(false)
    }
  }

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
          <section className="panel stack" aria-labelledby="commission-h">
            <h2 id="commission-h">Bakery commission</h2>
            <p className="muted">Set the percentage charged to bakeries on completed order subtotals. Delivery costs and customer platform fees are excluded. Existing orders keep their saved rate.</p>
            <form className="row" onSubmit={saveCommission}>
              <label className="field" htmlFor="commission-rate">
                Commission rate (%)
                <input id="commission-rate" className="input" type="number" min="0" max="100" step="0.01" value={commissionRate} onChange={(e) => setCommissionRate(e.target.value)} />
              </label>
              <button type="submit" className="btn btn-primary" disabled={savingRate || commissionRate === ''}>
                {savingRate ? 'Saving…' : 'Save rate'}
              </button>
            </form>
            {rateMessage && <p className="small" role="status">{rateMessage}</p>}
            {!commissionRate && <p className="alert alert-info">No rate is configured yet. Order completion is blocked until an administrator sets one.</p>}
          </section>

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
