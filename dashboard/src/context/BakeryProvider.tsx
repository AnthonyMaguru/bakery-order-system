import { signOut } from 'firebase/auth'
import { useCallback, useEffect, useState, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { getMe, getSettings } from '../api/bakeries'
import { getOrdersSummary } from '../api/orders'
import { listStock } from '../api/stock'
import type { BakerySettings, Me } from '../types/api'
import { firebaseAuth, firebaseEnabled } from '../lib/firebase'
import { BakeryContext } from './bakery-context'

const STORAGE_KEY = 'dashboard.bakeryId'

function remembered() {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function remember(bakeryId: string) {
  try {
    localStorage.setItem(STORAGE_KEY, bakeryId)
  } catch {
    // Private windows can refuse storage; the dashboard still works.
  }
}

// Loads who is signed in and which bakery they work for, before showing any page.
export function BakeryProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me | null>(null)
  const [bakery, setBakery] = useState<BakerySettings | null>(null)
  const [bakeryId, setBakeryId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [counts, setCounts] = useState({ newOrders: 0, stockAlerts: 0 })

  useEffect(() => {
    getMe()
      .then((user) => {
        setMe(user)
        const saved = remembered()
        const choice = user.bakeries.find((b) => b.id === saved) ?? user.bakeries[0]
        setBakeryId(choice?.id ?? null)
      })
      .catch((e: Error) => setError(e.message))
  }, [])

  const refreshBakery = useCallback(() => {
    if (!bakeryId) return
    getSettings(bakeryId)
      .then(setBakery)
      .catch((e: Error) => setError(e.message))
  }, [bakeryId])

  const refreshCounts = useCallback(() => {
    if (!bakeryId) return
    Promise.all([getOrdersSummary(bakeryId), listStock(bakeryId)])
      .then(([summary, stock]) =>
        setCounts({
          newOrders: summary.counts.SUBMITTED ?? 0,
          stockAlerts: stock.filter((s) => s.level !== 'OK' && s.options.length > 0).length,
        }),
      )
      .catch(() => {
        // Counts are a convenience; pages show their own errors.
      })
  }, [bakeryId])

  useEffect(refreshBakery, [refreshBakery])
  useEffect(refreshCounts, [refreshCounts])

  const switchBakery = useCallback((id: string) => {
    remember(id)
    setBakery(null)
    setBakeryId(id)
  }, [])

  if (error) {
    return (
      <main className="main">
        <h1>Couldn't open the dashboard</h1>
        <p className="form-error">{error}</p>
        <p className="muted">Check that the backend is running and that you're signed in.</p>
      </main>
    )
  }
  if (me && me.role === 'ADMIN') {
    return <Navigate to="/admin/overview" replace />
  }
  if (me && !bakeryId) {
    return (
      <main className="main">
        <h1>You're not on a bakery's staff yet</h1>
        <p className="muted">Ask the bakery owner to add {me.email ?? 'your email'} in Settings, then reload this page.</p>
        {firebaseEnabled && (
          <button type="button" className="btn btn-outline" style={{ alignSelf: 'flex-start' }} onClick={() => void signOut(firebaseAuth())}>
            Sign in with another account
          </button>
        )}
      </main>
    )
  }
  if (!me || !bakery) return <p className="loading main">Loading…</p>

  const membership = me.bakeries.find((b) => b.id === bakery.id)
  return (
    <BakeryContext.Provider
      value={{
        me,
        bakery,
        isOwner: membership?.memberRole === 'OWNER',
        ...counts,
        switchBakery,
        refreshBakery,
        refreshCounts,
      }}
    >
      {children}
    </BakeryContext.Provider>
  )
}
