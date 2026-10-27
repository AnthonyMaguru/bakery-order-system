import { useEffect, useState } from 'react'
import { listPlatformBakeries, updateBakeryStatus, type PlatformBakery } from '../api/admin'
import { ApiError } from '../api/client'

export function AdminBakeriesPage() {
  const [bakeries, setBakeries] = useState<PlatformBakery[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    listPlatformBakeries()
      .then(setBakeries)
      .catch((cause) => setError(cause instanceof ApiError ? cause.message : 'Could not load bakeries.'))
      .finally(() => setLoading(false))
  }, [])

  async function handleToggleStatus(bakery: PlatformBakery) {
    const nextStatus = !bakery.isActive
    const actionLabel = nextStatus ? 'activate' : 'suspend'
    if (!window.confirm(`Are you sure you want to ${actionLabel} ${bakery.name}?`)) {
      return
    }

    setUpdatingId(bakery.id)
    setError(null)
    try {
      const updated = await updateBakeryStatus(bakery.id, nextStatus)
      setBakeries((current) =>
        current.map((b) => (b.id === updated.id ? { ...b, isActive: updated.isActive } : b)),
      )
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not update bakery status.')
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <>
      <header className="page-header">
        <div className="stack">
          <p className="eyebrow">Platform Governance</p>
          <h1>Bakeries Directory</h1>
          <p>Supervise bakeries operating on the marketplace. Suspended bakeries cannot receive new customer orders.</p>
        </div>
      </header>

      {error && <p className="form-error" role="alert">{error}</p>}

      {loading ? (
        <p className="loading">Loading bakeries directory…</p>
      ) : bakeries.length === 0 ? (
        <div className="empty">
          <h2>No bakeries registered yet</h2>
          <p>Onboarded bakeries from the applications tab will appear here.</p>
        </div>
      ) : (
        <div className="stack-lg">
          <div
            style={{
              display: 'grid',
              gap: 16,
            }}
          >
            {bakeries.map((bakery) => (
              <article
                key={bakery.id}
                style={{
                  background: 'var(--surface)',
                  border: '1.5px solid var(--line)',
                  borderRadius: 'var(--radius)',
                  padding: '20px 24px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                }}
              >
                <div className="row-between">
                  <div className="stack" style={{ gap: 4 }}>
                    <div className="row" style={{ gap: 10 }}>
                      <h2 style={{ fontSize: 20 }}>{bakery.name}</h2>
                      <span
                        className="status"
                        style={{
                          background: bakery.isActive ? 'var(--ok-soft)' : 'var(--danger-soft)',
                          color: bakery.isActive ? 'var(--ok)' : 'var(--danger)',
                        }}
                      >
                        {bakery.isActive ? 'Active on Marketplace' : 'Suspended'}
                      </span>
                    </div>
                    <p className="muted small">
                      Slug: <code>{bakery.slug}</code> · {bakery.city || 'Kampala'} · Joined{' '}
                      {new Date(bakery.createdAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div>
                    <button
                      type="button"
                      className={`btn btn-sm ${bakery.isActive ? 'btn-outline' : 'btn-primary'}`}
                      style={{
                        borderColor: bakery.isActive ? 'var(--danger)' : undefined,
                        color: bakery.isActive ? 'var(--danger)' : undefined,
                      }}
                      disabled={updatingId === bakery.id}
                      onClick={() => void handleToggleStatus(bakery)}
                    >
                      {updatingId === bakery.id
                        ? 'Updating…'
                        : bakery.isActive
                        ? 'Suspend Bakery'
                        : 'Reactivate Bakery'}
                    </button>
                  </div>
                </div>

                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
                    gap: 12,
                    background: 'var(--sand)',
                    padding: '12px 16px',
                    borderRadius: 'var(--radius)',
                    fontSize: 13,
                  }}
                >
                  <div>
                    <span className="muted">Phone:</span>{' '}
                    <strong>{bakery.phone || 'None provided'}</strong>
                  </div>
                  <div>
                    <span className="muted">Staff Members:</span>{' '}
                    <strong>{bakery._count.members}</strong>
                  </div>
                  <div>
                    <span className="muted">Products Listed:</span>{' '}
                    <strong>{bakery._count.products}</strong>
                  </div>
                  <div>
                    <span className="muted">Orders Processed:</span>{' '}
                    <strong>{bakery._count.orders}</strong>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      )}
    </>
  )
}
