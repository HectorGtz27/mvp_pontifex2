import { useState, useRef } from 'react'
import { DOCUMENT_TYPES, MOCK_APPLICATION, MOCK_EXTRACTION_RESULT } from '../data/mock'

export default function DocumentUpload() {
  const [step, setStep] = useState('checklist') // checklist | upload | extraction
  const [selectedType, setSelectedType] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)
  const [uploadError, setUploadError] = useState(null)
  const fileInputRef = useRef(null)

  console.log(`[DocumentUpload] selectedType actual:`, selectedType)

  const handleFileUpload = async (file) => {
    if (!file) return

    console.log(`\n[DocumentUpload] ▶ INICIANDO handleFileUpload()`)
    console.log(`[DocumentUpload] File:`, file.name, `(${(file.size / 1024).toFixed(2)} KB)`)
    console.log(`[DocumentUpload] selectedType:`, selectedType)
    console.log(`[DocumentUpload] selectedType?.id:`, selectedType?.id)

    setUploading(true)
    setUploadError(null)
    setUploadResult(null)

    const formData = new FormData()
    formData.append('file', file)

    console.log(`[DocumentUpload] ▶ Agregando documentTypeId a FormData...`)
    if (selectedType?.id) {
      formData.append('documentTypeId', selectedType.id)
      console.log(`[DocumentUpload] ✓ documentTypeId agregado: "${selectedType.id}"`)
    } else {
      console.error(`[DocumentUpload] ✗ selectedType o selectedType.id está vacío`)
    }

    console.log(`[DocumentUpload] ▶ Enviando fetch a /api/upload...`)
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()

      console.log(`[DocumentUpload] ✓ Response recibida:`, data)

      if (!res.ok || !data.success) {
        console.error(`[DocumentUpload] ✗ Error en respuesta:`, data.error)
        setUploadError(data.error || 'Error al subir el archivo.')
      } else {
        console.log(`[DocumentUpload] ✓ Upload exitoso`)
        setUploadResult(data)
      }
    } catch (err) {
      console.error(`[DocumentUpload] ✗ Error de conexión:`, err.message)
      setUploadError('Error de conexión con el servidor.')
    } finally {
      setUploading(false)
    }
  }

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
                onClick={() => { setStep('checklist'); setUploadResult(null); setUploadError(null) }}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                ← Volver al listado
              </button>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0]
                console.log(`\n[FileInput] onChange triggered`)
                console.log(`[FileInput] file:`, file?.name)
                console.log(`[FileInput] selectedType:`, selectedType)
                console.log(`[FileInput] selectedType?.id:`, selectedType?.id)
                if (file && selectedType?.id) {
                  handleFileUpload(file)
                } else {
                  console.error(`[FileInput] ✗ No se puede subir. file="${file?.name}", selectedType.id="${selectedType?.id}"`)
                }
              }}
            />

            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragOver(false)
                const file = e.dataTransfer.files?.[0]
                console.log(`\n[DragDrop] onDrop triggered`)
                console.log(`[DragDrop] file:`, file?.name)
                console.log(`[DragDrop] selectedType:`, selectedType)
                console.log(`[DragDrop] selectedType?.id:`, selectedType?.id)
                if (file && selectedType?.id) {
                  handleFileUpload(file)
                } else {
                  console.error(`[DragDrop] ✗ No se puede subir. file="${file?.name}", selectedType.id="${selectedType?.id}"`)
                }
              }}
              className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${
                dragOver ? 'border-pontifex-400 bg-pontifex-50' : 'border-slate-200 bg-slate-50'
              }`}
            >
              {uploading ? (
                <div className="flex flex-col items-center gap-3">
                  <svg className="animate-spin h-8 w-8 text-pontifex-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  <p className="text-slate-600">Subiendo archivo a S3...</p>
                </div>
              ) : (
                <>
                  <p className="text-slate-600 mb-4">Arrastra aquí el archivo o haz clic para seleccionar</p>
                  <p className="text-xs text-slate-400 mb-4">Formatos permitidos: PDF, JPG, JPEG, PNG · Máximo 10 MB</p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-4 py-2 bg-pontifex-600 text-white rounded-lg font-medium hover:bg-pontifex-700"
                  >
                    Seleccionar archivo
                  </button>
                </>
              )}
            </div>

            {uploadError && (
              <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {uploadError}
              </div>
            )}

            {uploadResult && (
              <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg space-y-2">
                <p className="text-emerald-800 font-medium">Archivo subido exitosamente</p>
                <p className="text-sm text-emerald-700">Nombre: {uploadResult.fileName}</p>
                <p className="text-sm text-emerald-700 break-all">URL S3: {uploadResult.s3Url}</p>
                <button
                  type="button"
                  onClick={() => { setStep('checklist'); setUploadResult(null) }}
                  className="mt-2 px-4 py-2 bg-pontifex-600 text-white rounded-lg font-medium hover:bg-pontifex-700 text-sm"
                >
                  Volver al listado
                </button>
              </div>
            )}
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
