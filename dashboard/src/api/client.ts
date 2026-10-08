const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api'

export class ApiError extends Error {
  status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

async function authHeaders(): Promise<Record<string, string>> {
  // TODO(dashboard lead): once Firebase sign-in is added, send the ID token instead:
  //   return { Authorization: `Bearer ${await auth.currentUser.getIdToken()}` }
  const devUser = import.meta.env.VITE_DEV_USER
  if (devUser) return { 'x-dev-user': devUser, 'x-dev-role': 'STAFF' }
  return {}
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(await authHeaders()),
      ...init.headers,
    },
  })
  const body = res.status === 204 ? null : await res.json()
  if (!res.ok) throw new ApiError(res.status, body?.error ?? res.statusText)
  return body as T
}
