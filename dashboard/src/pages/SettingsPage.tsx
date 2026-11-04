import { useState, type FormEvent } from 'react'
import { addMember, getCommissionSummary, listMembers, removeMember, updateSettings } from '../api/bakeries'
import { ConfirmDialog } from '../components/ConfirmDialog'
import { PhotoField } from '../components/PhotoField'
import { Icon } from '../components/Icon'
import { useBakery } from '../context/bakery-context'
import { useToast } from '../context/toast-context'
import { useAsync } from '../hooks/useAsync'
import type { BakerySettings, Member, MemberRole } from '../types/api'

type Form = Omit<Pick<
  BakerySettings,
  'name' | 'phone' | 'address' | 'city' | 'about' | 'imageUrl' | 'deliveryZones' | 'pickupAvailable' | 'acceptsCash' | 'acceptsMobileMoney' | 'mobileMoneyNumber' | 'handoverTimes' | 'occasions'
>, 'handoverTimes'> & {
  handoverStart: string
  handoverEnd: string
}

const fromSettings = (b: BakerySettings): Form => {
  const times = [...(b.handoverTimes ?? [])].sort()
  return {
    name: b.name,
    phone: b.phone,
    address: b.address,
    city: b.city,
    about: b.about,
    imageUrl: b.imageUrl,
    deliveryZones: b.deliveryZones ?? [],
    pickupAvailable: b.pickupAvailable,
    acceptsCash: b.acceptsCash,
    acceptsMobileMoney: b.acceptsMobileMoney,
    mobileMoneyNumber: b.mobileMoneyNumber,
    handoverStart: times[0] ?? '',
    handoverEnd: times.at(-1) ?? '',
    occasions: b.occasions ?? ['Birthday', 'Wedding', 'Introduction', 'Graduation', 'Baby shower', 'Other'],
  }
}

export function SettingsPage() {
  const { bakery, isOwner, refreshBakery } = useBakery()
  const toast = useToast()
  const [form, setForm] = useState<Form>(() => fromSettings(bakery))
  const [zone, setZone] = useState({ region: bakery.region, municipality: bakery.municipality, division: '', name: '' })
  const [newOccasion, setNewOccasion] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const original = fromSettings(bakery)
  const current = form
  const changed = (Object.keys(original) as (keyof Form)[]).filter((k) => JSON.stringify(original[k]) !== JSON.stringify(current[k]))
  const set = <K extends keyof Form>(key: K, value: Form[K]) => setForm((f) => ({ ...f, [key]: value }))
  const disabled = !isOwner

  const addZone = () => {
    const next = { ...zone, region: zone.region.trim(), municipality: zone.municipality.trim(), division: zone.division.trim() || null, name: zone.name.trim() }
    if (!next.region || !next.municipality || !next.name) return setError('Enter the region, municipality and neighborhood or delivery zone')
    const key = [next.region, next.municipality, next.division ?? '', next.name].join('|').toLowerCase()
    if (form.deliveryZones.some((item) => [item.region, item.municipality, item.division ?? '', item.name].join('|').toLowerCase() === key)) {
      return setError('That delivery zone is already listed')
    }
    set('deliveryZones', [...form.deliveryZones, next])
    setZone((value) => ({ ...value, name: '' }))
    setError(null)
  }

  const addOccasion = () => {
    const occ = newOccasion.trim()
    if (!occ) return
    if (!form.occasions.some((o) => o.toLowerCase() === occ.toLowerCase())) {
      set('occasions', [...form.occasions, occ])
    }
    setNewOccasion('')
  }

  const save = async () => {
    if (!current.name.trim()) return setError('The bakery needs a name')
    if (
      (current.handoverStart || current.handoverEnd) &&
      (!current.handoverStart ||
        !current.handoverEnd ||
        current.handoverStart >= current.handoverEnd)
    ) {
      return setError('Set both handover times, with the end later than the start.')
    }
    setSaving(true)
    setError(null)
    try {
      const timeWindowChanged = changed.some((key) => key === 'handoverStart' || key === 'handoverEnd')
      const update = Object.fromEntries(
        changed
          .filter((key) => key !== 'handoverStart' && key !== 'handoverEnd')
          .map((key) => [key, current[key]]),
      )
      if (timeWindowChanged) {
        update.handoverTimes = current.handoverStart && current.handoverEnd
          ? [current.handoverStart, current.handoverEnd]
          : []
      }
      await updateSettings(bakery.id, update)
      refreshBakery()
      toast('Settings saved. Customers see the changes straight away.')
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const describeChanges = () => {
    const labels: Partial<Record<keyof Form, string>> = { deliveryZones: 'delivery coverage', name: 'the name', imageUrl: 'the photo', handoverStart: 'handover hours', handoverEnd: 'handover hours' }
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
          <PhotoField label="Bakery photo, shown in the list of bakeries" value={form.imageUrl} onChange={(url) => set('imageUrl', url)} disabled={disabled} />
        </section>

        <section className="stack-lg" aria-labelledby="delivery-h">
          <h2 id="delivery-h">Delivery</h2>
          <div className="stack">
            <span id="areas-label" className="strong small">
              Delivery zones
            </span>
            <ul className="chips" aria-labelledby="areas-label">
              {form.deliveryZones.map((area, index) => (
                <li key={`${area.region}-${area.municipality}-${area.name}-${index}`} className="chip">
                  {[area.name, area.division, area.municipality, area.region].filter(Boolean).join(' · ')}
                  {!disabled && (
                    <button type="button" aria-label={`Remove ${area.name}`} onClick={() => set('deliveryZones', form.deliveryZones.filter((_, i) => i !== index))}>
                      <Icon name="close" size={14} />
                    </button>
                  )}
                </li>
              ))}
              {form.deliveryZones.length === 0 && <li className="muted">No delivery zones. Customers can only pick up.</li>}
            </ul>
            {!disabled && (
              <div className="grid-2">
                <Text id="zone-region" label="Region" value={zone.region} onChange={(v) => setZone((z) => ({ ...z, region: v }))} />
                <Text id="zone-municipality" label="Municipality or city" value={zone.municipality} onChange={(v) => setZone((z) => ({ ...z, municipality: v }))} />
                <Text id="zone-division" label="Division or sub-county · optional" value={zone.division} onChange={(v) => setZone((z) => ({ ...z, division: v }))} />
                <Text id="zone-name" label="Neighborhood or zone" value={zone.name} onChange={(v) => setZone((z) => ({ ...z, name: v }))} />
                <button type="button" className="btn btn-outline" onClick={addZone}>Add delivery zone</button>
              </div>
            )}
            <span className="hint">Customers select a zone, then provide their address and a nearby landmark. Delivery cost is confirmed by your bakery in the quote; customers pay you directly.</span>
          </div>
          <div className="row" style={{ alignItems: 'flex-end', gap: 20 }}>
            <label className="check">
              <input type="checkbox" checked={form.pickupAvailable} onChange={(e) => set('pickupAvailable', e.target.checked)} disabled={disabled} />
              Customers can also pick up from the shop
            </label>
          </div>
        </section>

        <section className="stack-lg" aria-labelledby="times-h">
          <h2 id="times-h">Pickup & delivery hours</h2>
          <div className="stack">
            <span className="strong small">Set a flexible window customers can request for pickup or delivery.</span>
            <div className="grid-2" style={{ maxWidth: 520 }}>
              <label className="field" htmlFor="handover-start">
                <span className="label">Window starts</span>
                <input id="handover-start" className="input" type="time" value={form.handoverStart} onChange={(e) => set('handoverStart', e.target.value)} disabled={disabled} />
              </label>
              <label className="field" htmlFor="handover-end">
                <span className="label">Window ends</span>
                <input id="handover-end" className="input" type="time" value={form.handoverEnd} onChange={(e) => set('handoverEnd', e.target.value)} disabled={disabled} />
              </label>
            </div>
            <span className="hint">Customers can request any time in this window. Your bakery confirms the exact handover time with each order.</span>
          </div>
        </section>

        <section className="stack-lg" aria-labelledby="occasions-h">
          <h2 id="occasions-h">Celebration Occasions</h2>
          <div className="stack">
            <span id="occasions-label" className="strong small">
              Occasions you offer custom designs for
            </span>
            <ul className="chips" aria-labelledby="occasions-label">
              {form.occasions.map((occ) => (
                <li key={occ} className="chip">
                  {occ}
                  {!disabled && (
                    <button type="button" aria-label={`Remove ${occ}`} onClick={() => set('occasions', form.occasions.filter((o) => o !== occ))}>
                      <Icon name="close" size={14} />
                    </button>
                  )}
                </li>
              ))}
              {form.occasions.length === 0 && <li className="muted">No celebration occasions configured.</li>}
            </ul>
            {!disabled && (
              <div className="row" style={{ maxWidth: 420 }}>
                <label htmlFor="new-occasion" className="visually-hidden">
                  New occasion
                </label>
                <input
                  id="new-occasion"
                  className="input"
                  style={{ flex: 1 }}
                  placeholder="e.g. Anniversary or Baby shower"
                  value={newOccasion}
                  onChange={(e) => setNewOccasion(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault()
                      addOccasion()
                    }
                  }}
                />
                <button type="button" className="btn btn-outline" onClick={addOccasion}>
                  Add occasion
                </button>
              </div>
            )}
            <span className="hint">Shown to customers as quick celebration chips when customizing their cakes.</span>
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

        <CommissionSummarySection bakeryId={bakery.id} />
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

function CommissionSummarySection({ bakeryId }: { bakeryId: string }) {
  const { data, error, loading } = useAsync(() => getCommissionSummary(bakeryId), [bakeryId])
  return (
    <section className="stack" aria-labelledby="commission-summary-h">
      <h2 id="commission-summary-h">Platform commission</h2>
      {loading ? <p className="muted">Loading commission summary…</p> : error ? (
        <p className="form-error" role="alert">{error}</p>
      ) : data ? (
        <>
          <p>Commission rate: {data.commissionRateBps == null ? 'Not configured yet' : `${(data.commissionRateBps / 100).toFixed(2)}%`}</p>
          <p>Completed orders: {data.completedOrders} · accrued commission: {data.currency} {data.accruedCommission.toLocaleString()}</p>
          <span className="hint">The platform commission is calculated from completed order subtotals. Delivery costs are excluded. Customers do not pay a platform fee. Settlement is handled directly with the bakery.</span>
        </>
      ) : null}
    </section>
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
