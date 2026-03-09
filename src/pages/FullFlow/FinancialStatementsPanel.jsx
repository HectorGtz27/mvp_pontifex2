import { BG_FIELDS, ER_FIELDS } from '../../shared/ocrFields'
import { FS_TYPE_IDS, FS_LABELS, FS_LABELS_SHORT } from './constants'

/**
 * Panel para subir y visualizar Estados Financieros (hasta 3 ejercicios fiscales)
 */
export default function FinancialStatementsPanel({
  fsYear1,
  fsYear2,
  fsYear3,
  setFsYear1,
  setFsYear2,
  setFsYear3,
  fsRef1,
  fsRef2,
  fsRef3,
  fsPanelRef,
  docStatus,
  onClose,
  onFinancialYearUpload,
}) {
  const years = [
    { state: fsYear1, setState: setFsYear1, ref: fsRef1, index: 0 },
    { state: fsYear2, setState: setFsYear2, ref: fsRef2, index: 1 },
    { state: fsYear3, setState: setFsYear3, ref: fsRef3, index: 2 },
  ]

  return (
    <div ref={fsPanelRef} className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-slate-900 text-lg">Estados Financieros</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Sube 1 PDF por ejercicio fiscal. Los datos se extraen automáticamente con OCR + IA.
          </p>
        </div>
        <button 
          type="button" 
          onClick={onClose} 
          className="text-sm text-slate-500 hover:text-slate-700"
        >
          ← Volver al listado
        </button>
      </div>

      {years.map(({ state, setState, ref, index }) => {
        const typeId = FS_TYPE_IDS[index]
        const label = FS_LABELS[index]
        const shortLabel = FS_LABELS_SHORT[index]
        const docSt = docStatus(typeId)
        const isValidated = docSt.status === 'validated'

        return (
          <div key={typeId} className="bg-slate-50 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={`text-lg ${isValidated ? 'text-emerald-500' : 'text-slate-300'}`}>
                  {isValidated ? '✓' : '○'}
                </span>
                <h3 className="font-semibold text-slate-900">{label}</h3>
                {state.data?.periodo && (
                  <span className="px-2 py-0.5 rounded bg-pontifex-100 text-pontifex-700 text-xs font-medium">
                    {state.data.periodo}
                  </span>
                )}
              </div>
              {state.fileName && (
                <span className="text-xs text-slate-500 font-mono">{state.fileName}</span>
              )}
            </div>

            {/* Drop zone */}
            <div
              onDragOver={e => { 
                e.preventDefault()
                setState(prev => ({ ...prev, dragOver: true }))
              }}
              onDragLeave={() => setState(prev => ({ ...prev, dragOver: false }))}
              onDrop={e => { 
                e.preventDefault()
                setState(prev => ({ ...prev, dragOver: false }))
                const files = e.dataTransfer.files
                if (files?.[0]) onFinancialYearUpload(files[0], index)
              }}
              onClick={() => !state.uploading && ref.current?.click()}
              className={`rounded-lg border-2 border-dashed p-8 text-center transition-colors ${
                state.dragOver 
                  ? 'border-pontifex-400 bg-pontifex-50' 
                  : 'border-slate-300 bg-white hover:border-pontifex-300'
              } ${state.uploading ? 'pointer-events-none opacity-70' : 'cursor-pointer'}`}
            >
              {state.uploading ? (
                <div className="flex flex-col items-center gap-2 text-pontifex-600">
                  <svg className="animate-spin h-7 w-7" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                  </svg>
                  <p className="font-medium text-sm">Analizando {shortLabel}…</p>
                  <p className="text-xs text-slate-500">Extrayendo con OCR + IA</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2 text-slate-500">
                  <svg className="h-8 w-8 text-slate-300" fill="none" stroke="currentColor" strokeWidth="1.5" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"/>
                  </svg>
                  <p className="font-medium text-slate-700 text-sm">
                    {state.data ? 'Reemplazar PDF' : `Subir PDF para ${shortLabel}`}
                  </p>
                  <p className="text-xs">Arrastra aquí o haz clic · hasta 30 MB</p>
                </div>
              )}
            </div>

            <input 
              ref={ref} 
              type="file" 
              accept=".pdf" 
              className="hidden" 
              onChange={e => { 
                const file = e.target.files?.[0]
                if (file) onFinancialYearUpload(file, index)
                e.target.value = ''
              }} 
            />

            {/* Extracted data display */}
            {state.data && <ExtractedDataTable data={state.data} />}
          </div>
        )
      })}
    </div>
  )
}

function ExtractedDataTable({ data }) {
  const fmt = v => v == null ? '—' : Number(v).toLocaleString('es-MX')

  return (
    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
      <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
        <span className="font-medium text-slate-800 text-xs">Información extraída</span>
        {data.confianza && (
          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
            data.confianza === 'alta' 
              ? 'bg-emerald-100 text-emerald-700' 
              : data.confianza === 'media' 
                ? 'bg-amber-100 text-amber-700' 
                : 'bg-red-100 text-red-700'
          }`}>
            {data.confianza}
          </span>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <tbody>
            <tr className="bg-blue-50 border-b border-slate-200">
              <td colSpan="2" className="px-3 py-1.5 font-bold uppercase tracking-wider text-blue-700">
                Balance General
              </td>
            </tr>
            {BG_FIELDS.map(({ key, label }) => (
              <tr key={key} className="border-b border-slate-100 hover:bg-slate-50/50">
                <td className="px-3 py-2 text-slate-700">{label}</td>
                <td className="px-3 py-2 text-right font-mono text-slate-800">
                  {fmt((data.balance_general || data)[key])}
                </td>
              </tr>
            ))}
            <tr className="bg-amber-50 border-b border-slate-200">
              <td colSpan="2" className="px-3 py-1.5 font-bold uppercase tracking-wider text-amber-700">
                Estado de Resultados
              </td>
            </tr>
            {ER_FIELDS.map(({ key, label }) => (
              <tr key={key} className="border-b border-slate-100 hover:bg-slate-50/50">
                <td className="px-3 py-2 text-slate-700">{label}</td>
                <td className="px-3 py-2 text-right font-mono text-slate-800">
                  {fmt((data.estado_resultados || data)[key])}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
