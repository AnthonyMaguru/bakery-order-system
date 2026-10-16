import { firebaseAuth, firebaseEnabled } from '../lib/firebase'

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api'

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function authHeaders(): Promise<Record<string, string>> {
  if (firebaseEnabled) {
    // getIdToken refreshes the token when it is close to expiring.
    const token = await firebaseAuth().currentUser?.getIdToken()
    return token ? { Authorization: `Bearer ${token}` } : {}
  }
  // Test login while there is no Firebase project; needs AUTH_DEV_BYPASS=true on the backend.
  const devUser = import.meta.env.VITE_DEV_USER
  if (devUser) return { 'x-dev-user': devUser, 'x-dev-role': 'STAFF' }
  return {}
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  let res: Response
  try {
    res = await fetch(`${BASE_URL}${path}`, {
      ...init,
      headers: {
        'Content-Type': 'application/json',
        ...(await authHeaders()),
        ...init.headers,
      },
    })
  } catch {
    // fetch only throws when the request never reached the server.
    throw new ApiError(0, "Couldn't reach the server. Check the connection and try again.")
  }
  const body = res.status === 204 ? null : await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(res.status, body?.error ?? res.statusText)
  return body as T
}

// JSON request helpers, so callers don't repeat method and body.
export const send = <T>(method: 'POST' | 'PATCH' | 'DELETE', path: string, body?: unknown) =>
  api<T>(path, { method, body: body === undefined ? undefined : JSON.stringify(body) })

export const query = (params: Record<string, string | number | undefined>) => {
  const entries = Object.entries(params).filter((e): e is [string, string | number] => e[1] !== undefined && e[1] !== '')
  return entries.length ? `?${new URLSearchParams(entries.map(([k, v]) => [k, String(v)]))}` : ''
}
