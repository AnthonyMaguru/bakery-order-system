import { useEffect, useState } from 'react'
import { listPlatformUsers, updateUserRole, type PlatformUser } from '../api/admin'
import { getMe } from '../api/bakeries'
import { ApiError } from '../api/client'
import type { Me } from '../types/api'

export function AdminUsersPage() {
  const [users, setUsers] = useState<PlatformUser[]>([])
  const [me, setMe] = useState<Me | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    Promise.all([listPlatformUsers(), getMe()])
      .then(([userList, currentMe]) => {
        setUsers(userList)
        setMe(currentMe)
      })
      .catch((cause) => setError(cause instanceof ApiError ? cause.message : 'Could not load users.'))
      .finally(() => setLoading(false))
  }, [])

  async function handleToggleRole(targetUser: PlatformUser) {
    const nextRole = targetUser.role === 'ADMIN' ? 'CUSTOMER' : 'ADMIN'
    const promptMsg =
      nextRole === 'ADMIN'
        ? `Grant platform administrator rights to ${targetUser.email ?? 'this user'}?`
        : `Revoke platform administrator rights from ${targetUser.email ?? 'this user'}?`

    if (!window.confirm(promptMsg)) return

    setUpdatingId(targetUser.id)
    setError(null)
    try {
      const updated = await updateUserRole(targetUser.id, nextRole)
      setUsers((current) =>
        current.map((u) => (u.id === updated.id ? { ...u, role: updated.role } : u)),
      )
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not update user role.')
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <>
      <header className="page-header">
        <div className="stack">
          <p className="eyebrow">Platform Governance</p>
          <h1>Platform Users</h1>
          <p>Directory of registered customers, bakery personnel, and platform administrators.</p>
        </div>
      </header>

      {error && <p className="form-error" role="alert">{error}</p>}

      {loading ? (
        <p className="loading">Loading platform users…</p>
      ) : users.length === 0 ? (
        <div className="empty">
          <h2>No users found</h2>
          <p>Users who register via mobile or web will appear here.</p>
        </div>
      ) : (
        <div className="stack-lg">
          <div
            style={{
              display: 'grid',
              gap: 12,
            }}
          >
            {users.map((user) => {
              const isCurrentMe = me?.id === user.id
              return (
                <article
                  key={user.id}
                  style={{
                    background: 'var(--surface)',
                    border: '1.5px solid var(--line)',
                    borderRadius: 'var(--radius)',
                    padding: '16px 20px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 16,
                  }}
                >
                  <div className="stack" style={{ gap: 4 }}>
                    <div className="row" style={{ gap: 10 }}>
                      <strong style={{ fontSize: 16, color: 'var(--ink)' }}>
                        {user.name || user.email || 'Unnamed user'}
                      </strong>
                      <span
                        className="status"
                        style={{
                          background: user.role === 'ADMIN' ? 'var(--accent-soft)' : 'var(--sand)',
                          color: user.role === 'ADMIN' ? 'var(--accent)' : 'var(--muted)',
                        }}
                      >
                        {user.role === 'ADMIN' ? 'Platform Admin' : 'Standard User'}
                      </span>
                      {isCurrentMe && (
                        <span
                          className="status"
                          style={{ background: 'var(--ok-soft)', color: 'var(--ok)' }}
                        >
                          You
                        </span>
                      )}
                    </div>

                    <p className="muted small">
                      {user.email && <span>{user.email} · </span>}
                      {user.phone ? `Phone: ${user.phone} · ` : ''}
                      Joined {new Date(user.createdAt).toLocaleDateString()}
                    </p>

                    <p className="small muted">
                      Bakery memberships: <strong>{user._count.memberships}</strong> · Orders placed:{' '}
                      <strong>{user._count.orders}</strong>
                    </p>
                  </div>

                  <div>
                    <button
                      type="button"
                      className={`btn btn-sm ${user.role === 'ADMIN' ? 'btn-outline' : 'btn-dark'}`}
                      disabled={isCurrentMe || updatingId === user.id}
                      title={isCurrentMe ? 'You cannot remove your own admin privileges' : undefined}
                      onClick={() => void handleToggleRole(user)}
                    >
                      {updatingId === user.id
                        ? 'Saving…'
                        : user.role === 'ADMIN'
                        ? 'Revoke Admin'
                        : 'Promote to Admin'}
                    </button>
                  </div>
                </article>
              )
            })}
          </div>
        </div>
      )}
    </>
  )
}
