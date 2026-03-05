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

  // Maps raw extractedData from the API into rows for the extraction table
  const buildExtractedFields = (extractedData, docTypeId) => {
    if (!extractedData) return []

    // Bank statement
    if (docTypeId === 'edos_cuenta_bancarios' || docTypeId === 'estado_cuenta_bancario') {
      return [
        { name: 'Banco', value: extractedData.banco_detectado ?? '—', valid: !!extractedData.banco_detectado },
        { name: 'Mes del estado de cuenta', value: extractedData.mes ?? '—', valid: !!extractedData.mes },
        {
          name: 'Total abonos / depósitos',
          value: extractedData.abonos != null
            ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(extractedData.abonos)
            : '—',
          valid: extractedData.abonos != null,
        },
        {
          name: 'Total retiros / cargos',
          value: extractedData.retiros != null
            ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(extractedData.retiros)
            : '—',
          valid: extractedData.retiros != null,
        },
        { name: 'Confianza de extracción', value: extractedData.confianza ?? '—', valid: extractedData.confianza === 'alta' },
      ]
    }

    // Constancia de Situación Fiscal (and other structured docs)
    const CSF_LABELS = {
      razon_social: 'Razón social',
      rfc: 'RFC',
      nombre_comercial: 'Nombre comercial',
      domicilio_fiscal: 'Domicilio fiscal',
      ciudad: 'Ciudad',
      estado: 'Estado',
    }
    return Object.entries(CSF_LABELS)
      .map(([key, label]) => ({
        name: label,
        value: extractedData[key] ?? '—',
        valid: !!extractedData[key],
      }))
      .filter(r => r.value !== '—' || ['Razón social', 'RFC'].includes(r.name))
  }

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
        const extractedFields = buildExtractedFields(data.extractedData, selectedType?.id)
        const enriched = { ...data, extractedFields }
        setUploadResult(enriched)
        if (selectedType?.id) {
          setUploadedDocs(prev => ({ ...prev, [selectedType.id]: { status: 'validated', fileName: file.name } }))
        }
        // Auto-navigate to extraction view if we got data back
        if (data.extractedData) {
          setStep('extraction')
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
                  <p className="text-slate-600 font-medium">Procesando documento...</p>
                  {(selectedType?.id === 'edos_cuenta_bancarios' || selectedType?.id === 'constancia_situacion_fiscal') && (
                    <p className="text-xs text-slate-400">Extrayendo datos con OCR + IA · puede tomar ~30 segundos</p>
                  )}
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

            {uploadResult && !uploadResult.extractedData && (
              <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg space-y-2">
                <p className="text-emerald-800 font-medium">Archivo subido exitosamente</p>
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
              <span className="font-medium text-slate-800">Datos extraídos: {selectedType?.label}</span>
              <span className="text-xs text-slate-500 font-mono truncate max-w-xs">
                {uploadResult?.documento?.nombre_archivo ?? uploadResult?.s3Url?.split('/').pop() ?? '—'}
              </span>
            </div>

            <div className="p-4 space-y-4">

              {/* ── Bank statement summary card ── */}
              {(selectedType?.id === 'edos_cuenta_bancarios' || selectedType?.id === 'estado_cuenta_bancario') &&
                uploadResult?.extractedData && (
                <div className="grid grid-cols-3 gap-3 mb-2">
                  <div className="bg-slate-50 rounded-lg p-3 border border-slate-100 text-center">
                    <p className="text-xs text-slate-500 mb-1">Mes</p>
                    <p className="text-lg font-bold text-slate-800">
                      {uploadResult.extractedData.mes ?? '—'}
                    </p>
                    <p className="text-xs text-slate-400">
                      {uploadResult.extractedData.banco_detectado ?? ''}
                    </p>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-3 border border-emerald-100 text-center">
                    <p className="text-xs text-emerald-600 mb-1">Total abonos</p>
                    <p className="text-lg font-bold text-emerald-700">
                      {uploadResult.extractedData.abonos != null
                        ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(uploadResult.extractedData.abonos)
                        : '—'}
                    </p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-3 border border-red-100 text-center">
                    <p className="text-xs text-red-600 mb-1">Total retiros</p>
                    <p className="text-lg font-bold text-red-700">
                      {uploadResult.extractedData.retiros != null
                        ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(uploadResult.extractedData.retiros)
                        : '—'}
                    </p>
                  </div>
                </div>
              )}

              {/* ── Extracted fields table ── */}
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-slate-500 border-b border-slate-100">
                    <th className="pb-2 font-medium">Campo</th>
                    <th className="pb-2 font-medium">Valor extraído</th>
                    <th className="pb-2 font-medium w-20 text-right">Estado</th>
                  </tr>
                </thead>
                <tbody>
                  {(uploadResult?.extractedFields || []).map((row, i) => (
                    <tr key={i} className="border-b border-slate-50">
                      <td className="py-2 text-slate-600">{row.name}</td>
                      <td className="py-2 font-mono text-slate-800">{row.value}</td>
                      <td className="py-2 text-right">
                        {row.valid
                          ? <span className="text-emerald-600 font-medium">✓</span>
                          : <span className="text-amber-500 text-xs">Revisar</span>
                        }
                      </td>
                    </tr>
                  ))}
                  {(!uploadResult?.extractedFields || uploadResult.extractedFields.length === 0) && (
                    <tr>
                      <td colSpan={3} className="py-4 text-center text-slate-400 text-sm">
                        No se extrajeron campos de este documento.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>

              {uploadResult?.documento?.textract_error && (
                <div className="text-amber-700 text-sm bg-amber-50 p-3 rounded-lg">
                  Advertencia: {uploadResult.documento.textract_error}
                </div>
              )}
            </div>

            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
              <button
                type="button"
                onClick={() => { setStep('upload'); setUploadResult(null) }}
                className="text-sm text-slate-500 hover:text-slate-700"
              >
                ← Subir otro
              </button>
              <button
                type="button"
                onClick={() => { setStep('checklist'); setUploadResult(null) }}
                className="px-4 py-2 bg-pontifex-600 text-white rounded-lg font-medium hover:bg-pontifex-700 text-sm"
              >
                Confirmar y continuar
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
