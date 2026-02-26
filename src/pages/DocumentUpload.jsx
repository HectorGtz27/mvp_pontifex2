import { useState } from 'react'
import { DOCUMENT_TYPES, MOCK_APPLICATION, MOCK_EXTRACTION_RESULT } from '../data/mock'

export default function DocumentUpload() {
  const [step, setStep] = useState('checklist') // checklist | upload | extraction
  const [selectedType, setSelectedType] = useState(null)
  const [dragOver, setDragOver] = useState(false)

  const docStatus = (id) => {
    if (id === 'estados_financieros') return { status: 'validated', fileName: 'Estados_Financieros_2024.pdf' }
    if (['curriculum', 'acta', 'situacion_fiscal'].includes(id)) return { status: 'validated', fileName: `${id}.pdf` }
    if (id === 'declaraciones') return { status: 'pending_review', fileName: 'Declaraciones_2022-24.pdf' }
    return { status: 'pending', fileName: null }
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Carga y validación de documentos</h1>
        <p className="text-slate-600 mt-1">
          Solución al problema 1: datos confiables desde documentos (extracción y validación).
        </p>
      </div>

      {step === 'checklist' && (
        <>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="font-medium text-slate-800">Solicitud {MOCK_APPLICATION.id}</span>
              <span className="text-sm text-slate-600">
                {MOCK_APPLICATION.documentsStatus.validated}/{MOCK_APPLICATION.documentsStatus.total} validados
                {MOCK_APPLICATION.documentsStatus.pendingReview > 0 && (
                  <span className="ml-2 text-amber-600">· {MOCK_APPLICATION.documentsStatus.pendingReview} en revisión</span>
                )}
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
                    {doc.required && <span className="text-xs text-slate-400">Requerido</span>}
                    {s.fileName && (
                      <span className="text-sm text-slate-500 font-mono">{s.fileName}</span>
                    )}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedType(doc)
                        setStep('upload')
                      }}
                      className="text-sm font-medium text-pontifex-600 hover:text-pontifex-700"
                    >
                      {s.status === 'pending' ? 'Subir' : 'Reemplazar'}
                    </button>
                  </li>
                )
              })}
            </ul>
          </div>
          <p className="text-sm text-slate-500">
            Cada documento se clasifica automáticamente. Si el tipo no coincide, se sugiere el correcto. Los campos extraídos se validan antes de usarse en KPIs.
          </p>
        </>
      )}

      {step === 'upload' && (
        <>
          <div className="bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-slate-900">Subir: {selectedType?.label}</h2>
              <button
                type="button"
                onClick={() => setStep('checklist')}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                ← Volver al listado
              </button>
            </div>
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragOver(false)
                setStep('extraction')
              }}
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
                dragOver ? 'border-pontifex-400 bg-pontifex-50' : 'border-slate-200 bg-slate-50'
              }`}
            >
              <p className="text-slate-600 mb-4">Arrastra aquí el PDF o haz clic para seleccionar</p>
              <button
                type="button"
                onClick={() => setStep('extraction')}
                className="px-4 py-2 bg-pontifex-600 text-white rounded-lg font-medium hover:bg-pontifex-700"
              >
                Simular subida (mock)
              </button>
            </div>
          </div>
        </>
      )}

      {step === 'extraction' && (
        <>
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <span className="font-medium text-slate-800">Resultado de extracción</span>
              <span className="text-sm text-slate-600">
                Archivo: {MOCK_EXTRACTION_RESULT.fileName} · Confianza: {(MOCK_EXTRACTION_RESULT.confidence * 100).toFixed(0)}%
              </span>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <span className={`px-2 py-1 rounded text-sm font-medium ${
                  MOCK_EXTRACTION_RESULT.status === 'validated'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {MOCK_EXTRACTION_RESULT.status === 'validated' ? 'Validado' : 'En revisión'}
                </span>
                <span className="text-sm text-slate-600">
                  Tipo detectado: <strong>{DOCUMENT_TYPES.find(d => d.id === MOCK_EXTRACTION_RESULT.suggestedType)?.label}</strong>
                </span>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-100">
                    <th className="pb-2 font-medium">Campo</th>
                    <th className="pb-2 font-medium">Valor extraído</th>
                    <th className="pb-2 font-medium">Fuente</th>
                    <th className="pb-2 font-medium w-20">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {MOCK_EXTRACTION_RESULT.extractedFields.map((row, i) => (
                    <tr key={i} className="border-b border-slate-50">
                      <td className="py-2 text-slate-800">{row.name}</td>
                      <td className="py-2 font-mono text-slate-700">{row.value}</td>
                      <td className="py-2 text-slate-500">{row.source}</td>
                      <td className="py-2">
                        {row.valid ? (
                          <span className="text-emerald-600">✓</span>
                        ) : (
                          <span className="text-amber-600">Revisar</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {MOCK_EXTRACTION_RESULT.validationAlerts?.length > 0 ? (
                <div className="text-amber-700 text-sm bg-amber-50 p-3 rounded-lg">
                  {MOCK_EXTRACTION_RESULT.validationAlerts.map((a, i) => <p key={i}>{a}</p>)}
                </div>
              ) : (
                <p className="text-sm text-slate-500">Sin alertas de validación. Los datos se usarán para el cálculo de KPIs.</p>
              )}
            </div>
            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setStep('checklist')}
                className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100"
              >
                Cerrar
              </button>
              <button
                type="button"
                onClick={() => setStep('checklist')}
                className="px-4 py-2 bg-pontifex-600 text-white rounded-lg font-medium hover:bg-pontifex-700"
              >
                Confirmar y usar datos
              </button>
            </div>
          </div>
          <button
            type="button"
            onClick={() => { setStep('checklist'); setSelectedType(null) }}
            className="text-sm text-slate-500 hover:text-slate-700"
          >
            ← Volver al listado de documentos
          </button>
        </>
      )}
    </div>
  )
}
