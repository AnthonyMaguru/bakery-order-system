import { api } from './client'

// The body is the image itself; see "Photos" in docs/api.md.
export const uploadPhoto = (photo: Blob) =>
  api<{ id: string; url: string }>('/uploads', { method: 'POST', body: photo, headers: { 'Content-Type': photo.type || 'image/jpeg' } })
