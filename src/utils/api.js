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

// ─── Document types (with categories) ──────────────────────
export async function fetchDocumentTypes() {
  return apiFetch('/document-types')
}

// ─── Clientes (empresas) ──────────────────────────────────
export async function fetchClientes({ q, limit, offset } = {}) {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  if (typeof limit === 'number') params.set('limit', String(limit))
  if (typeof offset === 'number') params.set('offset', String(offset))
  const suffix = params.toString() ? `?${params.toString()}` : ''
  return apiFetch(`/clientes${suffix}`)
}

export async function fetchCliente(id) {
  return apiFetch(`/clientes/${id}`)
}

export async function createCliente(data) {
  const res = await fetch(`${BASE}/clientes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}

export async function updateCliente(id, data) {
  const res = await fetch(`${BASE}/clientes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}

// ─── Solicitudes (aplicaciones de crédito) ─────────────────
export async function fetchSolicitudes({ q, limit, offset } = {}) {
  const params = new URLSearchParams()
  if (q) params.set('q', q)
  if (typeof limit === 'number') params.set('limit', String(limit))
  if (typeof offset === 'number') params.set('offset', String(offset))
  const suffix = params.toString() ? `?${params.toString()}` : ''
  return apiFetch(`/solicitudes${suffix}`)
}

export async function fetchSolicitud(id) {
  return apiFetch(`/solicitudes/${id}`)
}

export async function createSolicitud(data) {
  const res = await fetch(`${BASE}/solicitudes`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}

export async function updateSolicitud(id, data) {
  const res = await fetch(`${BASE}/solicitudes/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}

// ─── Documentos, campos extraídos, score, KPIs ────────────
export async function fetchDocuments(solicitudId) {
  return apiFetch(`/solicitudes/${solicitudId}/documents`)
}

export async function fetchExtractedFields(solicitudId) {
  return apiFetch(`/solicitudes/${solicitudId}/extracted-fields`)
}

export async function fetchSpreadsheet(solicitudId) {
  return apiFetch(`/solicitudes/${solicitudId}/spreadsheet`)
}

export async function fetchScore(solicitudId) {
  return apiFetch(`/solicitudes/${solicitudId}/score`)
}

export async function fetchKpis(solicitudId) {
  return apiFetch(`/solicitudes/${solicitudId}/kpis`)
}

export async function calcularLiquidez(solicitudId) {
  const res = await fetch(`${BASE}/solicitudes/${solicitudId}/calcular-liquidez`, {
    method: 'POST',
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}

export async function calcularRentabilidad(solicitudId) {
  const res = await fetch(`${BASE}/solicitudes/${solicitudId}/calcular-rentabilidad`, {
    method: 'POST',
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}

export async function calcularBuro(solicitudId) {
  const res = await fetch(`${BASE}/solicitudes/${solicitudId}/calcular-buro`, {
    method: 'POST',
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}

export async function calcularDscr(solicitudId) {
  const res = await fetch(`${BASE}/solicitudes/${solicitudId}/calcular-dscr`, {
    method: 'POST',
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}

export async function calcularScore(solicitudId) {
  const res = await fetch(`${BASE}/solicitudes/${solicitudId}/calcular-score`, {
    method: 'POST',
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}

export async function fetchRecommendation(solicitudId) {
  return apiFetch(`/solicitudes/${solicitudId}/recommendation`)
}

export async function submitDecision(solicitudId, { type, reason }) {
  const res = await fetch(`${BASE}/solicitudes/${solicitudId}/decision`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, reason }),
  })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}

// ─── Créditos (post-desembolso) ────────────────────────────
export async function fetchCredits() {
  return apiFetch('/credits')
}

// ─── Bancos con convenio ───────────────────────────────────
export async function fetchBancos() {
  return apiFetch('/bancos')
}

export async function fetchBancosMatch(filtros = {}) {
  const params = new URLSearchParams()
  Object.entries(filtros).forEach(([k, v]) => { if (v) params.set(k, v) })
  const suffix = params.toString() ? `?${params.toString()}` : ''
  return apiFetch(`/bancos/match/filtros${suffix}`)
}

export async function createBanco(data) {
  const res = await fetch(`${BASE}/bancos`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `API error ${res.status}`) }
  return res.json()
}

export async function updateBanco(id, data) {
  const res = await fetch(`${BASE}/bancos/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error || `API error ${res.status}`) }
  return res.json()
}

// ─── Cuentas Bancarias ────────────────────────────────────
export async function fetchCuentasBancarias(solicitudId) {
  return apiFetch(`/solicitudes/${solicitudId}/cuentas-bancarias`)
}

export async function createCuentaBancaria(data) {
  const res = await fetch(`${BASE}/cuentas-bancarias`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
  const body = await res.json()
  if (!res.ok) throw new Error(body.error || `API error ${res.status}`)
  return body
}

export async function deleteCuentaBancaria(id) {
  const res = await fetch(`${BASE}/cuentas-bancarias/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`API error ${res.status}`)
  return res.json()
}
