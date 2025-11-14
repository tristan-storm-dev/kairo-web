const isLocalHost = (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
const BACKEND_URL = isLocalHost
  ? 'http://127.0.0.1:5001'
  : `http://${location.hostname}:5001`

export const GENERATE_ENDPOINT = `${BACKEND_URL}/generate-music`
export const ANALYZE_ENDPOINT = `${BACKEND_URL}/analyze-drawing`

export async function analyzeDrawing(imageBase64, featureType) {
  const res = await fetch(ANALYZE_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ imageBase64, featureType })
  })
  if (!res.ok) {
    const err = await res.json().catch(() => null)
    throw new Error(err?.error || `Server error (HTTP ${res.status})`)
  }
  return res.json()
}

export async function generateMusic(promptText) {
  const res = await fetch(GENERATE_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ prompt: promptText })
  })
  if (!res.ok) {
    const err = await res.json().catch(() => null)
    throw new Error(err?.error || `Server error (HTTP ${res.status})`)
  }
  return res.json()
}