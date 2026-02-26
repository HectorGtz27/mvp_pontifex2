import { useState } from 'react'
import {
  DOCUMENT_TYPES,
  MOCK_APPLICATION,
  MOCK_EXTRACTION_RESULT,
  MOCK_SCORE,
  MOCK_KPIS,
  MOCK_RECOMMENDATION,
  MOCK_CREDITS,
} from '../data/mock'

const GRADE_COLORS = { A: 'bg-emerald-100 text-emerald-800', B: 'bg-sky-100 text-sky-800', C: 'bg-amber-100 text-amber-800', D: 'bg-red-100 text-red-800' }
const STATUS_STYLES = { green: 'bg-emerald-100 text-emerald-800', yellow: 'bg-amber-100 text-amber-800', red: 'bg-red-100 text-red-800' }

const STEPS = [
  { id: 1, label: 'Documentos', short: 'Documentos' },
  { id: 2, label: 'Evaluación y decisión', short: 'Decisión' },
  { id: 3, label: 'Monitoreo de covenants', short: 'Covenants' },
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
  const canGoToStep3 = decision === 'approved' || decision === 'adjusted'

  const resetFlow = () => {
    setCurrentStep(1)
    setDocSubStep('checklist')
    setDocumentsComplete(false)
    setDecision(null)
    setAnalystNotes('')
  }

  // Newly approved credit for step 3 (same applicant from flow)
  const newlyApprovedCredit = canGoToStep3 ? {
    id: 'CR-004',
    applicant: MOCK_APPLICATION.applicant,
    amount: MOCK_RECOMMENDATION.suggestedAmount,
    disbursedAt: new Date().toISOString().slice(0, 10),
    termMonths: MOCK_RECOMMENDATION.suggestedTermMonths,
    balance: MOCK_RECOMMENDATION.suggestedAmount,
    gradeAtDisbursement: MOCK_SCORE.grade,
    isNew: true,
    covenants: [
      { name: 'DSCR', current: 1.35, threshold: 1.2, status: 'green', trigger: 'DSCR < 1.2 → alerta' },
      { name: 'Deuda/EBIT', current: 3.2, threshold: 4, status: 'green', trigger: '> 4 → alerta roja' },
      { name: 'Capital de trabajo', current: 150000, status: 'green', trigger: 'Negativo → bloqueo' },
      { name: 'Mora Buró', current: 0, status: 'green', trigger: '> 30 días → revisión' },
    ],
    alerts: [],
  } : null

  const portfolioCredits = newlyApprovedCredit ? [newlyApprovedCredit, ...MOCK_CREDITS] : MOCK_CREDITS

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
                  if (step.id === 3 && canGoToStep3) setCurrentStep(3)
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

      {/* ========== STEP 2: Evaluación y decisión ========== */}
      {currentStep === 2 && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Paso 2 — Evaluación y decisión crediticia</h1>
            <p className="text-slate-600 mt-1">Score, KPIs, recomendación del sistema y decisión del analista.</p>
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h2 className="font-semibold text-slate-900 mb-4">Solicitud</h2>
                <dl className="grid grid-cols-2 gap-3 text-sm">
                  <dt className="text-slate-500">ID</dt>
                  <dd className="font-mono">{MOCK_APPLICATION.id}</dd>
                  <dt className="text-slate-500">Solicitante</dt>
                  <dd>{MOCK_APPLICATION.applicant}</dd>
                  <dt className="text-slate-500">Monto solicitado</dt>
                  <dd>{new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(MOCK_APPLICATION.requestedAmount)}</dd>
                  <dt className="text-slate-500">Plazo</dt>
                  <dd>{MOCK_APPLICATION.termMonths} meses</dd>
                  <dt className="text-slate-500">Documentos</dt>
                  <dd>{MOCK_APPLICATION.documentsStatus.total}/9 validados</dd>
                </dl>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h2 className="font-semibold text-slate-900 mb-4">KPIs calculados</h2>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-slate-500 border-b border-slate-100">
                      <th className="pb-2 font-medium">Indicador</th>
                      <th className="pb-2 font-medium">Valor</th>
                      <th className="pb-2 font-medium">Benchmark</th>
                      <th className="pb-2 font-medium w-16">Estado</th>
                    </tr>
                  </thead>
                  <tbody>
                    {MOCK_KPIS.map((k, i) => (
                      <tr key={i} className="border-b border-slate-50">
                        <td className="py-2 text-slate-800">{k.name}</td>
                        <td className="py-2 font-mono">{k.format === 'percent' ? `${(k.value * 100).toFixed(2)}%` : k.value}</td>
                        <td className="py-2 text-slate-500">{k.benchmark}</td>
                        <td className="py-2">{k.status === 'ok' ? <span className="text-emerald-600">✓</span> : <span className="text-amber-600">⚠</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h2 className="font-semibold text-slate-900 mb-4">Recomendación del sistema</h2>
                <div className="space-y-2 text-sm">
                  <p><span className="text-slate-500">Acción:</span> <span className="font-medium">Aprobar con condiciones</span></p>
                  <p><span className="text-slate-500">Monto sugerido:</span> {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(MOCK_RECOMMENDATION.suggestedAmount)} · {MOCK_RECOMMENDATION.suggestedTermMonths} meses · {MOCK_RECOMMENDATION.suggestedRate}</p>
                  <ul className="list-disc list-inside text-slate-700 mt-2 space-y-1">
                    {MOCK_RECOMMENDATION.conditions.map((c, i) => <li key={i}>{c}</li>)}
                  </ul>
                  <p className="text-slate-600 italic mt-2">"{MOCK_RECOMMENDATION.analystNotes}"</p>
                </div>
              </div>
            </div>
            <div className="space-y-6">
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h2 className="font-semibold text-slate-900 mb-4">Score</h2>
                <div className="flex items-center gap-4 mb-4">
                  <div className={`w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-bold ${GRADE_COLORS[MOCK_SCORE.grade]}`}>
                    {MOCK_SCORE.grade}
                  </div>
                  <div>
                    <p className="font-medium text-slate-800">{MOCK_SCORE.gradeLabel}</p>
                    <p className="text-sm text-slate-500">Compuesto: {MOCK_SCORE.composite}/100 · Buró: {MOCK_SCORE.bureauBand}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  {MOCK_SCORE.scoreBreakdown.map((b, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm">
                      <span className="w-24 text-slate-600">{b.name}</span>
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full bg-pontifex-500" style={{ width: `${b.score}%` }} />
                      </div>
                      <span className="w-8 text-right font-mono">{b.score}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="bg-white rounded-xl border border-slate-200 p-5">
                <h2 className="font-semibold text-slate-900 mb-4">Decisión del analista</h2>
                <textarea
                  placeholder="Motivo (obligatorio para auditoría)"
                  value={analystNotes}
                  onChange={(e) => setAnalystNotes(e.target.value)}
                  className="w-full h-24 px-3 py-2 border border-slate-200 rounded-lg text-sm resize-none focus:ring-2 focus:ring-pontifex-500 focus:border-pontifex-500"
                />
                <div className="flex flex-col gap-2 mt-4">
                  <button
                    type="button"
                    onClick={() => setDecision('approved')}
                    className="w-full py-2.5 rounded-lg font-medium bg-emerald-600 text-white hover:bg-emerald-700"
                  >
                    Aprobar (según recomendación)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDecision('adjusted')}
                    className="w-full py-2.5 rounded-lg font-medium border border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100"
                  >
                    Aprobar con ajustes
                  </button>
                  <button
                    type="button"
                    onClick={() => setDecision('rejected')}
                    className="w-full py-2.5 rounded-lg font-medium border border-red-200 text-red-700 bg-red-50 hover:bg-red-100"
                  >
                    Rechazar
                  </button>
                </div>
                {decision && (
                  <p className="mt-3 text-sm text-slate-600">
                    Decisión: <strong>{decision === 'approved' ? 'Aprobado' : decision === 'adjusted' ? 'Aprobado con ajustes' : 'Rechazado'}</strong>.
                  </p>
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(1)}
              className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100"
            >
              ← Documentos
            </button>
            {canGoToStep3 ? (
              <button
                type="button"
                onClick={() => setCurrentStep(3)}
                className="px-5 py-2.5 bg-pontifex-600 text-white rounded-lg font-medium hover:bg-pontifex-700"
              >
                Ver monitoreo de covenants →
              </button>
            ) : (
              <p className="text-sm text-slate-500">Aprobar o aprobar con ajustes para continuar al monitoreo.</p>
            )}
          </div>
        </div>
      )}

      {/* ========== STEP 3: Covenants ========== */}
      {currentStep === 3 && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Paso 3 — Monitoreo de covenants y triggers</h1>
            <p className="text-slate-600 mt-1">Estado de cada crédito desembolsado y alertas automáticas.</p>
          </div>

          {newlyApprovedCredit && (
            <div className="bg-pontifex-50 border border-pontifex-200 rounded-xl px-4 py-2 text-sm text-pontifex-800">
              <strong>Crédito recién aprobado</strong> (CR-004) aparece en la cartera y será monitoreado con los mismos covenants.
            </div>
          )}

          <div className="grid gap-4">
            {portfolioCredits.map((credit) => (
              <div key={credit.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-medium text-slate-800">{credit.id}</span>
                    {credit.isNew && <span className="px-2 py-0.5 rounded text-xs font-medium bg-pontifex-200 text-pontifex-800">Recién desembolsado</span>}
                    <span className="text-slate-700">{credit.applicant}</span>
                    <span className="text-sm text-slate-500">
                      {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(credit.amount)}
                      {!credit.isNew && ` · Saldo: ${new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(credit.balance)}`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {credit.alerts?.some((a) => a.type === 'red') && <span className="px-2 py-1 rounded text-xs font-medium bg-red-100 text-red-800">Alertas rojas</span>}
                    {credit.alerts?.some((a) => a.type === 'yellow') && !credit.alerts?.some((a) => a.type === 'red') && <span className="px-2 py-1 rounded text-xs font-medium bg-amber-100 text-amber-800">Alerta amarilla</span>}
                    {(!credit.alerts || credit.alerts.length === 0) && <span className="px-2 py-1 rounded text-xs font-medium bg-emerald-100 text-emerald-800">Sin alertas</span>}
                  </div>
                </div>
                <div className="p-4">
                  <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                    {credit.covenants.map((c, i) => (
                      <div key={i} className="border border-slate-100 rounded-lg p-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-slate-700">{c.name}</span>
                          <span className={`text-xs px-1.5 py-0.5 rounded ${STATUS_STYLES[c.status]}`}>
                            {c.status === 'green' ? 'OK' : c.status === 'yellow' ? 'Alerta' : 'Trigger'}
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 mb-1">{c.trigger}</p>
                        {c.current !== undefined && (
                          <p className="text-sm font-mono text-slate-800">
                            Actual: {typeof c.current === 'number' && c.current > 100 ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(c.current) : c.current}
                            {c.threshold !== undefined && <span className="text-slate-500"> / límite {c.threshold}</span>}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                  {credit.alerts && credit.alerts.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-medium text-slate-700">Alertas activas</h4>
                      {credit.alerts.map((a, i) => (
                        <div key={i} className={`text-sm px-3 py-2 rounded-lg ${a.type === 'red' ? 'bg-red-50 text-red-800 border border-red-100' : 'bg-amber-50 text-amber-800 border border-amber-100'}`}>
                          {a.text}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-slate-50 rounded-xl border border-slate-200 p-5 text-sm text-slate-600">
            <h3 className="font-medium text-slate-800 mb-2">Reglas de triggers</h3>
            <ul className="list-disc list-inside space-y-1">
              <li>DSCR &lt; 1.2 → Alerta amarilla</li>
              <li>Deuda/EBIT &gt; 4 → Alerta roja</li>
              <li>Mora en buró &gt; 30 días → Revisión manual</li>
              <li>Capital de trabajo negativo → Bloqueo automático</li>
            </ul>
          </div>

          <div className="flex justify-between">
            <button
              type="button"
              onClick={() => setCurrentStep(2)}
              className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100"
            >
              ← Decisión
            </button>
            <p className="text-sm text-slate-500">Flujo completo. Puedes volver a cualquier paso desde el indicador superior.</p>
          </div>
        </div>
      )}
    </div>
  )
}
