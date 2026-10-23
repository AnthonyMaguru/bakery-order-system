import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { ApiError } from '../api/client'
import { submitBakeryApplication, type BakeryApplicationInput } from '../api/applications'

const initialForm: BakeryApplicationInput = {
  bakeryName: '',
  contactName: '',
  email: '',
  phone: '',
  city: '',
  notes: '',
}

export function ApplicationPage() {
  const [form, setForm] = useState(initialForm)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  const update = (field: keyof BakeryApplicationInput, value: string) =>
    setForm((current) => ({ ...current, [field]: value }))

  async function submit(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSaving(true)
    try {
      await submitBakeryApplication({ ...form, notes: form.notes || undefined })
      setSubmitted(true)
    } catch (cause) {
      setError(cause instanceof ApiError ? cause.message : 'We could not send your application. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="application-shell">
      <nav className="marketing-nav">
        <Link className="wordmark" to="/">Crumb & Co.</Link>
        <Link className="text-link" to="/">Back to home <span aria-hidden="true">↗</span></Link>
      </nav>
      <div className="application-layout">
        <div className="application-intro">
          <h1>Let’s make room for your bakery.</h1>
          <p>
            Share a little about your bakery and the kind of orders you want to grow.
            We’ll review your application, then contact you before anything goes live.
          </p>
        </div>
        <div className="application-form-panel">
          {submitted ? (
            <div className="application-success">
              <p className="eyebrow">Application received</p>
              <h2>We’ll be in touch soon.</h2>
              <p>Thanks for telling us about your bakery. Our team will review the details and contact you directly.</p>
              <Link className="btn btn-dark" to="/">Return home</Link>
            </div>
          ) : (
            <form className="form-grid" onSubmit={submit}>
              <div className="form-grid-heading">
                <h2>Fill in the essentials</h2>
              </div>
              <label className="field">
                Bakery name
                <input className="input" required value={form.bakeryName} onChange={(e) => update('bakeryName', e.target.value)} />
              </label>
              <label className="field">
                Your name
                <input className="input" required value={form.contactName} onChange={(e) => update('contactName', e.target.value)} />
              </label>
              <div className="form-two">
                <label className="field">
                  Email
                  <input className="input" type="email" required value={form.email} onChange={(e) => update('email', e.target.value)} />
                </label>
                <label className="field">
                  Phone
                  <input className="input" type="tel" required value={form.phone} onChange={(e) => update('phone', e.target.value)} />
                </label>
              </div>
              <label className="field">
                City
                <input className="input" required value={form.city} onChange={(e) => update('city', e.target.value)} />
              </label>
              <label className="field">
                Tell us about your bakery <span className="optional">(optional)</span>
                <textarea rows={4} value={form.notes} onChange={(e) => update('notes', e.target.value)} placeholder="What do you bake, and what would you love help with?" />
              </label>
              {error && <p className="form-error" role="alert">{error}</p>}
              <button className="btn btn-primary btn-block" disabled={saving} type="submit">
                {saving ? 'Sending application…' : 'Send application'}
              </button>
              <p className="small muted">No public listing is created until we have spoken with you.</p>
            </form>
          )}
        </div>
      </div>
    </main>
  )
}
