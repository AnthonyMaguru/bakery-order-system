import { useEffect, useState } from 'react'
import {
  listBakeryApplications,
  updateBakeryApplicationStatus,
  type BakeryApplication,
  type BakeryApplicationStatus,
} from '../api/applications'
import { ApiError } from '../api/client'

const STATUS_LABELS: Record<BakeryApplicationStatus, string> = {
  PENDING: 'Pending review',
  CONTACTED: 'Contacted',
  APPROVED: 'Approved',
  DECLINED: 'Declined',
}

const STATUS_ORDER: BakeryApplicationStatus[] = ['PENDING', 'CONTACTED', 'APPROVED', 'DECLINED']

export function BakeryApplicationsPage() {
  const [applications, setApplications] = useState<BakeryApplication[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)

  useEffect(() => {
    listBakeryApplications()
      .then(setApplications)
      .catch((cause) => setError(cause instanceof ApiError ? cause.message : 'Could not load applications.'))
      .finally(() => setLoading(false))
  }, [])

  async function updateStatus(application: BakeryApplication, status: BakeryApplicationStatus) {
    setSavingId(application.id)
    setError(null)
    try {
      const updated = await updateBakeryApplicationStatus(application.id, status)
      setApplications((current) => current.map((item) => (item.id === updated.id ? updated : item)))
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'Could not update this application.')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <>
      <header className="page-header">
        <div className="stack">
          <p className="eyebrow">Platform admin</p>
          <h1>Bakery applications</h1>
          <p>Review new bakeries, record contact, and approve the ones ready for setup.</p>
        </div>
      </header>
      {error && <p className="form-error" role="alert">{error}</p>}
      {loading ? <p className="loading">Loading applications…</p> : applications.length === 0 ? (
        <div className="empty">
          <h2>No applications yet</h2>
          <p>New bakery applications will appear here after they submit the public form.</p>
        </div>
      ) : (
        <div className="application-list">
          {applications.map((application) => (
            <article className="application-card" key={application.id}>
              <div className="application-card-header">
                <div className="stack">
                  <h2>{application.bakeryName}</h2>
                  <p className="muted">{application.city} · Applied {new Date(application.createdAt).toLocaleDateString()}</p>
                </div>
                <span className={`status status-${application.status.toLowerCase()}`}>{STATUS_LABELS[application.status]}</span>
              </div>
              <div className="application-card-details">
                <p><strong>Contact</strong> {application.contactName}</p>
                <p><strong>Email</strong> <a href={`mailto:${application.email}`}>{application.email}</a></p>
                <p><strong>Phone</strong> <a href={`tel:${application.phone}`}>{application.phone}</a></p>
              </div>
              {application.notes && <p className="application-card-notes">“{application.notes}”</p>}
              <div className="row">
                <label className="field application-status-field">
                  <span className="visually-hidden">Update status for {application.bakeryName}</span>
                  <select
                    value={application.status}
                    disabled={savingId === application.id}
                    onChange={(event) => void updateStatus(application, event.target.value as BakeryApplicationStatus)}
                  >
                    {STATUS_ORDER.map((status) => <option key={status} value={status}>{STATUS_LABELS[status]}</option>)}
                  </select>
                </label>
                {application.status === 'APPROVED' && (
                  <span className="small muted">Create the bakery and add the owner in the normal setup flow.</span>
                )}
              </div>
            </article>
          ))}
        </div>
      )}
    </>
  )
}
