import { API_BASE, API_KEY } from './config'

export async function submitSale(payload) {
  const res = await fetch(`${API_BASE}?api_key=${encodeURIComponent(API_KEY)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  })
  return res.json()
}

export async function fetchStats({ store = 'ALL', start = '', end = '' } = {}) {
  const qs = new URLSearchParams({ mode:'stats', store, start, end, api_key: API_KEY })
  const res = await fetch(`${API_BASE}?${qs.toString()}`)
  return res.json()
}

export async function fetchRows(limit = 1000) {
  const qs = new URLSearchParams({ mode:'rows', limit: String(limit), api_key: API_KEY })
  const res = await fetch(`${API_BASE}?${qs.toString()}`)
  return res.json()
}
