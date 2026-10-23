import { useEffect, useState, type ReactNode } from 'react'
import { getMe } from '../api/bakeries'
import { ApiError } from '../api/client'
import { firebaseAuth, firebaseEnabled } from '../lib/firebase'
import { signOut } from 'firebase/auth'

export function AdminGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<'loading' | 'allowed' | 'forbidden' | 'error'>('loading')
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    getMe()
      .then((me) => setState(me.role === 'ADMIN' ? 'allowed' : 'forbidden'))
      .catch((cause) => {
        setMessage(cause instanceof ApiError ? cause.message : 'Could not verify administrator access.')
        setState('error')
      })
  }, [])

  if (state === 'loading') return <p className="loading main">Checking administrator access…</p>
  if (state === 'error') {
    return (
      <main className="main">
        <h1>Couldn’t verify access</h1>
        <p className="form-error" role="alert">{message}</p>
        <p className="muted">Refresh the page or contact the platform administrator.</p>
      </main>
    )
  }
  if (state === 'forbidden') {
    return (
      <main className="main">
        <p className="eyebrow">Platform admin</p>
        <h1>Administrator access required</h1>
        <p className="muted">This area is only available to platform administrators.</p>
        {firebaseEnabled && (
          <button type="button" className="btn btn-outline" style={{ alignSelf: 'flex-start' }} onClick={() => void signOut(firebaseAuth())}>
            Sign in with another account
          </button>
        )}
      </main>
    )
  }
  return <>{children}</>
}
