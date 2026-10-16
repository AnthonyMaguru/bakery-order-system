import { onAuthStateChanged, type User } from 'firebase/auth'
import { useEffect, useState, type ReactNode } from 'react'
import { firebaseAuth, firebaseEnabled } from '../lib/firebase'
import { SignInPage } from '../pages/SignInPage'

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
  if (!user) return <SignInPage />
  // Keyed on the user, so signing in as someone else reloads their bakery.
  return <div key={user.uid}>{children}</div>
}
