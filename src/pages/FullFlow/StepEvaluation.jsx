import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
import axios from 'axios'
import { GRADE_COLORS, CHART_COLORS } from './constants'

/**
 * Step 2 — Dashboard de evaluación, decisión y chatbot.
 */
export default function StepEvaluation({
  formData,
  scoreData,
  kpisData,
  recommendationData,
  uploadedDocs,
  documentTypes,
  decision,
  analystNotes,
  setAnalystNotes,
  solicitudId,
  onDecision,
  spreadsheetData = [],
  onBackToDocuments,
}) {
  // ── Chat state ──
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
const [chartWidgets, setChartWidgets] = useState(() => {
  try {
    const saved = localStorage.getItem(`charts_${formData?.solicitudId || 'default'}`)
    return saved ? JSON.parse(saved) : []
  } catch {
    return []
  }
});
  const [loadingChat, setLoadingChat] = useState(false)

  const buildChartFromRequest = (q) => {
    const id = `chart-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const sBreakdown = (scoreData?.scoreBreakdown || []).map((b) => ({ name: b.name, value: b.score }))
    const kpiChartData = kpisData.map((k) => ({
      name: k.name.length > 12 ? k.name.slice(0, 10) + '…' : k.name,
      value: k.format === 'percent' ? (k.value * 100) : (typeof k.value === 'number' ? k.value : 0),
    }))
    if ((q.includes('gráfico') || q.includes('grafico') || q.includes('chart')) && (q.includes('score') || q.includes('desglose'))) {
      if (q.includes('pie') || q.includes('circular') || q.includes('pastel'))
        return { id, type: 'pie', title: 'Desglose del score', data: sBreakdown }
      return { id, type: 'bar', title: 'Desglose del score', data: sBreakdown }
    }
    if ((q.includes('gráfico') || q.includes('grafico') || q.includes('chart')) && (q.includes('kpi') || q.includes('indicador'))) {
      return { id, type: 'bar', title: 'Indicadores financieros', data: kpiChartData }
    }
    return null
  }

  const getChatbotReply = async (question, history = []) => {
  try {
    const res = await axios.post('/api/chatbot', { 
      question, 
      history,
      solicitudId   // 👈 ya viene de las props
    })
    return res.data.response
  } catch (err) {
    console.error('[Chat] Error:', err.response?.data || err.message)
    return { type: 'error', message: 'Error al consultar el chatbot.' }
  }
}

  const sendChatMessage = async () => {
    const text = chatInput.trim()
    if (!text) return
    setChatInput('')
    setChatMessages((prev) => [...prev, { role: 'user', content: text }])
    setLoadingChat(true)
    const chart = buildChartFromRequest(text.toLowerCase())
    if (chart) {
      setChatMessages((prev) => [...prev, { role: 'assistant', content: `Puedo añadir este gráfico al dashboard: **${chart.title}**. ¿Quieres que lo agregue?`, chart }])
      setLoadingChat(false)
      return
    }
    const reply = await getChatbotReply(text)

    if (reply?.type === 'error') {
      setChatMessages((prev) => [...prev, { role: 'assistant', content: reply.message }])
    } else if (reply?.type === 'chart') {
      // 👇 Nuevo: mensaje con gráfica embebida
      setChatMessages((prev) => [...prev, { 
        role: 'assistant', 
        content: reply.message, 
        chart: reply.chart       // se renderiza igual que los charts locales
      }])
    } else if (reply?.type === 'answer') {
      setChatMessages((prev) => [...prev, { role: 'assistant', content: reply.message }])
    } else {
      setChatMessages((prev) => [...prev, { role: 'assistant', content: reply?.message || JSON.stringify(reply) }])
    }
    setLoadingChat(false)
  }

  const addChartToDashboard = (chart) => {
  setChartWidgets((prev) => {
    if (prev.some((c) => c.id === chart.id)) return prev
    const updated = [...prev, chart]
    localStorage.setItem(`charts_${formData?.solicitudId || 'default'}`, JSON.stringify(updated))
    return updated
  })
}

  const removeChart = (id) => {
  setChartWidgets((prev) => {
    const updated = prev.filter((c) => c.id !== id)
    localStorage.setItem(`charts_${formData?.solicitudId || 'default'}`, JSON.stringify(updated))
    return updated
  })
}
  

  // Calculate ESG-style metrics from available data
  const getLiquidezLevel = () => {
    // Usar el indicador "Liquidez" (45% del scoring) si está disponible
    const liquidezIndicador = kpisData.find(k => k.name === 'Liquidez')
    if (liquidezIndicador && liquidezIndicador.value != null) {
      const liquidezValue = liquidezIndicador.value
      if (liquidezValue >= 40) return { label: 'Excelente', value: liquidezValue, color: 'emerald' }
      if (liquidezValue >= 30) return { label: 'Bueno', value: liquidezValue, color: 'amber' }
      return { label: 'Bajo', value: liquidezValue, color: 'rose' }
    }
    
    // Fallback: usar Razón Circulante si no hay indicador de liquidez
    const rc = kpisData.find(k => k.name === 'Razón Circulante')?.value
    if (!rc) return { label: 'N/A', value: null, color: 'slate' }
    if (rc > 2) return { label: 'Nulo', value: null, color: 'emerald' }
    if (rc >= 1) return { label: 'Mediano', value: null, color: 'amber' }
    return { label: 'Gran Impacto', value: null, color: 'rose' }
  }

  const getRentabilidadLevel = () => {
    // Usar el indicador "Scoring Rentabilidad" si está disponible
    const scoringRentabilidad = kpisData.find(k => k.name === 'Scoring Rentabilidad')
    if (scoringRentabilidad && scoringRentabilidad.value != null) {
      // El valor viene como decimal (0.9 = 90%), multiplicar por 100
      const scoringValue = scoringRentabilidad.format === 'percent' 
        ? scoringRentabilidad.value * 100 
        : scoringRentabilidad.value
      if (scoringValue >= 90) return { label: 'Nulo', value: scoringValue, color: 'emerald' }
      if (scoringValue >= 70) return { label: 'Mediano', value: scoringValue, color: 'amber' }
      return { label: 'Gran Impacto', value: scoringValue, color: 'rose' }
    }
    
    // Fallback: usar ROE
    const roe = kpisData.find(k => k.name === 'ROE')?.value
    if (roe == null) return { label: 'N/A', color: 'slate' }
    const roePct = roe * 100
    if (roePct > 15) return { label: 'Nulo', color: 'emerald' }
    if (roePct >= 5) return { label: 'Mediano', color: 'amber' }
    return { label: 'Gran Impacto', color: 'rose' }
  }

  const getBuroLevel = () => {
    // Usar el indicador "Score Buró de Crédito" si está disponible
    const scoreBuro = kpisData.find(k => k.name === 'Score Buró de Crédito')
    if (scoreBuro && scoreBuro.value != null) {
      const scoreValue = scoreBuro.value
      // A1/A2 = 100, B1/B2 = 90, C1/C2 = 80, D1/D2 = 70, E = 0
      if (scoreValue === 100) return { label: 'Excelente', value: scoreValue, nivel: formData.nivelBuroCredito || 'A1/A2', color: 'emerald' }
      if (scoreValue === 90) return { label: 'Muy bueno', value: scoreValue, nivel: formData.nivelBuroCredito || 'B1/B2', color: 'emerald' }
      if (scoreValue === 80) return { label: 'Bueno', value: scoreValue, nivel: formData.nivelBuroCredito || 'C1/C2', color: 'amber' }
      if (scoreValue === 70) return { label: 'Aceptable', value: scoreValue, nivel: formData.nivelBuroCredito || 'D1/D2', color: 'amber' }
      if (scoreValue === 0) return { label: 'Alto riesgo', value: scoreValue, nivel: formData.nivelBuroCredito || 'E', color: 'rose' }
    }
    
    // Si no hay score pero sí nivel seleccionado, mostrar el nivel
    if (formData.nivelBuroCredito) {
      const nivel = formData.nivelBuroCredito.toUpperCase()
      if (nivel === 'A1' || nivel === 'A2') {
        return { label: 'Excelente', nivel, value: null, color: 'emerald' }
      }
      if (nivel === 'B1' || nivel === 'B2') {
        return { label: 'Muy bueno', nivel, value: null, color: 'emerald' }
      }
      if (nivel === 'C1' || nivel === 'C2') {
        return { label: 'Bueno', nivel, value: null, color: 'amber' }
      }
      if (nivel === 'D1' || nivel === 'D2') {
        return { label: 'Aceptable', nivel, value: null, color: 'amber' }
      }
      if (nivel === 'E') {
        return { label: 'Alto riesgo', nivel, value: null, color: 'rose' }
      }
      return { label: nivel, nivel, value: null, color: 'slate' }
    }
    
    return { label: 'N/A', color: 'slate' }
  }

  const getESGLevel = () => {
    // Usar el valor ESG del formulario
    const esgValue = formData.esg
    if (!esgValue || esgValue === '') {
      return { label: 'Sin especificar', value: null, color: 'slate' }
    }
    
    const esgNum = Number(esgValue)
    if (esgNum === 100) {
      return { label: 'Gran Impacto', value: 100, color: 'emerald' }
    }
    if (esgNum === 80) {
      return { label: 'Medio Impacto', value: 80, color: 'amber' }
    }
    if (esgNum === 0) {
      return { label: 'Nulo Impacto', value: 0, color: 'rose' }
    }
    return { label: 'Sin especificar', value: null, color: 'slate' }
  }

  // ── Helper: fuentes por sección ─────────────────────────────────
const SECCION_LABEL = {
  balance_general:   'Balance General',
  estado_resultados: 'Estado de Resultados',
  datos_fiscales:    'Datos Fiscales',
}

/**
 * Devuelve las secciones + periodos únicos que contienen
 * al menos un campo que coincide con alguna keyword.
 */
const getSourceDocs = (keywords, data = spreadsheetData) => {
  if (!data?.length) return []
  const seen = new Set()
  const results = []
  data.forEach((row) => {
    const campoLower = (row.campo || '').toLowerCase()
    const match = keywords.some((kw) => campoLower.includes(kw.toLowerCase()))
    if (!match) return
    const label = SECCION_LABEL[row.seccion] || row.seccion || 'Documento'
    const key = `${row.seccion}__${row.periodo || 'sin-periodo'}`
    if (!seen.has(key)) {
      seen.add(key)
      results.push({
        label,
        periodo: row.periodo || null,
        seccion: row.seccion,
      })
    }
  })
  return results.sort((a, b) => (a.periodo || '').localeCompare(b.periodo || ''))
}

// Detectar el periodo más reciente en los datos
const periodoMasReciente = spreadsheetData
  .map(r => r.periodo)
  .filter(Boolean)
  .sort()
  .at(-1)  // el más grande lexicográficamente = el más reciente

// Filtrar solo filas del periodo activo para los cálculos
const spreadsheetActivo = spreadsheetData.filter(
  r => r.periodo === periodoMasReciente
)

const liquidezSources = getSourceDocs(
  [
    'total activo circulante',
    'total pasivo circulante',
    'inventarios',
    'clientes',
    'proveedores',
    'deudores diversos',
  ],
  spreadsheetActivo   // ← solo el periodo activo
)

const rentabilidadSources = getSourceDocs(
  [
    'ventas',
    'resultado del ejercicio',
    'costos de venta',
    'gastos de operación',
    'gastos financieros',
    'impuestos',
  ],
  spreadsheetActivo   // ← solo el periodo activo
)

  const liquidezLevel = getLiquidezLevel()
  const rentabilidadLevel = getRentabilidadLevel()
  const buroLevel = getBuroLevel()
  const esgLevel = getESGLevel()

  // Cascade chart data (dummy data for now)
  const cascadeData = [
    { name: 'Ingresos', value: 100, fill: '#10b981' },
    { name: 'Costos', value: -45, fill: '#ef4444' },
    { name: 'Gastos Op', value: -25, fill: '#f59e0b' },
    { name: 'EBITDA', value: 30, fill: '#3b82f6' },
  ]

  const getLiquidezIndicator = () => {
    // Usar el indicador "Liquidez" (45% del scoring) si está disponible
    const liquidezIndicador = kpisData.find(k => k.name === 'Liquidez')
    if (liquidezIndicador && liquidezIndicador.value != null) {
      const liquidezValue = liquidezIndicador.value
      if (liquidezValue >= 40) return '●'  // Excelente
      if (liquidezValue >= 30) return '◐'  // Bueno
      return '○'  // Bajo
    }
    
    // Fallback: usar Razón Circulante
    const rc = kpisData.find(k => k.name === 'Razón Circulante')?.value
    if (!rc) return '○'
    if (rc > 2) return '●'
    if (rc >= 1.5) return '◐'
    return '○'
  }

  const getRentabilidadIndicator = () => {
    // Usar el indicador "Scoring Rentabilidad" si está disponible
    const scoringRentabilidad = kpisData.find(k => k.name === 'Scoring Rentabilidad')
    if (scoringRentabilidad && scoringRentabilidad.value != null) {
      // El valor viene como decimal (0.9 = 90%), multiplicar por 100
      const scoringValue = scoringRentabilidad.format === 'percent' 
        ? scoringRentabilidad.value * 100 
        : scoringRentabilidad.value
      if (scoringValue >= 90) return '●'  // Excelente
      if (scoringValue >= 70) return '◐'  // Bueno
      return '○'  // Bajo
    }
    
    // Fallback: usar ROE si no hay scoring de rentabilidad
    const roe = kpisData.find(k => k.name === 'ROE')?.value
    if (roe == null) return '○'
    const roePct = roe * 100
    if (roePct > 15) return '●'
    if (roePct >= 7) return '◐'
    return '○'
  }
  // ...existing code...
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard de Evaluación</h1>
          <p className="text-slate-600 mt-1">{formData.razonSocial || 'Solicitante'}</p>
        </div>
        <button
          type="button"
          onClick={onBackToDocuments}
          className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100 text-sm"
        >
          ← Documentos
        </button>
      </div>

      {/* KPI cards row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Monto $</p>
          <p className="text-lg font-semibold text-slate-900 mt-1">
            {formData.monto ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: formData.divisa || 'MXN', maximumFractionDigits: 0 }).format(Number(formData.monto)) : '—'}
          </p>
          <p className="text-xs text-slate-500 mt-1">Resumen Cualitativo</p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Score</p>
          <p className="text-lg font-semibold text-slate-900 mt-1 flex items-center gap-2">
            <span className={`inline-flex w-8 h-8 items-center justify-center rounded-lg text-sm font-bold ${GRADE_COLORS[scoreData?.grade] || 'bg-slate-100 text-slate-400'}`}>
              {scoreData?.grade ?? '—'}
            </span>
            {scoreData?.gradeLabel ?? ''}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">DSCR</p>
          <p className="text-lg font-semibold text-emerald-600 mt-1">
            {kpisData.find(k => k.name === 'DSCR')?.value ?? '—'}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-slate-200 p-4">
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Documentos</p>
          <p className="text-lg font-semibold text-slate-900 mt-1">
            {Object.values(uploadedDocs).filter(d => d.status === 'validated').length}/{documentTypes.reduce((acc, cat) => acc + (cat.tipos?.length || 0), 0)} validados
          </p>
        </div>
      </div>

      {/* Two-column layout: Calificación & ESG | Solicitud details */}
      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left column: Calificación + ESG Metrics */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">Calificación</h2>
          
          {/* Grade Badge */}
          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-slate-100">
            <div className={`w-20 h-20 rounded-2xl flex items-center justify-center text-4xl font-bold ${GRADE_COLORS[scoreData?.grade] || 'bg-slate-100 text-slate-400'}`}>
              {scoreData?.grade ?? '—'}
            </div>
            <div>
              <p className="font-semibold text-slate-900 text-xl">{scoreData?.gradeLabel ?? 'Riesgo Medio'}</p>
              <p className="text-sm text-slate-500 mt-1">Score: {scoreData?.composite ?? '—'}/100</p>
            </div>
          </div>

          {/* ESG-style Metrics */}
          <div className="space-y-4">
            {/* Liquidez */}
            <div className="py-3 border-b border-slate-50">
            <div className="flex items-center justify-between">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-slate-700">Liquidez</span>
                {liquidezLevel.value != null && (
                  <span className="text-xs text-slate-500 mt-0.5">{liquidezLevel.value.toFixed(1)}% de 45%</span>
                )}
              </div>
              <span className={`inline-flex items-center text-xs font-medium px-3 py-1 rounded-full ${
                liquidezLevel.color === 'emerald' ? 'bg-emerald-100 text-emerald-700' :
                liquidezLevel.color === 'amber'   ? 'bg-amber-100 text-amber-700'   :
                liquidezLevel.color === 'rose'    ? 'bg-rose-100 text-rose-700'     :
                'bg-slate-100 text-slate-600'
              }`}>
                {liquidezLevel.label}
              </span>
            </div>
            {/* Fuentes — Liquidez */}
            {liquidezSources.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {liquidezSources.map((src) => (
                  <span
                    key={`${src.seccion}-${src.periodo}`}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-xs"
                  >
                    📄 {src.label}{src.periodo ? ` (${src.periodo})` : ''}
                  </span>
                ))}
              </div>
            )}
            </div>
            

            {/* Rentabilidad */}
            <div className="py-3 border-b border-slate-50">
              <div className="flex items-center justify-between">
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-slate-700">Rentabilidad</span>
                  {rentabilidadLevel.value != null && (
                    <span className="text-xs text-slate-500 mt-0.5">{rentabilidadLevel.value.toFixed(1)}% scoring</span>
                  )}
                </div>
                <span className={`inline-flex items-center text-xs font-medium px-3 py-1 rounded-full ${
                  rentabilidadLevel.color === 'emerald' ? 'bg-emerald-100 text-emerald-700' :
                  rentabilidadLevel.color === 'amber'   ? 'bg-amber-100 text-amber-700'   :
                  rentabilidadLevel.color === 'rose'    ? 'bg-rose-100 text-rose-700'     :
                  'bg-slate-100 text-slate-600'
                }`}>
                  {rentabilidadLevel.label}
                </span>
              </div>
              {/* Fuentes */}
              {rentabilidadSources.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {rentabilidadSources.map((src) => (
                    <span
                      key={`${src.seccion}-${src.periodo}`}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-500 text-xs"
                    >
                      📄 {src.label}{src.periodo ? ` (${src.periodo})` : ''}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {/* Buró de Crédito */}
            <div className="flex items-center justify-between py-3 border-b border-slate-50">
              <div className="flex flex-col">
                <span className="text-sm font-medium text-slate-700">Buró de Crédito</span>
                {buroLevel.value != null && (
                  <span className="text-xs text-slate-500 mt-0.5">Nivel {buroLevel.nivel} — {buroLevel.value} pts</span>
                )}
              </div>
              <span className={`inline-flex items-center text-xs font-medium px-3 py-1 rounded-full ${
                buroLevel.color === 'emerald' ? 'bg-emerald-100 text-emerald-700' :
                buroLevel.color === 'amber' ? 'bg-amber-100 text-amber-700' :
                buroLevel.color === 'rose' ? 'bg-rose-100 text-rose-700' :
                'bg-slate-100 text-slate-600'
              }`}>
                {buroLevel.label}
              </span>
            </div>

            {/* ESG */}
            <div className="flex items-center justify-between py-3">
              <span className="text-sm font-medium text-slate-700">ESG</span>
              <span className={`inline-flex items-center text-xs font-medium px-3 py-1 rounded-full ${
                esgLevel.color === 'emerald' ? 'bg-emerald-100 text-emerald-700' :
                esgLevel.color === 'amber' ? 'bg-amber-100 text-amber-700' :
                esgLevel.color === 'rose' ? 'bg-rose-100 text-rose-700' :
                'bg-slate-100 text-slate-600'
              }`}>
                {esgLevel.label}
              </span>
            </div>
          </div>
          {/* Close the left column div */}
        </div>

        {/* Right column: Solicitud details + cascade chart */}
        <div className="bg-white rounded-xl border border-slate-200 p-5">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">Solicitud</h2>
          
          {/* Solicitud details */}
          <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b border-slate-100">
            <div>
              <span className="text-xs text-slate-500 block mb-1">Plazo</span>
              <span className="text-base font-semibold text-slate-900">{formData.plazoDeseado || '—'}</span>
            </div>
            <div>
              <span className="text-xs text-slate-500 block mb-1">Objetivo Monto</span>
              <span className="text-base font-semibold text-slate-900">
                {formData.monto ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: formData.divisa || 'MXN', maximumFractionDigits: 0 }).format(Number(formData.monto)) : '—'}
              </span>
            </div>
            <div className="col-span-2">
              <span className="text-xs text-slate-500 block mb-1">Sector</span>
              <span className="text-base font-medium text-slate-900">{formData.destino || '—'}</span>
            </div>
          </div>

          {/* Cascade chart */}
          <div className="mb-6">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Gráfica de Cascada Parciales</h3>
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={cascadeData} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
                  <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                    {cascadeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Traffic light indicators */}
          <div>
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">Razones</h3>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-700">Liquidez</span>
                <span className={`text-2xl ${
                  getLiquidezIndicator() === '●' ? 'text-emerald-500' :
                  getLiquidezIndicator() === '◐' ? 'text-amber-500' :
                  'text-slate-300'
                }`}>
                  {getLiquidezIndicator()}
                </span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-700">ROE</span>
                <span className={`text-2xl ${
                  getRentabilidadIndicator() === '●' ? 'text-emerald-500' :
                  getRentabilidadIndicator() === '◐' ? 'text-amber-500' :
                  'text-slate-300'
                }`}>
                  {getRentabilidadIndicator()}
                </span>
              </div>
            </div>
          </div>

          {/* Venta indicator */}
          <div className="mt-4 pt-4 border-t border-slate-100">
            <span className="text-xs text-slate-500">Venta</span>
          </div>
        </div>
      </div>

      {/* Gráficos generados por el chatbot */}
      {chartWidgets.length > 0 && (
        <div className="grid sm:grid-cols-2 gap-4">
          {chartWidgets.map((widget) => (
            <div key={widget.id} className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm font-medium text-slate-800">{widget.title}</span>
                <button type="button" onClick={() => removeChart(widget.id)} className="text-slate-400 hover:text-red-600 text-xs px-2 py-1 rounded" aria-label="Quitar gráfico">Quitar</button>
              </div>
              <div className="h-64">
                {widget.type === 'bar' && (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={widget.data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="value" fill="#237a49" radius={[4, 4, 0, 0]} name="Valor" />
                    </BarChart>
                  </ResponsiveContainer>
                )}
                {widget.type === 'pie' && (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={widget.data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, value }) => `${name}: ${value}`}>
                        {widget.data.map((_, i) => (<Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />))}
                      </Pie>
                      <Tooltip />
                      <Legend />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Decisión section */}
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Decisión del analista</h2>
        <textarea
          placeholder="Motivo (obligatorio para auditoría)"
          value={analystNotes}
          onChange={(e) => setAnalystNotes(e.target.value)}
          className="w-full h-20 px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-pontifex-500 focus:border-pontifex-500 mb-4"
        />
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => onDecision('approved')} className="px-5 py-2.5 rounded-lg font-medium bg-emerald-600 text-white hover:bg-emerald-700">Aprobar (según recomendación)</button>
          <button type="button" onClick={() => onDecision('adjusted')} className="px-5 py-2.5 rounded-lg font-medium border border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100">Aprobar con ajustes</button>
          <button type="button" onClick={() => onDecision('rejected')} className="px-5 py-2.5 rounded-lg font-medium border border-red-200 text-red-700 bg-red-50 hover:bg-red-100">Rechazar</button>
          {decision && (
            <span className="inline-flex items-center text-sm text-slate-600 pl-2">
              Decisión: <strong>{decision === 'approved' ? 'Aprobado' : decision === 'adjusted' ? 'Aprobado con ajustes' : 'Rechazado'}</strong>
            </span>
          )}
        </div>
      </div>

      {/* Chat IA section - moved to bottom, full width */}
      <div className="bg-white rounded-xl border border-slate-200 flex flex-col h-[28rem]">
        <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
          <span className="w-8 h-8 rounded-lg bg-pontifex-100 text-pontifex-700 flex items-center justify-center text-sm">💬</span>
          <div>
            <h2 className="font-semibold text-slate-900">Chat con IA</h2>
            <p className="text-xs text-slate-500">Pregunta sobre los datos de evaluación</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {chatMessages.length === 0 && (
            <p className="text-sm text-slate-500 text-center py-6">
              Escribe una pregunta sobre el solicitante, el score, los KPIs, la recomendación, etc.
            </p>
          )}
          {chatMessages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${m.role === 'user' ? 'bg-pontifex-600 text-white' : 'bg-slate-100 text-slate-800'}`}>
                {m.content.split('**').map((part, j) => (j % 2 === 1 ? <strong key={j}>{part}</strong> : part))}
                {m.role === 'assistant' && m.chart && (
                  <div className="mt-2 pt-2 border-t border-slate-200/80 space-y-2">
                    <div className="w-full min-w-[240px] h-40 rounded-lg overflow-hidden bg-white/80">
                      {m.chart.type === 'bar' && (
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart data={m.chart.data} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                            <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                            <YAxis tick={{ fontSize: 9 }} width={24} />
                            <Tooltip />
                            <Bar dataKey="value" fill="#237a49" radius={[2, 2, 0, 0]} name="Valor" />
                          </BarChart>
                        </ResponsiveContainer>
                      )}
                      {m.chart.type === 'pie' && (
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie data={m.chart.data} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={52} label={({ name, value }) => `${name}: ${value}`}>
                              {m.chart.data.map((_, idx) => (<Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />))}
                            </Pie>
                            <Tooltip />
                            <Legend wrapperStyle={{ fontSize: 10 }} />
                          </PieChart>
                        </ResponsiveContainer>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => addChartToDashboard(m.chart)}
                      disabled={chartWidgets.some((c) => c.id === m.chart.id)}
                      className="text-xs font-medium px-2.5 py-1.5 rounded-lg bg-pontifex-600 text-white hover:bg-pontifex-700 disabled:opacity-60 disabled:cursor-default disabled:bg-slate-400"
                    >
                      {chartWidgets.some((c) => c.id === m.chart.id) ? 'Añadido al dashboard' : 'Añadir al dashboard'}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        <div className="p-3 border-t border-slate-200">
          <div className="flex gap-2">
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && sendChatMessage()}
              placeholder="Ej. ¿Cuál es el DSCR? ¿Por qué score B?"
              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm placeholder-slate-400 focus:ring-2 focus:ring-pontifex-500 focus:border-pontifex-500"
            />
            <button type="button" onClick={sendChatMessage} className="px-4 py-2 bg-pontifex-600 text-white rounded-lg font-medium text-sm hover:bg-pontifex-700 shrink-0">Enviar</button>
          </div>
        </div>
      </div>
    </div>
  )
}