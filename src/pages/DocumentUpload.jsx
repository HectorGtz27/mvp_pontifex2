import { useState, useRef, useEffect } from 'react'
import { fetchDocumentTypes } from '../utils/api'

export default function DocumentUpload() {
  const [step, setStep] = useState('checklist') // checklist | upload | extraction
  const [selectedType, setSelectedType] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)
  const [uploadError, setUploadError] = useState(null)
  const fileInputRef = useRef(null)

  const [documentTypes, setDocumentTypes] = useState([])
  const [uploadedDocs, setUploadedDocs] = useState({})

  useEffect(() => {
    fetchDocumentTypes().then(setDocumentTypes).catch(() => setDocumentTypes([]))
  }, [])

  const handleFileUpload = async (file) => {
    if (!file) return

    setUploading(true)
    setUploadError(null)
    setUploadResult(null)

    const formData = new FormData()
    formData.append('file', file)
    if (selectedType?.id) {
      formData.append('documentTypeId', selectedType.id)
    }

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      const data = await res.json()

      if (!res.ok || !data.success) {
        setUploadError(data.error || 'Error al subir el archivo.')
      } else {
        setUploadResult(data)
        if (selectedType?.id) {
          setUploadedDocs(prev => ({ ...prev, [selectedType.id]: { status: 'validated', fileName: data.fileName } }))
        }
      }
    } catch (err) {
      setUploadError('Error de conexión con el servidor.')
    } finally {
      setUploading(false)
    }
  }

  const docStatus = (id) => {
    if (uploadedDocs[id]) return uploadedDocs[id]
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
              <span className="font-medium text-slate-800">Solicitud</span>
              <span className="text-sm text-slate-600">
                {Object.values(uploadedDocs).filter(d => d.status === 'validated').length}/{documentTypes.length} validados
              </span>
            </div>
            <ul className="divide-y divide-slate-100">
              {documentTypes.map((doc) => {
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
                if (file) handleFileUpload(file)
              }}
            />

            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault()
                setDragOver(false)
                const file = e.dataTransfer.files?.[0]
                if (file) handleFileUpload(file)
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
                Archivo: {uploadResult?.fileName ?? '—'} · Confianza: —
              </span>
            </div>
            <div className="p-4 space-y-4">
              <div className="flex items-center gap-3">
                <span className={`px-2 py-1 rounded text-sm font-medium ${
                  uploadResult?.status === 'validated'
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {uploadResult?.status === 'validated' ? 'Validado' : 'En revisión'}
                </span>
                <span className="text-sm text-slate-600">
                  Tipo detectado: <strong>{selectedType?.label ?? '—'}</strong>
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
                  {(uploadResult?.extractedFields || []).map((row, i) => (
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
              {uploadResult?.validationAlerts?.length > 0 ? (
                <div className="text-amber-700 text-sm bg-amber-50 p-3 rounded-lg">
                  {uploadResult.validationAlerts.map((a, i) => <p key={i}>{a}</p>)}
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
