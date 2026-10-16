import { initializeApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'

// Filled in from dashboard/.env.local; see docs/firebase.md.
const config = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
}

// Without a Firebase project the dashboard keeps using the test login (VITE_DEV_USER).
export const firebaseEnabled = Boolean(config.apiKey && config.projectId && config.appId)

let auth: Auth | null = null

export function firebaseAuth(): Auth {
  if (!firebaseEnabled) throw new Error('Firebase is not set up. See docs/firebase.md')
  auth ??= getAuth(initializeApp(config))
  return auth
}

// Firebase's error codes, turned into something staff can act on.
export function authMessage(error: unknown): string {
  const code = (error as { code?: string }).code ?? ''
  const messages: Record<string, string> = {
    'auth/invalid-credential': "That email and password don't match. Check them, or reset your password.",
    'auth/invalid-email': "That doesn't look like an email address.",
    'auth/user-disabled': 'This account has been turned off. Ask the bakery owner.',
    'auth/email-already-in-use': 'There is already an account with that email. Sign in instead.',
    'auth/weak-password': 'Use at least 6 characters for the password.',
    'auth/too-many-requests': 'Too many tries. Wait a few minutes and try again.',
    'auth/network-request-failed': "Couldn't reach Firebase. Check the connection and try again.",
    'auth/popup-blocked': 'The browser blocked the Google window. Allow pop ups for this site and try again.',
    'auth/unauthorized-domain': "This address isn't allowed to sign in yet. Add it under Authentication, Settings, Authorized domains.",
  }
  return messages[code] ?? (error instanceof Error ? error.message : 'Something went wrong. Please try again.')
}
