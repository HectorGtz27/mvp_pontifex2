import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, PieChart, Pie, Cell, Legend,
} from 'recharts'
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
  onDecision,
  onBackToDocuments,
}) {
  // ── Chat state ──
  const [chatMessages, setChatMessages] = useState([])
  const [chatInput, setChatInput] = useState('')
  const [chartWidgets, setChartWidgets] = useState([])

  const buildChartFromRequest = (q) => {
    const id = `chart-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
    const sBreakdown = (scoreData?.scoreBreakdown || []).map((b) => ({ name: b.name, value: b.score }))
    const kpiChartData = kpisData.map((k) => ({
      name: k.name.length > 12 ? k.name.slice(0, 10) + '…' : k.name,
      value: k.format === 'percent' ? (k.value * 100) : (typeof k.value === 'number' ? k.value : 0),
    }))
    if ((q.includes('gráfico') || q.includes('grafico') || q.includes('gráfica') || q.includes('grafica') || q.includes('chart') || q.includes('graph')) && (q.includes('score') || q.includes('desglose') || q.includes('clasificación'))) {
      if (q.includes('pie') || q.includes('circular') || q.includes('pastel'))
        return { id, type: 'pie', title: 'Desglose del score', data: sBreakdown }
      return { id, type: 'bar', title: 'Desglose del score (Liquidez, Rentabilidad, Buró, ESG)', data: sBreakdown }
    }
    if ((q.includes('gráfico') || q.includes('grafico') || q.includes('gráfica') || q.includes('grafica') || q.includes('chart')) && (q.includes('kpi') || q.includes('indicador')))
      return { id, type: 'bar', title: 'Indicadores financieros', data: kpiChartData }
    return null
  }

  const getMockReply = (question) => {
    const q = question.toLowerCase()
    const applicant = formData.razonSocial || 'el solicitante'
    const amount = formData.monto ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: formData.divisa || 'MXN', maximumFractionDigits: 0 }).format(Number(formData.monto)) : 'el monto solicitado'
    const purpose = formData.destino || 'el propósito indicado'
    const term = formData.plazoDeseado || '—'
    const chart = buildChartFromRequest(q)
    if (chart)
      return { reply: `Puedo añadir este gráfico al dashboard: **${chart.title}**. ¿Quieres que lo agregue?`, chart }
    const sc = scoreData || {}
    const bd = sc.scoreBreakdown || []
    const rc = recommendationData || {}
    const kp = kpisData || []
    if (q.includes('score') || q.includes('clasificación') || q.includes('calificación') || q.includes('riesgo'))
      return { reply: `La clasificación actual es **${sc.grade ?? '—'}** (${sc.gradeLabel ?? '—'}). El score compuesto es ${sc.composite ?? '—'}/100. El desglose es: ${bd.map(b => `${b.name} ${b.score}`).join(', ')}. Buró en rango ${sc.bureauBand ?? '—'}.` }
    if (q.includes('dscr') || q.includes('capacidad de pago'))
      return { reply: `El DSCR (Debt Service Coverage Ratio) de esta solicitud es **${kp.find(k => k.name === 'DSCR')?.value ?? '—'}**. El benchmark mínimo es 1.2; está por encima, lo que indica capacidad adecuada para cubrir el servicio de la deuda.` }
    if (q.includes('recomendación') || q.includes('recomienda') || q.includes('aprobar'))
      return { reply: `El sistema recomienda **aprobar con condiciones**. Monto sugerido: ${rc.suggestedAmount ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(rc.suggestedAmount) : '—'}, plazo ${rc.suggestedTermMonths ?? '—'} meses, tasa ${rc.suggestedRate ?? '—'}. Condiciones: ${(rc.conditions || []).join(' ')} Nota del analista: "${rc.analystNotes ?? ''}"` }
    if (q.includes('monto') || q.includes('cantidad') || q.includes('solicit'))
      return { reply: `${applicant} solicita **${amount}** a **${term}** para: ${purpose}. El monto sugerido por el sistema es ${rc.suggestedAmount ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: formData.divisa || 'MXN', maximumFractionDigits: 0 }).format(rc.suggestedAmount) : '—'}.` }
    if (q.includes('kpi') || q.includes('indicador') || q.includes('ratio') || q.includes('roe') || q.includes('liquidez') || q.includes('deuda'))
      return { reply: `Indicadores actuales: Razón Circulante ${kp.find(k => k.name === 'Razón Circulante')?.value ?? '—'}, DSCR ${kp.find(k => k.name === 'DSCR')?.value ?? '—'}, Deuda/EBIT ${kp.find(k => k.name === 'Deuda/EBIT')?.value ?? '—'}, ROE ${kp.find(k => k.name === 'ROE')?.value != null ? (kp.find(k => k.name === 'ROE').value * 100).toFixed(2) : '—'}%, Margen Neto ${kp.find(k => k.name === 'Margen Neto')?.value != null ? (kp.find(k => k.name === 'Margen Neto').value * 100).toFixed(2) : '—'}%. Todos cumplen benchmark excepto donde se indica.` }
    if (q.includes('buró') || q.includes('buro'))
      return { reply: `El score de Buró de Crédito está en el rango **${sc.bureauBand ?? '—'}** (puntuación ${sc.bureauScore ?? '—'}). Representa el 15% del score compuesto y en este caso está en nivel de riesgo medio.` }
    if (q.includes('condiciones') || q.includes('covenant'))
      return { reply: `Condiciones sugeridas para la aprobación: ${(rc.conditions || []).map((c, i) => `${i + 1}. ${c}`).join(' ')}` }
    return { reply: `Tengo acceso a los datos de esta evaluación: solicitante (${applicant}), monto y plazo, score ${sc.grade ?? '—'}, KPIs y recomendación. Puedes preguntar por score, DSCR, recomendación, monto, KPIs o condiciones. También puedo **generar gráficos**` }
  }

  const sendChatMessage = () => {
    const text = chatInput.trim()
    if (!text) return
    setChatInput('')
    setChatMessages((prev) => [...prev, { role: 'user', content: text }])
    const result = getMockReply(text)
    const reply = typeof result === 'string' ? result : result.reply
    const assistantMsg = typeof result === 'object' && result.chart
      ? { role: 'assistant', content: reply, chart: result.chart }
      : { role: 'assistant', content: reply }
    setChatMessages((prev) => [...prev, assistantMsg])
  }

  const addChartToDashboard = (chart) => {
    setChartWidgets((prev) => (prev.some((c) => c.id === chart.id) ? prev : [...prev, chart]))
  }

  const removeChart = (id) => setChartWidgets((prev) => prev.filter((c) => c.id !== id))

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-6">
      {/* Dashboard column */}
      <div className="space-y-6 min-w-0">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Dashboard de evaluación</h1>
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
            <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Monto solicitado</p>
            <p className="text-lg font-semibold text-slate-900 mt-1">
              {formData.monto ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: formData.divisa || 'MXN', maximumFractionDigits: 0 }).format(Number(formData.monto)) : '—'}
            </p>
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

        {/* Main dashboard grid */}
        <div className="grid lg:grid-cols-3 gap-6">
          {/* Score card - prominent */}
          <div className="lg:row-span-2 bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-4">Clasificación</h2>
            <div className="flex items-center gap-4 mb-6">
              <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl font-bold ${GRADE_COLORS[scoreData?.grade] || 'bg-slate-100 text-slate-400'}`}>
                {scoreData?.grade ?? '—'}
              </div>
              <div>
                <p className="font-semibold text-slate-900 text-lg">{scoreData?.gradeLabel ?? ''}</p>
                <p className="text-sm text-slate-500">Compuesto {scoreData?.composite ?? '—'}/100</p>
                <p className="text-xs text-slate-400 mt-0.5">{scoreData?.bureauBand ?? ''}</p>
              </div>
            </div>
            <div className="space-y-3">
              {(scoreData?.scoreBreakdown || []).map((b, i) => (
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
                <div><span className="text-slate-500 block">Plazo</span><span className="font-medium">{formData.plazoDeseado || '—'}</span></div>
                <div><span className="text-slate-500 block">Destino</span><span className="font-medium">{formData.destino || '—'}</span></div>
                <div><span className="text-slate-500 block">Monto sugerido</span><span className="font-medium">{recommendationData?.suggestedAmount ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: formData.divisa || 'MXN', maximumFractionDigits: 0 }).format(recommendationData.suggestedAmount) : '—'}</span></div>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Recomendación del sistema</h2>
              <p className="text-slate-800 font-medium mb-2">{recommendationData?.action === 'approve_conditional' ? 'Aprobar con condiciones' : recommendationData?.action ?? '—'} · {recommendationData?.suggestedRate ?? ''}</p>
              <ul className="text-sm text-slate-600 space-y-1 list-disc list-inside">
                {(recommendationData?.conditions || []).map((c, i) => <li key={i}>{c}</li>)}
              </ul>
              <p className="text-slate-500 italic text-sm mt-3">"{recommendationData?.analystNotes ?? ''}"</p>
            </div>
          </div>

          {/* KPIs compact */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide mb-3">Indicadores</h2>
            <div className="space-y-2">
              {kpisData.map((k, i) => (
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

          {/* Gráficos generados por el chatbot */}
          {chartWidgets.length > 0 && (
            <div className="lg:col-span-3 grid sm:grid-cols-2 gap-4">
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
