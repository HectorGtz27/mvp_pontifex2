/**
 * API helper — fetches data from the Express backend.
 * In development, Vite proxies /api → http://localhost:3001/api
 */

const BASE = '/api'

async function apiFetch(path) {
  const res = await fetch(`${BASE}${path}`)
  if (!res.ok) throw new Error(`API error ${res.status}: ${res.statusText}`)
  return res.json()
}

export async function fetchDocumentTypes() {
  return apiFetch('/document-types')
}

export async function fetchApplication(id) {
  return apiFetch(`/applications/${id}`)
}

export async function fetchExtractedFields(appId) {
  return apiFetch(`/applications/${appId}/extracted-fields`)
}

export async function fetchSpreadsheet(appId) {
  return apiFetch(`/applications/${appId}/spreadsheet`)
}

export async function fetchScore(appId) {
  return apiFetch(`/applications/${appId}/score`)
}

export async function fetchKpis(appId) {
  return apiFetch(`/applications/${appId}/kpis`)
}

export async function fetchRecommendation(appId) {
  return apiFetch(`/applications/${appId}/recommendation`)
}

export async function fetchCredits() {
  return apiFetch('/credits')
}

export async function createApplication(data) {
  const res = await fetch(`${BASE}/applications`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}

// ─── Empresas ──────────────────────────────────────────────

export async function fetchEmpresas() {
  return apiFetch('/empresas')
}

export async function fetchEmpresa(id) {
  return apiFetch(`/empresas/${id}`)
}

export async function createEmpresa(data) {
  const res = await fetch(`${BASE}/empresas`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}

export async function updateEmpresa(id, data) {
  const res = await fetch(`${BASE}/empresas/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}

export async function deleteEmpresa(id) {
  const res = await fetch(`${BASE}/empresas/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}
