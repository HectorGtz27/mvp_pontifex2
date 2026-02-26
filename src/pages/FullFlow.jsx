import { useState } from 'react'
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
  { id: 1, label: 'Documentos', short: 'Documentos' },
  { id: 2, label: 'Evaluación y decisión', short: 'Decisión' },
]

function docStatus(id) {
  if (id === 'estados_financieros') return { status: 'validated', fileName: 'Estados_Financieros_2024.pdf' }
  if (['curriculum', 'acta', 'situacion_fiscal'].includes(id)) return { status: 'validated', fileName: `${id}.pdf` }
  if (id === 'declaraciones') return { status: 'pending_review', fileName: 'Declaraciones_2022-24.pdf' }
  return { status: 'pending', fileName: null }
}

export default function FullFlow() {
  const [currentStep, setCurrentStep] = useState(1)
  const [docSubStep, setDocSubStep] = useState('checklist') // checklist | upload | extraction
  const [selectedDocType, setSelectedDocType] = useState(null)
  const [documentsComplete, setDocumentsComplete] = useState(false)
  const [decision, setDecision] = useState(null)
  const [analystNotes, setAnalystNotes] = useState('')

  const canGoToStep2 = documentsComplete

  const resetFlow = () => {
    setCurrentStep(1)
    setDocSubStep('checklist')
    setDocumentsComplete(false)
    setDecision(null)
    setAnalystNotes('')
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
                  if (step.id === 1) setCurrentStep(1)
                  if (step.id === 2 && canGoToStep2) setCurrentStep(2)
                }}
                className={`flex items-center gap-2 w-full ${i < STEPS.length - 1 ? 'max-w-[200px]' : ''}`}
              >
                <span className={`flex shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium
                  ${currentStep === step.id ? 'bg-pontifex-600 text-white' : ''}
                  ${currentStep > step.id ? 'bg-pontifex-100 text-pontifex-700' : ''}
                  ${currentStep < step.id ? 'bg-slate-100 text-slate-400' : ''}
                `}>
                  {currentStep > step.id ? '✓' : step.id}
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

      {/* ========== STEP 1: Documentos ========== */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Paso 1 — Carga y validación de documentos</h1>
            <p className="text-slate-600 mt-1">Sube los documentos; el sistema extrae y valida los datos para el análisis.</p>
          </div>

          {docSubStep === 'checklist' && (
            <>
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <span className="font-medium text-slate-800">Solicitud {MOCK_APPLICATION.id}</span>
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

      {/* ========== STEP 2: Dashboard de evaluación ========== */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Dashboard de evaluación</h1>
              <p className="text-slate-600 mt-1">{MOCK_APPLICATION.id} · {MOCK_APPLICATION.applicant}</p>
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
                {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(MOCK_APPLICATION.requestedAmount)}
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
                  <div><span className="text-slate-500 block">Plazo</span><span className="font-medium">{MOCK_APPLICATION.termMonths} meses</span></div>
                  <div><span className="text-slate-500 block">Destino</span><span className="font-medium">{MOCK_APPLICATION.purpose}</span></div>
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
          </div>
        </div>
      )}
    </div>
  )
}
