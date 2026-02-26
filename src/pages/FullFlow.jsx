import { useState } from 'react'
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts'
import {
  DOCUMENT_TYPES,
  MOCK_APPLICATION,
  MOCK_EXTRACTION_RESULT,
  MOCK_SCORE,
  MOCK_KPIS,
  MOCK_RECOMMENDATION,
} from '../data/mock'

const GRADE_COLORS = { A: 'bg-emerald-100 text-emerald-800', B: 'bg-sky-100 text-sky-800', C: 'bg-amber-100 text-amber-800', D: 'bg-red-100 text-red-800' }

const STEPS = [
  { id: 0, label: 'Datos de la solicitud', short: 'Datos' },
  { id: 1, label: 'Documentos', short: 'Documentos' },
  { id: 2, label: 'Evaluación y decisión', short: 'Decisión' },
]

const INITIAL_FORM = {
  applicant: '',
  requestedAmount: '',
  termMonths: '',
  purpose: '',
  contactEmail: '',
  contactPhone: '',
  organizationType: '',
  notes: '',
}

function docStatus(id) {
  if (id === 'estados_financieros') return { status: 'validated', fileName: 'Estados_Financieros_2024.pdf' }
  if (['curriculum', 'acta', 'situacion_fiscal'].includes(id)) return { status: 'validated', fileName: `${id}.pdf` }
  if (id === 'declaraciones') return { status: 'pending_review', fileName: 'Declaraciones_2022-24.pdf' }
  return { status: 'pending', fileName: null }
}

export default function FullFlow() {
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState(INITIAL_FORM)
  const [docSubStep, setDocSubStep] = useState('checklist')
  const [selectedDocType, setSelectedDocType] = useState(null)
  const [documentsComplete, setDocumentsComplete] = useState(false)
  const [decision, setDecision] = useState(null)
  const [analystNotes, setAnalystNotes] = useState('')

  const formComplete = formData.applicant.trim() && formData.requestedAmount && formData.termMonths && formData.purpose.trim()
  const canGoToStep1 = formComplete
  const canGoToStep2 = documentsComplete

  const updateForm = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }))

  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chartWidgets, setChartWidgets] = useState([])

  const buildChartFromRequest = (q) => {
    const id = `chart-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const scoreData = MOCK_SCORE.scoreBreakdown.map((b) => ({ name: b.name, value: b.score }))
    const kpiData = MOCK_KPIS.map((k) => ({
      name: k.name.length > 12 ? k.name.slice(0, 10) + '…' : k.name,
      value: k.format === 'percent' ? (k.value * 100) : (typeof k.value === 'number' ? k.value : 0),
    }))
    if ((q.includes('gráfico') || q.includes('grafico') || q.includes('gráfica') || q.includes('grafica') || q.includes('chart') || q.includes('graph')) && (q.includes('score') || q.includes('desglose') || q.includes('clasificación'))) {
      if (q.includes('pie') || q.includes('circular') || q.includes('pastel'))
        return { id, type: 'pie', title: 'Desglose del score', data: scoreData }
      return { id, type: 'bar', title: 'Desglose del score (Liquidez, Rentabilidad, Buró, ESG)', data: scoreData }
    }
    if ((q.includes('gráfico') || q.includes('grafico') || q.includes('gráfica') || q.includes('grafica') || q.includes('chart')) && (q.includes('kpi') || q.includes('indicador')))
      return { id, type: 'bar', title: 'Indicadores financieros', data: kpiData }
    return null
  }

  const getMockReply = (question) => {
    const q = question.toLowerCase()
    const applicant = formData.applicant || 'el solicitante'
    const amount = formData.requestedAmount ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(Number(formData.requestedAmount)) : 'el monto solicitado'
    const purpose = formData.purpose || 'el propósito indicado'
    const term = formData.termMonths || '—'
    const chart = buildChartFromRequest(q)
    if (chart)
      return { reply: `He añadido el gráfico **${chart.title}** al dashboard. Puedes pedir también: "gráfico de KPIs" o "gráfica circular del score".`, chart }
    if (q.includes('score') || q.includes('clasificación') || q.includes('calificación') || q.includes('riesgo'))
      return { reply: `La clasificación actual es **${MOCK_SCORE.grade}** (${MOCK_SCORE.gradeLabel}). El score compuesto es ${MOCK_SCORE.composite}/100. El desglose es: Liquidez ${MOCK_SCORE.scoreBreakdown[0].score}, Rentabilidad ${MOCK_SCORE.scoreBreakdown[1].score}, Buró ${MOCK_SCORE.scoreBreakdown[2].score}, ESG ${MOCK_SCORE.scoreBreakdown[3].score}. Buró en rango ${MOCK_SCORE.bureauBand}.` }
    if (q.includes('dscr') || q.includes('capacidad de pago'))
      return { reply: `El DSCR (Debt Service Coverage Ratio) de esta solicitud es **${MOCK_KPIS.find(k => k.name === 'DSCR')?.value ?? '—'}**. El benchmark mínimo es 1.2; está por encima, lo que indica capacidad adecuada para cubrir el servicio de la deuda.` }
    if (q.includes('recomendación') || q.includes('recomienda') || q.includes('aprobar'))
      return { reply: `El sistema recomienda **aprobar con condiciones**. Monto sugerido: ${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(MOCK_RECOMMENDATION.suggestedAmount)}, plazo ${MOCK_RECOMMENDATION.suggestedTermMonths} meses, tasa ${MOCK_RECOMMENDATION.suggestedRate}. Condiciones: ${MOCK_RECOMMENDATION.conditions.join(' ')} Nota del analista: "${MOCK_RECOMMENDATION.analystNotes}"` }
    if (q.includes('monto') || q.includes('cantidad') || q.includes('solicit'))
      return { reply: `${applicant} solicita **${amount}** a **${term}** meses para: ${purpose}. El monto sugerido por el sistema es ${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(MOCK_RECOMMENDATION.suggestedAmount)}.` }
    if (q.includes('kpi') || q.includes('indicador') || q.includes('ratio') || q.includes('roe') || q.includes('liquidez') || q.includes('deuda'))
      return { reply: `Indicadores actuales: Razón Circulante ${MOCK_KPIS.find(k => k.name === 'Razón Circulante')?.value ?? '—'}, DSCR ${MOCK_KPIS.find(k => k.name === 'DSCR')?.value ?? '—'}, Deuda/EBIT ${MOCK_KPIS.find(k => k.name === 'Deuda/EBIT')?.value ?? '—'}, ROE ${(MOCK_KPIS.find(k => k.name === 'ROE')?.value * 100)?.toFixed(2) ?? '—'}%, Margen Neto ${(MOCK_KPIS.find(k => k.name === 'Margen Neto')?.value * 100)?.toFixed(2) ?? '—'}%. Todos cumplen benchmark excepto donde se indica.` }
    if (q.includes('buró') || q.includes('buro'))
      return { reply: `El score de Buró de Crédito está en el rango **${MOCK_SCORE.bureauBand}** (puntuación ${MOCK_SCORE.bureauScore}). Representa el 15% del score compuesto y en este caso está en nivel de riesgo medio.` }
    if (q.includes('condiciones') || q.includes('covenant'))
      return { reply: `Condiciones sugeridas para la aprobación: ${MOCK_RECOMMENDATION.conditions.map((c, i) => `${i + 1}. ${c}`).join(' ')}` }
    return { reply: `Tengo acceso a los datos de esta evaluación: solicitante (${applicant}), monto y plazo, score ${MOCK_SCORE.grade}, KPIs y recomendación. Puedes preguntar por score, DSCR, recomendación, monto, KPIs o condiciones. También puedo **generar gráficos**: pide "gráfico del score", "gráfica de KPIs" o "gráfica circular del score".` }
  }

  const sendChatMessage = () => {
    const text = chatInput.trim()
    if (!text) return
    setChatInput('')
    setChatMessages((prev) => [...prev, { role: 'user', content: text }])
    const result = getMockReply(text)
    const reply = typeof result === 'string' ? result : result.reply
    if (typeof result === 'object' && result.chart)
      setChartWidgets((prev) => [...prev, result.chart])
    setChatMessages((prev) => [...prev, { role: 'assistant', content: reply }])
  }

  const removeChart = (id) => setChartWidgets((prev) => prev.filter((c) => c.id !== id))

  const CHART_COLORS = ['#237a49', '#2d9d6b', '#54b57d', '#8bd1a8']

  const resetFlow = () => {
    setCurrentStep(0)
    setFormData(INITIAL_FORM)
    setDocSubStep('checklist')
    setDocumentsComplete(false)
    setDecision(null)
    setAnalystNotes('')
    setChatMessages([])
    setChatInput('')
    setChartWidgets([])
  }

  return (
    <div className="space-y-8">
      {/* Stepper */}
      <div className="bg-white rounded-xl border border-slate-200 p-4">
        <div className="flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={resetFlow}
            className="text-sm text-slate-500 hover:text-slate-700 shrink-0"
          >
            Reiniciar flujo
          </button>
          {STEPS.map((step, i) => (
            <div key={step.id} className="flex items-center flex-1 last:flex-none">
              <button
                type="button"
                onClick={() => {
                  if (step.id === 0) setCurrentStep(0)
                  if (step.id === 1 && canGoToStep1) setCurrentStep(1)
                  if (step.id === 2 && canGoToStep2) setCurrentStep(2)
                }}
                className={`flex items-center gap-2 w-full ${i < STEPS.length - 1 ? 'max-w-[200px]' : ''}`}
              >
                <span className={`flex shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${currentStep === step.id ? 'bg-pontifex-600 text-white' : ''}
                  ${currentStep > step.id ? 'bg-pontifex-100 text-pontifex-700' : ''}
                  ${currentStep < step.id ? 'bg-slate-100 text-slate-400' : ''}
                `}>
                  {currentStep > step.id ? '✓' : step.id + 1}
                </span>
                <span className={`text-sm font-medium hidden sm:inline ${currentStep >= step.id ? 'text-slate-800' : 'text-slate-400'}`}>
                  {step.short}
                </span>
              </button>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 max-w-[60px] ${currentStep > step.id ? 'bg-pontifex-400' : 'bg-slate-200'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ========== STEP 0: Datos de la solicitud (no extraíbles de documentos) ========== */}
      {currentStep === 0 && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Datos de la solicitud</h1>
            <p className="text-slate-600 mt-1">Información que no se obtiene de los documentos; complétala antes de subir archivos.</p>
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); if (formComplete) setCurrentStep(1) }}
            className="bg-white rounded-xl border border-slate-200 p-6 space-y-6"
          >
            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <label htmlFor="applicant" className="block text-sm font-medium text-slate-700 mb-1">Solicitante / Organización *</label>
                <input
                  id="applicant"
                  type="text"
                  value={formData.applicant}
                  onChange={(e) => updateForm('applicant', e.target.value)}
                  placeholder="Nombre de la organización o razón social"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-pontifex-500 focus:border-pontifex-500"
                />
              </div>
              <div>
                <label htmlFor="organizationType" className="block text-sm font-medium text-slate-700 mb-1">Tipo de organización</label>
                <select
                  id="organizationType"
                  value={formData.organizationType}
                  onChange={(e) => updateForm('organizationType', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:ring-2 focus:ring-pontifex-500 focus:border-pontifex-500"
                >
                  <option value="">Seleccionar</option>
                  <option value="OSC">OSC / A.C.</option>
                  <option value="Fundacion">Fundación</option>
                  <option value="Empresa">Empresa</option>
                  <option value="Cooperativa">Cooperativa</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <label htmlFor="requestedAmount" className="block text-sm font-medium text-slate-700 mb-1">Monto solicitado (MXN) *</label>
                <input
                  id="requestedAmount"
                  type="number"
                  min="1"
                  value={formData.requestedAmount}
                  onChange={(e) => updateForm('requestedAmount', e.target.value)}
                  placeholder="Ej. 850000"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-pontifex-500 focus:border-pontifex-500"
                />
              </div>
              <div>
                <label htmlFor="termMonths" className="block text-sm font-medium text-slate-700 mb-1">Plazo (meses) *</label>
                <input
                  id="termMonths"
                  type="number"
                  min="1"
                  max="120"
                  value={formData.termMonths}
                  onChange={(e) => updateForm('termMonths', e.target.value)}
                  placeholder="Ej. 24"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-pontifex-500 focus:border-pontifex-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="purpose" className="block text-sm font-medium text-slate-700 mb-1">Propósito / Destino del crédito *</label>
              <input
                id="purpose"
                type="text"
                value={formData.purpose}
                onChange={(e) => updateForm('purpose', e.target.value)}
                placeholder="Ej. Capital de trabajo y equipo"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-pontifex-500 focus:border-pontifex-500"
              />
            </div>

            <div className="grid sm:grid-cols-2 gap-6">
              <div>
                <label htmlFor="contactEmail" className="block text-sm font-medium text-slate-700 mb-1">Email de contacto</label>
                <input
                  id="contactEmail"
                  type="email"
                  value={formData.contactEmail}
                  onChange={(e) => updateForm('contactEmail', e.target.value)}
                  placeholder="contacto@organizacion.org"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-pontifex-500 focus:border-pontifex-500"
                />
              </div>
              <div>
                <label htmlFor="contactPhone" className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
                <input
                  id="contactPhone"
                  type="tel"
                  value={formData.contactPhone}
                  onChange={(e) => updateForm('contactPhone', e.target.value)}
                  placeholder="Ej. 55 1234 5678"
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-pontifex-500 focus:border-pontifex-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-slate-700 mb-1">Observaciones</label>
              <textarea
                id="notes"
                rows={2}
                value={formData.notes}
                onChange={(e) => updateForm('notes', e.target.value)}
                placeholder="Información adicional que no proviene de los documentos"
                className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-pontifex-500 focus:border-pontifex-500 resize-none"
              />
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="submit"
                disabled={!formComplete}
                className="px-5 py-2.5 bg-pontifex-600 text-white rounded-lg font-medium hover:bg-pontifex-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Continuar a documentos →
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ========== STEP 1: Documentos ========== */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Paso 1 — Carga y validación de documentos</h1>
              <p className="text-slate-600 mt-1">Sube los documentos; el sistema extrae y valida los datos para el análisis.</p>
            </div>
            <button
              type="button"
              onClick={() => setCurrentStep(0)}
              className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100 text-sm"
            >
              ← Datos de solicitud
            </button>
          </div>

          {docSubStep === 'checklist' && (
            <>
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <span className="font-medium text-slate-800">Solicitud — {formData.applicant || 'Solicitante'}</span>
                  <span className="text-sm text-slate-600">
                    {MOCK_APPLICATION.documentsStatus.validated}/{MOCK_APPLICATION.documentsStatus.total} validados
                  </span>
                </div>
                <ul className="divide-y divide-slate-100">
                  {DOCUMENT_TYPES.map((doc) => {
                    const s = docStatus(doc.id)
                    return (
                      <li key={doc.id} className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50/50">
                        <span className="w-6">
                          {s.status === 'validated' && <span className="text-emerald-500">✓</span>}
                          {s.status === 'pending_review' && <span className="text-amber-500">◐</span>}
                          {s.status === 'pending' && <span className="text-slate-300">○</span>}
                        </span>
                        <span className="flex-1 text-slate-800">{doc.label}</span>
                        {s.fileName && <span className="text-sm text-slate-500 font-mono">{s.fileName}</span>}
                        <button
                          type="button"
                          onClick={() => { setSelectedDocType(doc); setDocSubStep('upload') }}
                          className="text-sm font-medium text-pontifex-600 hover:text-pontifex-700"
                        >
                          {s.status === 'pending' ? 'Subir' : 'Reemplazar'}
                        </button>
                      </li>
                    )
                  })}
                </ul>
              </div>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => { setDocumentsComplete(true); setCurrentStep(2) }}
                  className="px-5 py-2.5 bg-pontifex-600 text-white rounded-lg font-medium hover:bg-pontifex-700"
                >
                  Documentos listos → Ir a evaluación
                </button>
              </div>
            </>
          )}

          {docSubStep === 'upload' && (
            <>
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-slate-900">Subir: {selectedDocType?.label}</h2>
                  <button type="button" onClick={() => setDocSubStep('checklist')} className="text-sm text-slate-500 hover:text-slate-700">← Volver</button>
                </div>
                <div
                  className="border-2 border-dashed border-slate-200 rounded-xl p-12 text-center bg-slate-50"
                >
                  <p className="text-slate-600 mb-4">Arrastra el PDF aquí o haz clic para seleccionar</p>
                  <button
                    type="button"
                    onClick={() => setDocSubStep('extraction')}
                    className="px-4 py-2 bg-pontifex-600 text-white rounded-lg font-medium hover:bg-pontifex-700"
                  >
                    Simular subida
                  </button>
                </div>
              </div>
            </>
          )}

          {docSubStep === 'extraction' && (
            <>
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <span className="font-medium text-slate-800">Resultado de extracción</span>
                  <span className="text-sm text-slate-600">Confianza: {(MOCK_EXTRACTION_RESULT.confidence * 100).toFixed(0)}%</span>
                </div>
                <div className="p-4">
                  <div className="flex items-center gap-3 mb-4">
                    <span className="px-2 py-1 rounded text-sm font-medium bg-emerald-100 text-emerald-800">Validado</span>
                    <span className="text-sm text-slate-600">Tipo detectado: Estados Financieros</span>
                  </div>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left text-slate-500 border-b border-slate-100">
                        <th className="pb-2 font-medium">Campo</th>
                        <th className="pb-2 font-medium">Valor</th>
                        <th className="pb-2 font-medium w-20">Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {MOCK_EXTRACTION_RESULT.extractedFields.map((row, i) => (
                        <tr key={i} className="border-b border-slate-50">
                          <td className="py-2 text-slate-800">{row.name}</td>
                          <td className="py-2 font-mono text-slate-700">{row.value}</td>
                          <td className="py-2">{row.valid ? <span className="text-emerald-600">✓</span> : 'Revisar'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
                  <button type="button" onClick={() => setDocSubStep('checklist')} className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100">Cerrar</button>
                  <button
                    type="button"
                    onClick={() => { setDocSubStep('checklist'); setDocumentsComplete(true) }}
                    className="px-4 py-2 bg-pontifex-600 text-white rounded-lg font-medium hover:bg-pontifex-700"
                  >
                    Confirmar y usar datos
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ========== STEP 2: Dashboard de evaluación + Chatbot ========== */}
      {currentStep === 2 && (
        <div className="grid lg:grid-cols-[1fr_360px] gap-6">
          {/* Dashboard column */}
          <div className="space-y-6 min-w-0">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Dashboard de evaluación</h1>
              <p className="text-slate-600 mt-1">{formData.applicant || 'Solicitante'}</p>
            </div>
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100 text-sm"
            >
              ← Documentos
            </button>
          </div>

          {/* KPI cards row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Monto solicitado</p>
              <p className="text-lg font-semibold text-slate-900 mt-1">
                {formData.requestedAmount ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(Number(formData.requestedAmount)) : '—'}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Score</p>
              <p className="text-lg font-semibold text-slate-900 mt-1 flex items-center gap-2">
                <span className={`inline-flex w-8 h-8 items-center justify-center rounded-lg text-sm font-bold ${GRADE_COLORS[MOCK_SCORE.grade]}`}>
                  {MOCK_SCORE.grade}
                </span>
                {MOCK_SCORE.gradeLabel}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">DSCR</p>
              <p className="text-lg font-semibold text-emerald-600 mt-1">
                {MOCK_KPIS.find(k => k.name === 'DSCR')?.value ?? '—'}
              </p>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Documentos</p>
              <p className="text-lg font-semibold text-slate-900 mt-1">
                {MOCK_APPLICATION.documentsStatus.validated}/{MOCK_APPLICATION.documentsStatus.total} validados
              </p>
            </div>
          </div>

          {/* Main dashboard grid */}
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Score card - prominent */}
            <div className="lg:row-span-2 bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">Clasificación</h2>
              <div className="flex items-center gap-4 mb-6">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-bold ${GRADE_COLORS[MOCK_SCORE.grade]}`}>
                  {MOCK_SCORE.grade}
                </div>
                <div>
                  <p className="font-semibold text-slate-900 text-lg">{MOCK_SCORE.gradeLabel}</p>
                  <p className="text-sm text-slate-500">Compuesto {MOCK_SCORE.composite}/100</p>
                  <p className="text-xs text-slate-400 mt-0.5">{MOCK_SCORE.bureauBand}</p>
                </div>
              </div>
              <div className="space-y-3">
                {MOCK_SCORE.scoreBreakdown.map((b, i) => (
                  <div key={i}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-slate-600">{b.name}</span>
                      <span className="font-mono text-slate-700">{b.score}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-pontifex-500" style={{ width: `${b.score}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Solicitud + Recomendación */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Solicitud</h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-sm">
                  <div><span className="text-slate-500 block">Plazo</span><span className="font-medium">{formData.termMonths || '—'} meses</span></div>
                  <div><span className="text-slate-500 block">Destino</span><span className="font-medium">{formData.purpose || '—'}</span></div>
                  <div><span className="text-slate-500 block">Monto sugerido</span><span className="font-medium">{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(MOCK_RECOMMENDATION.suggestedAmount)}</span></div>
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Recomendación del sistema</h2>
                <p className="text-slate-800 font-medium mb-2">Aprobar con condiciones · {MOCK_RECOMMENDATION.suggestedRate}</p>
                <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
                  {MOCK_RECOMMENDATION.conditions.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
                <p className="text-slate-500 italic text-sm mt-3">"{MOCK_RECOMMENDATION.analystNotes}"</p>
              </div>
            </div>

            {/* KPIs compact */}
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Indicadores</h2>
              <div className="space-y-2">
                {MOCK_KPIS.map((k, i) => (
                  <div key={i} className="flex justify-between items-center text-sm">
                    <span className="text-slate-600">{k.name}</span>
                    <span className="font-mono text-slate-800">
                      {k.format === 'percent' ? `${(k.value * 100).toFixed(2)}%` : k.value}
                      <span className="ml-1 text-slate-400">{k.status === 'ok' ? '✓' : '⚠'}</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Decisión - full width */}
            <div className="lg:col-span-3 bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Decisión del analista</h2>
              <textarea
                placeholder="Motivo (obligatorio para auditoría)"
                value={analystNotes}
                onChange={(e) => setAnalystNotes(e.target.value)}
                className="w-full h-20 px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-pontifex-500 focus:border-pontifex-500 mb-4"
              />
              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={() => setDecision('approved')}
                  className="px-5 py-2.5 rounded-lg font-medium bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  Aprobar (según recomendación)
                </button>
                <button
                  type="button"
                  onClick={() => setDecision('adjusted')}
                  className="px-5 py-2.5 rounded-lg font-medium border border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100"
                >
                  Aprobar con ajustes
                </button>
                <button
                  type="button"
                  onClick={() => setDecision('rejected')}
                  className="px-5 py-2.5 rounded-lg font-medium border border-red-200 text-red-700 bg-red-50 hover:bg-red-100"
                >
                  Rechazar
                </button>
                {decision && (
                  <span className="inline-flex items-center text-sm text-slate-600 pl-2">
                    Decisión: <strong>{decision === 'approved' ? 'Aprobado' : decision === 'adjusted' ? 'Aprobado con ajustes' : 'Rechazado'}</strong>
                  </span>
                )}
              </div>
            </div>

            {/* Gráficos generados por el chatbot */}
            {chartWidgets.length > 0 && (
              <div className="lg:col-span-3">
                <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Gráficos generados</h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  {chartWidgets.map((widget) => (
                    <div key={widget.id} className="bg-white rounded-xl border border-slate-200 p-4 relative">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-slate-800">{widget.title}</span>
                        <button
                          type="button"
                          onClick={() => removeChart(widget.id)}
                          className="text-slate-400 hover:text-red-600 text-xs px-2 py-1 rounded"
                          aria-label="Quitar gráfico"
                        >
                          Quitar
                        </button>
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
                              <Pie
                                data={widget.data}
                                dataKey="value"
                                nameKey="name"
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                label={({ name, value }) => `${name}: ${value}`}
                              >
                                {widget.data.map((_, i) => (
                                  <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                ))}
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
              </div>
            )}
          </div>
          </div>

          {/* Chatbot column */}
          <div className="bg-white rounded-xl border border-slate-200 flex flex-col h-[calc(100vh-12rem)] min-h-[420px] lg:sticky lg:top-24">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-pontifex-100 text-pontifex-700 flex items-center justify-center text-sm">💬</span>
              <div>
                <h2 className="font-semibold text-slate-900">Pregunta sobre los datos</h2>
                <p className="text-xs text-slate-500">Respuestas basadas en esta evaluación</p>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {chatMessages.length === 0 && (
                <p className="text-sm text-slate-500 text-center py-6">
                  Escribe una pregunta sobre el solicitante, el score, los KPIs, la recomendación, etc.
                </p>
              )}
              {chatMessages.map((m, i) => (
                <div
                  key={i}
                  className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[85%] rounded-xl px-3 py-2 text-sm ${
                      m.role === 'user'
                        ? 'bg-pontifex-600 text-white'
                        : 'bg-slate-100 text-slate-800'
                    }`}
                  >
                    {m.content.split('**').map((part, j) => (j % 2 === 1 ? <strong key={j}>{part}</strong> : part))}
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
                <button
                  type="button"
                  onClick={sendChatMessage}
                  className="px-4 py-2 bg-pontifex-600 text-white rounded-lg font-medium text-sm hover:bg-pontifex-700 shrink-0"
                >
                  Enviar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
