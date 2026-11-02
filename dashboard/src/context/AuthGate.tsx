import { onAuthStateChanged, type User } from 'firebase/auth'
import { useEffect, useState, type ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { firebaseAuth, firebaseEnabled } from '../lib/firebase'

// Shows the sign in page until someone is signed in. Without Firebase set up,
// it lets everything through and the test login is used instead.
export function AuthGate({ children }: { children: ReactNode }) {
  if (!firebaseEnabled) return <>{children}</>
  return <FirebaseGate>{children}</FirebaseGate>
}

function FirebaseGate({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null | undefined>(undefined)

  useEffect(() => onAuthStateChanged(firebaseAuth(), setUser), [])

  if (user === undefined) return <p className="loading main">Loading…</p>
  if (!user) return <Navigate to="/signin" replace />
  // Keyed on the user, so signing in as someone else reloads their bakery.
  return <div key={user.uid} className="auth-gate-root">{children}</div>
}
