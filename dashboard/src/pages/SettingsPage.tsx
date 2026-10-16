import { useState, type FormEvent } from 'react'
import { addMember, listMembers, removeMember, updateSettings } from '../api/bakeries'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { Icon } from '../components/Icon'
import { useBakery } from '../context/bakery-context'
import { useToast } from '../context/toast-context'
import { useAsync } from '../hooks/useAsync'
import type { BakerySettings, Member, MemberRole } from '../types/api'

type Form = Pick<
  BakerySettings,
  'name' | 'phone' | 'address' | 'city' | 'about' | 'deliveryAreas' | 'deliveryFee' | 'pickupAvailable' | 'acceptsCash' | 'acceptsMobileMoney' | 'mobileMoneyNumber'
>

const fromSettings = (b: BakerySettings): Form => ({
  name: b.name,
  phone: b.phone,
  address: b.address,
  city: b.city,
  about: b.about,
  deliveryAreas: b.deliveryAreas,
  deliveryFee: b.deliveryFee,
  pickupAvailable: b.pickupAvailable,
  acceptsCash: b.acceptsCash,
  acceptsMobileMoney: b.acceptsMobileMoney,
  mobileMoneyNumber: b.mobileMoneyNumber,
})

export function SettingsPage() {
  const { bakery, isOwner, refreshBakery } = useBakery()
  const toast = useToast()
  const [form, setForm] = useState<Form>(() => fromSettings(bakery))
  const [fee, setFee] = useState(String(bakery.deliveryFee))
  const [newArea, setNewArea] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const original = fromSettings(bakery)
  const current = { ...form, deliveryFee: Number(fee.replaceAll(',', '')) }
  const changed = (Object.keys(original) as (keyof Form)[]).filter((k) => JSON.stringify(original[k]) !== JSON.stringify(current[k]))
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }))
  const disabled = !isOwner

  const addArea = () => {
    const area = newArea.trim()
    if (!area) return
    if (!form.deliveryAreas.some((a) => a.toLowerCase() === area.toLowerCase())) set('deliveryAreas', [...form.deliveryAreas, area])
    setNewArea('')
  }

  const save = async () => {
    if (!Number.isInteger(current.deliveryFee) || current.deliveryFee < 0) return setError('The delivery fee must be a whole number')
    if (!current.name.trim()) return setError('The bakery needs a name')
    setSaving(true)
    setError(null)
    try {
      await updateSettings(bakery.id, Object.fromEntries(changed.map((k) => [k, current[k]])))
      refreshBakery()
      toast('Settings saved. Customers see the changes straight away.')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const describeChanges = () => {
    const labels: Partial<Record<keyof Form, string>> = { deliveryFee: 'the delivery fee', deliveryAreas: 'the delivery areas', name: 'the name' }
    if (changed.length === 1) return `You changed ${labels[changed[0]!] ?? 'a setting'}.`
    return `You changed ${changed.length} settings.`
  }

  return (
    <>
      <div className="page-header">
        <div className="stack">
          <h1>Bakery settings</h1>
          <p>How your bakery appears to customers, and who can use this dashboard.</p>
        </div>
      </div>
      {!isOwner && <p className="alert alert-info">Only the bakery owner can change these settings.</p>}

      <div className="sections stack-lg" style={{ maxWidth: 760, gap: 28 }}>
        <section className="stack-lg" aria-labelledby="profile-h">
          <h2 id="profile-h">Profile</h2>
          <div className="grid-2">
            <Text id="b-name" label="Bakery name" value={form.name} onChange={(v) => set('name', v)} disabled={disabled} />
            <Text id="b-phone" label="Phone customers can call" value={form.phone ?? ''} onChange={(v) => set('phone', v || null)} disabled={disabled} />
            <Text id="b-address" label="Shop address, for pickups" value={form.address ?? ''} onChange={(v) => set('address', v || null)} disabled={disabled} />
            <Text id="b-city" label="City" value={form.city} onChange={(v) => set('city', v)} disabled={disabled} />
          </div>
          <Text id="b-about" label="One line about you" value={form.about ?? ''} onChange={(v) => set('about', v || null)} disabled={disabled} hint="Shown under your name in the app." />
        </section>

        <section className="stack-lg" aria-labelledby="delivery-h">
          <h2 id="delivery-h">Delivery</h2>
          <div className="stack">
            <span id="areas-label" className="strong small">
              Areas you deliver to
            </span>
            <ul className="chips" aria-labelledby="areas-label">
              {form.deliveryAreas.map((area) => (
                <li key={area} className="chip">
                  {area}
                  {!disabled && (
                    <button type="button" aria-label={`Remove ${area}`} onClick={() => set('deliveryAreas', form.deliveryAreas.filter((a) => a !== area))}>
                      <Icon name="close" size={14} />
                    </button>
                  )}
                </li>
              ))}
              {form.deliveryAreas.length === 0 && <li className="muted">No delivery areas. Customers can only pick up.</li>}
            </ul>
            {!disabled && (
              <div className="row" style={{ maxWidth: 420 }}>
                <label htmlFor="new-area" className="visually-hidden">
                  New delivery area
                </label>
                <input
                  id="new-area"
                  className="input"
                  style={{ flex: 1 }}
                  placeholder="Add an area, for example Kira"
                  value={newArea}
                  onChange={(e) => setNewArea(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addArea()
                    }
                  }}
                />
                <button type="button" className="btn btn-outline" onClick={addArea}>
                  Add
                </button>
              </div>
            )}
            <span className="hint">Only customers in these areas see your bakery, unless they choose to send a cake here.</span>
          </div>
          <div className="row" style={{ alignItems: 'flex-end', gap: 20 }}>
            <div className="field" style={{ flex: '0 1 220px' }}>
              <label htmlFor="b-fee">Delivery fee, {bakery.currency}</label>
              <input id="b-fee" className="input" inputMode="numeric" value={fee} onChange={(e) => setFee(e.target.value)} disabled={disabled} />
            </div>
            <label className="check">
              <input type="checkbox" checked={form.pickupAvailable} onChange={(e) => set('pickupAvailable', e.target.checked)} disabled={disabled} />
              Customers can also pick up from the shop
            </label>
          </div>
        </section>

        <section className="stack-lg" aria-labelledby="pay-h">
          <h2 id="pay-h">Payments</h2>
          <div className="row" style={{ gap: 24 }}>
            <label className="check">
              <input type="checkbox" checked={form.acceptsCash} onChange={(e) => set('acceptsCash', e.target.checked)} disabled={disabled} />
              Cash
            </label>
            <label className="check">
              <input type="checkbox" checked={form.acceptsMobileMoney} onChange={(e) => set('acceptsMobileMoney', e.target.checked)} disabled={disabled} />
              Mobile Money
            </label>
          </div>
          <div className="grid-2">
            {form.acceptsMobileMoney && (
              <Text
                id="b-momo"
                label="Mobile Money number for deposits"
                value={form.mobileMoneyNumber ?? ''}
                onChange={(v) => set('mobileMoneyNumber', v || null)}
                disabled={disabled}
                hint="Customers see it when they accept a quote."
              />
            )}
            <div className="field">
              <span className="label">Currency</span>
              <span style={{ minHeight: 46, display: 'flex', alignItems: 'center' }}>{bakery.currency}</span>
              <span className="hint">Set when your bakery joined. All prices use it.</span>
            </div>
          </div>
        </section>

        <StaffSection />
      </div>

      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {isOwner && changed.length > 0 && (
        <div className="save-bar" role="region" aria-label="Unsaved changes">
          <span>{describeChanges()} Save to update the app.</span>
          <button
            type="button"
            className="btn btn-ghost"
            onClick={() => {
              setForm(original)
              setFee(String(bakery.deliveryFee))
              setError(null)
            }}
          >
            Discard
          </button>
          <button type="button" className="btn btn-light" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      )}
    </>
  )
}

function Text({ id, label, value, onChange, disabled, hint }: { id: string; label: string; value: string; onChange: (v: string) => void; disabled?: boolean; hint?: string }) {
  return (
    <div className="field">
      <label htmlFor={id}>{label}</label>
      <input id={id} className="input" value={value} onChange={(e) => onChange(e.target.value)} disabled={disabled} aria-describedby={hint ? `${id}-hint` : undefined} />
      {hint && (
        <span id={`${id}-hint`} className="hint">
          {hint}
        </span>
      )}
    </div>
  )
}

const ROLE_TEXT: Record<MemberRole, string> = {
  OWNER: 'Owner · can change settings and staff',
  STAFF: 'Staff · can handle orders, products and stock',
}

function StaffSection() {
  const { bakery, me, isOwner } = useBakery()
  const toast = useToast()
  const members = useAsync(() => listMembers(bakery.id), [bakery.id])
  const [inviting, setInviting] = useState(false)
  const [email, setEmail] = useState('')
  const [role, setRole] = useState<MemberRole>('STAFF')
  const [error, setError] = useState<string | null>(null)
  const [removing, setRemoving] = useState<Member | null>(null)

  const invite = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      const member = await addMember(bakery.id, email.trim(), role)
      members.reload()
      setInviting(false)
      setEmail('')
      toast(`${member.user.name ?? member.user.email} can now use this dashboard.`)
    } catch (err) {
      setError((err as Error).message)
    }
  }

  return (
    <section className="stack-lg" aria-labelledby="staff-h">
      <div className="row-between">
        <h2 id="staff-h">Staff</h2>
        {isOwner && !inviting && (
          <button type="button" className="btn btn-secondary" onClick={() => setInviting(true)}>
            Add someone
          </button>
        )}
      </div>
      {inviting && (
        <form className="panel" onSubmit={invite} style={{ gap: 14 }}>
          <div className="grid-2">
            <div className="field">
              <label htmlFor="m-email">Their email</label>
              <input id="m-email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} aria-describedby="m-email-hint" />
            </div>
            <div className="field">
              <label htmlFor="m-role">Role</label>
              <select id="m-role" value={role} onChange={(e) => setRole(e.target.value as MemberRole)}>
                <option value="STAFF">Staff</option>
                <option value="OWNER">Owner</option>
              </select>
            </div>
          </div>
          <span id="m-email-hint" className="hint">
            They need to have signed in to the app once with this email.
          </span>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          <div className="row">
            <button type="submit" className="btn btn-primary">
              Add to staff
            </button>
            <button type="button" className="btn btn-outline" onClick={() => setInviting(false)}>
              Cancel
            </button>
          </div>
        </form>
      )}
      {members.error && <p className="form-error">{members.error}</p>}
      <ul className="list">
        {(members.data ?? []).map((m) => (
          <li key={m.id} className="row-between">
            <span className="stack" style={{ gap: 2 }}>
              <span className="strong">
                {m.user.name ?? m.user.email}
                {m.user.id === me.id ? ' (you)' : ''}
              </span>
              <span className="small muted">{ROLE_TEXT[m.role]}</span>
            </span>
            {isOwner && m.user.id !== me.id && (
              <button type="button" className="btn btn-sm btn-quiet-danger" onClick={() => setRemoving(m)}>
                Remove
              </button>
            )}
          </li>
        ))}
      </ul>

      <ConfirmDialog
        open={removing !== null}
        title={`Remove ${removing?.user.name ?? removing?.user.email ?? 'them'} from your staff?`}
        confirmLabel="Remove"
        tone="danger"
        onClose={() => setRemoving(null)}
        onConfirm={async () => {
          if (!removing) return
          await removeMember(bakery.id, removing.id)
          members.reload()
          toast(`${removing.user.name ?? removing.user.email} no longer has access.`)
        }}
      >
        <p>They lose access to this dashboard straight away. Their past work on orders stays.</p>
      </ConfirmDialog>
    </section>
  )
}
