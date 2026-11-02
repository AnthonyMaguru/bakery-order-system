// Shrinks a photo in the browser before upload, so even a big phone photo stays
// well under the API's 2 MB limit: at most 1600 px on the long side, as JPEG.
export async function compressImage(file: Blob, maxSide = 1600, quality = 0.82): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error("This browser can't prepare the photo")
  // Transparent PNGs get a white background instead of turning black as JPEG.
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("Couldn't prepare the photo"))), 'image/jpeg', quality),
  )
}

// Resolves any image URL so it can be reliably loaded in the browser,
// remapping emulator hosts (10.0.2.2), test ports, or relative upload paths to the active API server.
export function resolveImageUrl(url: string | null | undefined): string {
  if (!url) return ''
  const trimmed = url.trim()
  if (!trimmed) return ''

  // Internal placeholder URLs cannot be loaded directly in the browser
  if (trimmed.startsWith('pollinations://')) {
    return ''
  }

  // If it's a backend upload, route it through the current API base URL
  const uploadMatch = trimmed.match(/\/uploads\/([a-zA-Z0-9_-]+)/)
  if (uploadMatch) {
    const uploadId = uploadMatch[1]
    const configuredApi = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:4000/api'
    const apiBase = configuredApi.startsWith('http')
      ? configuredApi
      : `${window.location.origin}${configuredApi}`
    return `${apiBase.replace(/\/$/, '')}/uploads/${uploadId}`
  }

  // Handle Android emulator loopback IPs if any linger
  if (trimmed.includes('10.0.2.2')) {
    return trimmed.replace(/10\.0\.2\.2(:\d+)?/, (_, port) => `${window.location.hostname}${port || ''}`)
  }

  return trimmed
}
