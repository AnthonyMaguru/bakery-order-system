import { useId, useRef, useState } from 'react'
import { uploadPhoto } from '../api/uploads'
import { compressImage } from '../lib/image'

interface Props {
  label: string
  value: string | null
  onChange: (url: string | null) => void
  disabled?: boolean
}

// Pick a photo, shrink it, upload it, and hand back its link. Shows the current photo.
export function PhotoField({ label, value, onChange, disabled }: Props) {
  const id = useId()
  const input = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const choose = async (file: File | undefined) => {
    if (!file) return
    setBusy(true)
    setError(null)
    try {
      const { url } = await uploadPhoto(await compressImage(file))
      onChange(url)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
      if (input.current) input.current.value = ''
    }
  }

  return (
    <div className="field">
      <span className="label" id={`${id}-label`}>
        {label} <span className="optional">· optional</span>
      </span>
      <div className="row" style={{ alignItems: 'flex-start' }}>
        {value && <img src={value} alt="" style={{ width: 88, height: 88, objectFit: 'cover', borderRadius: 12 }} />}
        <div className="stack">
          <button type="button" className="btn btn-outline" aria-describedby={`${id}-label`} disabled={disabled || busy} onClick={() => input.current?.click()}>
            {busy ? 'Uploading…' : value ? 'Change photo' : 'Add a photo'}
          </button>
          <input
            ref={input}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            hidden
            tabIndex={-1}
            onChange={(e) => void choose(e.target.files?.[0])}
          />
          {value && !busy && !disabled && (
            <button type="button" className="btn btn-sm btn-quiet-danger" style={{ justifyContent: 'flex-start' }} onClick={() => onChange(null)}>
              Remove photo
            </button>
          )}
        </div>
      </div>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
