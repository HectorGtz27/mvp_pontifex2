import { useState, useRef, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
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
  fetchDocumentTypes,
  fetchSpreadsheet,
  fetchScore,
  fetchKpis,
  fetchRecommendation,
  fetchSolicitud,
  createCliente,
  createSolicitud,
  submitDecision,
} from '../utils/api'
import { downloadMasterClientXlsx } from '../utils/masterClientXlsx'

const GRADE_COLORS = { A: 'bg-emerald-100 text-emerald-800', B: 'bg-sky-100 text-sky-800', C: 'bg-amber-100 text-amber-800', D: 'bg-red-100 text-red-800' }

const STEPS = [
  { id: 0, label: 'Datos de la solicitud', short: 'Datos' },
  { id: 1, label: 'Documentos', short: 'Documentos' },
  { id: 2, label: 'Evaluación y decisión', short: 'Decisión' },
]

const INITIAL_FORM = {
  // ── Cliente (empresa) ──
  razonSocial: '',
  nombreComercial: '',
  telefono: '',
  celular: '',
  correoElectronico: '',
  paginaWeb: '',
  numEmpleadosPermanentes: '',
  numEmpleadosEventuales: '',
  // ── Solicitud ──
  monto: '',
  divisa: 'MXN',
  plazoDeseado: '',
  destino: '',
  tasaObjetivo: '',
  tipoColateral: '',
  nivelVentasAnuales: '',
  margenRealUtilidad: '',
  situacionBuroCredito: '',
  notas: '',
}

export default function FullFlow() {
  const location = useLocation()
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState(INITIAL_FORM)
  const [docSubStep, setDocSubStep] = useState('checklist')
  const [selectedDocType, setSelectedDocType] = useState(null)
  const [documentsComplete, setDocumentsComplete] = useState(false)
  const [decision, setDecision] = useState(null)
  const [analystNotes, setAnalystNotes] = useState('')
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)
  const [uploadError, setUploadError] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [extractedFields, setExtractedFields] = useState(null)
  const [confirmingData, setConfirmingData] = useState(false)
  const [currentDocumentData, setCurrentDocumentData] = useState(null) // Data from existing document being replaced
  const fileInputRef = useRef(null)

  // ── API-driven state ──
  const [clienteId, setClienteId] = useState(null)
  const [solicitudId, setSolicitudId] = useState(null)
  const [documentTypes, setDocumentTypes] = useState([])
  const [uploadedDocs, setUploadedDocs] = useState({}) // { [tipo_documento]: { fileName, status, documentoId } }
  const [spreadsheetData, setSpreadsheetData] = useState([])
  const [scoreData, setScoreData] = useState(null)
  const [kpisData, setKpisData] = useState([])
  const [recommendationData, setRecommendationData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [savingApp, setSavingApp] = useState(false)

  // ── Load document types on mount ──
  useEffect(() => {
    fetchDocumentTypes()
      .then(setDocumentTypes)
      .catch(() => setDocumentTypes([]))
  }, [])

  // ── Load documents when entering documents step (Step 1) ──
  useEffect(() => {
    if (solicitudId && currentStep === 1) {
      fetch(`/api/solicitudes/${solicitudId}/documents`)
        .then(res => res.ok ? res.json() : [])
        .then(docs => {
          const docsMap = {}
          docs.forEach(doc => {
            // Consider a document validated if it has extractedData or estado is 'procesado'
            const isValidated = doc.extractedData || doc.estado === 'procesado'
            docsMap[doc.tipoDocumentoId] = {
              status: isValidated ? 'validated' : 'pending_review',
              fileName: doc.fileName,
              documentoId: doc.id
            }
          })
          setUploadedDocs(docsMap)
        })
        .catch(err => console.error('Error loading documents:', err))
    }
  }, [solicitudId, currentStep])

  // ── Load solicitud if coming from AdminSolicitudes ──
  useEffect(() => {
    const solicitudIdFromState = location.state?.solicitudId
    if (solicitudIdFromState) {
      setSolicitudId(solicitudIdFromState)
      fetchSolicitud(solicitudIdFromState)
        .then(async (sol) => {
          // Populate formData with solicitud data
          setFormData({
            razonSocial: sol.cliente?.razonSocial || '',
            nombreComercial: sol.cliente?.nombreComercial || '',
            telefono: sol.cliente?.telefono || '',
            celular: sol.cliente?.celular || '',
            correoElectronico: sol.cliente?.correoElectronico || '',
            paginaWeb: sol.cliente?.paginaWeb || '',
            numEmpleadosPermanentes: sol.cliente?.numEmpleadosPermanentes || '',
            numEmpleadosEventuales: sol.cliente?.numEmpleadosEventuales || '',
            monto: sol.monto || '',
            divisa: sol.divisa || 'MXN',
            plazoDeseado: sol.plazoDeseado || '',
            destino: sol.destino || '',
            tasaObjetivo: sol.tasaObjetivo || '',
            tipoColateral: sol.tipoColateral || '',
            nivelVentasAnuales: sol.nivelVentasAnuales || '',
            margenRealUtilidad: sol.margenRealUtilidad || '',
            situacionBuroCredito: sol.situacionBuroCredito || '',
            notas: sol.notas || '',
          })
          setClienteId(sol.clienteId)
          
          // Load existing documents for this solicitud
          try {
            const res = await fetch(`/api/solicitudes/${solicitudIdFromState}/documents`)
            if (res.ok) {
              const docs = await res.json()
              const docsMap = {}
              docs.forEach(doc => {
                // Consider a document validated if it has extractedData or estado is 'procesado'
                const isValidated = doc.extractedData || doc.estado === 'procesado'
                docsMap[doc.tipoDocumentoId] = {
                  status: isValidated ? 'validated' : 'pending_review',
                  fileName: doc.fileName,
                  documentoId: doc.id
                }
              })
              setUploadedDocs(docsMap)
            }
          } catch (err) {
            console.error('Error loading documents:', err)
          }
          
          // If solicitud already has data, we can go to documents step
          if (sol.monto && sol.destino) {
            setCurrentStep(1)
          }
        })
        .catch((err) => {
          console.error('Error loading solicitud:', err)
          alert('Error al cargar la solicitud')
        })
    }
  }, [location.state])

  // ── Load dashboard data when entering Step 2 ──
  const loadDashboardData = useCallback(async (id) => {
    if (!id) return
    setLoading(true)
    try {
      const [score, kpis, rec, sheet] = await Promise.allSettled([
        fetchScore(id),
        fetchKpis(id),
        fetchRecommendation(id),
        fetchSpreadsheet(id),
      ])
      if (score.status === 'fulfilled') setScoreData(score.value)
      if (kpis.status === 'fulfilled') setKpisData(kpis.value)
      if (rec.status === 'fulfilled') setRecommendationData(rec.value)
      if (sheet.status === 'fulfilled') setSpreadsheetData(sheet.value)
    } catch (e) {
      console.error('Error loading dashboard:', e)
    } finally {
      setLoading(false)
    }
  }, [])

  // ── Create cliente + solicitud on Step 0 submit ──
  const handleCreateApplication = async () => {
    setSavingApp(true)
    try {
      // 1) Create or reuse Cliente con nombre temporal (se actualizará con la Constancia)
      const cliente = await createCliente({
        razonSocial: formData.razonSocial,
        nombreComercial: formData.nombreComercial || null,
        telefono: formData.telefono || null,
        celular: formData.celular || null,
        correoElectronico: formData.correoElectronico || null,
        paginaWeb: formData.paginaWeb || null,
        numEmpleadosPermanentes: formData.numEmpleadosPermanentes || null,
        numEmpleadosEventuales: formData.numEmpleadosEventuales || null,
      })
      setClienteId(cliente.id)

      // 2) Create Solicitud linked to the Cliente
      const sol = await createSolicitud({
        clienteId: cliente.id,
        monto: Number(formData.monto),
        divisa: formData.divisa || 'MXN',
        plazoDeseado: formData.plazoDeseado || null,
        destino: formData.destino || null,
        tasaObjetivo: formData.tasaObjetivo || null,
        tipoColateral: formData.tipoColateral || null,
        nivelVentasAnuales: formData.nivelVentasAnuales ? Number(formData.nivelVentasAnuales) : null,
        margenRealUtilidad: formData.margenRealUtilidad ? Number(formData.margenRealUtilidad) : null,
        situacionBuroCredito: formData.situacionBuroCredito || null,
        notas: formData.notas || null,
      })
      setSolicitudId(sol.id)
      setCurrentStep(1)
    } catch (err) {
      alert('Error al crear la solicitud: ' + err.message)
    } finally {
      setSavingApp(false)
    }
  }

  function docStatus(id) {
    if (uploadedDocs[id]) return uploadedDocs[id]
    return { status: 'pending', fileName: null }
  }

  // Load current document data when replacing
  const handleSelectDocumentToReplace = async (doc) => {
    setSelectedDocType(doc)
    setCurrentDocumentData(null)
    
    const docInfo = docStatus(doc.id)
    if (docInfo.documentoId && solicitudId) {
      try {
        const res = await fetch(`/api/solicitudes/${solicitudId}/documents`)
        if (res.ok) {
          const docs = await res.json()
          const currentDoc = docs.find(d => d.id === docInfo.documentoId)
          if (currentDoc && currentDoc.extractedData) {
            setCurrentDocumentData({
              fileName: currentDoc.fileName,
              extractedData: currentDoc.extractedData,
              createdAt: currentDoc.createdAt
            })
          }
        }
      } catch (err) {
        console.error('Error loading current document:', err)
      }
    }
    setDocSubStep('upload')
  }

  const handleFileUpload = async (file) => {
    if (!file) return
    setUploading(true)
    setUploadError(null)
    setUploadResult(null)
    setExtractedFields(null)
    const formDataUpload = new FormData()
    formDataUpload.append('file', file)
    if (selectedDocType?.id) {
      formDataUpload.append('documentTypeId', selectedDocType.id)
    }
    if (solicitudId) {
      formDataUpload.append('solicitudId', solicitudId)
    }
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formDataUpload })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setUploadError(data.error || 'Error al subir el archivo.')
      } else {
        setUploadResult(data)
        
        // Si hay datos extraídos (Textract), mostrarlos para validación
        if (data.extractedData) {
          setExtractedFields(data.extractedData)
          setDocSubStep('extraction')
        } else {
          // Si no hay datos extraídos, marcar como validado directamente
          if (selectedDocType?.id) {
            setUploadedDocs(prev => ({ ...prev, [selectedDocType.id]: { status: 'validated', fileName: data.documento?.nombre_archivo || file.name } }))
          }
        }
      }
    } catch (err) {
      setUploadError('Error de conexión con el servidor.')
    } finally {
      setUploading(false)
    }
  }

  const handleConfirmExtractedData = async () => {
    setConfirmingData(true)
    try {
      // Actualizar el cliente con los datos extraídos
      if (clienteId && extractedFields) {
        await fetch(`/api/clientes/${clienteId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razonSocial: extractedFields.razon_social || formData.razonSocial,
            nombreComercial: extractedFields.nombre_comercial,
            rfc: extractedFields.rfc,
            domicilioFiscal: extractedFields.domicilio_fiscal,
            ciudad: extractedFields.ciudad,
            estado: extractedFields.estado,
          }),
        })
        
        // Actualizar formData local para reflejar los cambios
        setFormData(prev => ({
          ...prev,
          razonSocial: extractedFields.razon_social || prev.razonSocial,
          nombreComercial: extractedFields.nombre_comercial || prev.nombreComercial,
        }))
      }
      
      // Marcar documento como validado
      if (selectedDocType?.id) {
        setUploadedDocs(prev => ({ 
          ...prev, 
          [selectedDocType.id]: { 
            status: 'validated', 
            fileName: uploadResult?.documento?.nombre_archivo || 'archivo.pdf' 
          } 
        }))
      }
      
      // Volver al checklist
      setDocSubStep('checklist')
      setExtractedFields(null)
    } catch (err) {
      alert('Error al confirmar los datos: ' + err.message)
    } finally {
      setConfirmingData(false)
    }
  }

  // Form validation: nombre temporal, monto y destino son requeridos
  const formComplete = formData.razonSocial?.trim() && formData.monto && formData.destino?.trim()
  const canGoToStep1 = formComplete
  const canGoToStep2 = documentsComplete

  const updateForm = (field, value) => setFormData((prev) => ({ ...prev, [field]: value }))

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
    setClienteId(null)
    setSolicitudId(null)
    setUploadedDocs({})
    setSpreadsheetData([])
    setScoreData(null)
    setKpisData([])
    setRecommendationData(null)
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
            <p className="text-slate-600 mt-1">Completa la información de la solicitud. La Razón Social oficial se actualizará al procesar la Constancia de Situación Fiscal.</p>
            {formData.razonSocial && (
              <p className="text-sm text-slate-500 mt-2">Cliente: <strong>{formData.razonSocial}</strong></p>
            )}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); if (formComplete) handleCreateApplication() }}
            className="space-y-6"
          >
            {/* ── Sección 1: Datos del Cliente (Empresa) ── */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
              <h2 className="text-lg font-semibold text-slate-800 border-b border-slate-100 pb-2">Datos de la empresa</h2>
              
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-sm text-blue-800">
                <p><strong>Nota:</strong> La Razón Social oficial se extraerá de la Constancia de Situación Fiscal. Por ahora, ingresa un nombre temporal para identificar esta solicitud.</p>
              </div>

              <div>
                <label htmlFor="razonSocial" className="block text-sm font-medium text-slate-700 mb-1">
                  Nombre del cliente / Identificador temporal
                </label>
                <input 
                  id="razonSocial" 
                  type="text" 
                  value={formData.razonSocial} 
                  onChange={(e) => updateForm('razonSocial', e.target.value)} 
                  placeholder="Ej. Empresa Verde, Cliente ABC, etc." 
                  className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-pontifex-500 focus:border-pontifex-500" 
                />
                <p className="text-xs text-slate-500 mt-1">Este nombre te ayudará a identificar la solicitud mientras subes documentos. Se actualizará con la razón social oficial de la Constancia.</p>
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="correoElectronico" className="block text-sm font-medium text-slate-700 mb-1">Correo electrónico</label>
                  <input id="correoElectronico" type="email" value={formData.correoElectronico} onChange={(e) => updateForm('correoElectronico', e.target.value)} placeholder="contacto@empresa.com" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-pontifex-500 focus:border-pontifex-500" />
                </div>
                <div>
                  <label htmlFor="paginaWeb" className="block text-sm font-medium text-slate-700 mb-1">Página web</label>
                  <input id="paginaWeb" type="url" value={formData.paginaWeb} onChange={(e) => updateForm('paginaWeb', e.target.value)} placeholder="https://www.empresa.com" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-pontifex-500 focus:border-pontifex-500" />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="telefono" className="block text-sm font-medium text-slate-700 mb-1">Teléfono</label>
                  <input id="telefono" type="tel" value={formData.telefono} onChange={(e) => updateForm('telefono', e.target.value)} placeholder="Ej. 55 1234 5678" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-pontifex-500 focus:border-pontifex-500" />
                </div>
                <div>
                  <label htmlFor="celular" className="block text-sm font-medium text-slate-700 mb-1">Celular</label>
                  <input id="celular" type="tel" value={formData.celular} onChange={(e) => updateForm('celular', e.target.value)} placeholder="Ej. 55 9876 5432" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-pontifex-500 focus:border-pontifex-500" />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="numEmpleadosPermanentes" className="block text-sm font-medium text-slate-700 mb-1">Empleados permanentes</label>
                  <input id="numEmpleadosPermanentes" type="number" min="0" value={formData.numEmpleadosPermanentes} onChange={(e) => updateForm('numEmpleadosPermanentes', e.target.value)} placeholder="Ej. 25" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-pontifex-500 focus:border-pontifex-500" />
                </div>
                <div>
                  <label htmlFor="numEmpleadosEventuales" className="block text-sm font-medium text-slate-700 mb-1">Empleados eventuales</label>
                  <input id="numEmpleadosEventuales" type="number" min="0" value={formData.numEmpleadosEventuales} onChange={(e) => updateForm('numEmpleadosEventuales', e.target.value)} placeholder="Ej. 10" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-pontifex-500 focus:border-pontifex-500" />
                </div>
              </div>
            </div>

            {/* ── Sección 2: Datos de la Solicitud de Crédito ── */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
              <h2 className="text-lg font-semibold text-slate-800 border-b border-slate-100 pb-2">Solicitud de crédito</h2>

              <div className="grid sm:grid-cols-3 gap-5">
                <div>
                  <label htmlFor="monto" className="block text-sm font-medium text-slate-700 mb-1">Monto solicitado *</label>
                  <input id="monto" type="number" min="1" value={formData.monto} onChange={(e) => updateForm('monto', e.target.value)} placeholder="Ej. 850000" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-pontifex-500 focus:border-pontifex-500" />
                </div>
                <div>
                  <label htmlFor="divisa" className="block text-sm font-medium text-slate-700 mb-1">Divisa</label>
                  <select id="divisa" value={formData.divisa} onChange={(e) => updateForm('divisa', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:ring-2 focus:ring-pontifex-500 focus:border-pontifex-500">
                    <option value="MXN">MXN — Peso mexicano</option>
                    <option value="USD">USD — Dólar estadounidense</option>
                    <option value="EUR">EUR — Euro</option>
                  </select>
                </div>
                <div>
                  <label htmlFor="plazoDeseado" className="block text-sm font-medium text-slate-700 mb-1">Plazo deseado</label>
                  <input id="plazoDeseado" type="text" value={formData.plazoDeseado} onChange={(e) => updateForm('plazoDeseado', e.target.value)} placeholder="Ej. 24 meses" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-pontifex-500 focus:border-pontifex-500" />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="destino" className="block text-sm font-medium text-slate-700 mb-1">Destino del crédito *</label>
                  <input id="destino" type="text" value={formData.destino} onChange={(e) => updateForm('destino', e.target.value)} placeholder="Ej. Capital de trabajo, equipo, infraestructura" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-pontifex-500 focus:border-pontifex-500" />
                </div>
                <div>
                  <label htmlFor="tasaObjetivo" className="block text-sm font-medium text-slate-700 mb-1">Tasa objetivo</label>
                  <input id="tasaObjetivo" type="text" value={formData.tasaObjetivo} onChange={(e) => updateForm('tasaObjetivo', e.target.value)} placeholder="Ej. TIIE + 4%" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-pontifex-500 focus:border-pontifex-500" />
                </div>
              </div>

              <div>
                <label htmlFor="tipoColateral" className="block text-sm font-medium text-slate-700 mb-1">Tipo de colateral</label>
                <input id="tipoColateral" type="text" value={formData.tipoColateral} onChange={(e) => updateForm('tipoColateral', e.target.value)} placeholder="Ej. Inmueble, aval personal, garantía líquida" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-pontifex-500 focus:border-pontifex-500" />
              </div>
            </div>

            {/* ── Sección 3: Información cuantitativa adicional ── */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
              <h2 className="text-lg font-semibold text-slate-800 border-b border-slate-100 pb-2">Información cuantitativa</h2>

              <div className="grid sm:grid-cols-3 gap-5">
                <div>
                  <label htmlFor="nivelVentasAnuales" className="block text-sm font-medium text-slate-700 mb-1">Nivel de ventas anuales</label>
                  <input id="nivelVentasAnuales" type="number" min="0" value={formData.nivelVentasAnuales} onChange={(e) => updateForm('nivelVentasAnuales', e.target.value)} placeholder="Ej. 5000000" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-pontifex-500 focus:border-pontifex-500" />
                </div>
                <div>
                  <label htmlFor="margenRealUtilidad" className="block text-sm font-medium text-slate-700 mb-1">Margen real de utilidad (%)</label>
                  <input id="margenRealUtilidad" type="number" step="0.01" min="0" max="100" value={formData.margenRealUtilidad} onChange={(e) => updateForm('margenRealUtilidad', e.target.value)} placeholder="Ej. 12.5" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-pontifex-500 focus:border-pontifex-500" />
                </div>
                <div>
                  <label htmlFor="situacionBuroCredito" className="block text-sm font-medium text-slate-700 mb-1">Situación buró de crédito</label>
                  <select id="situacionBuroCredito" value={formData.situacionBuroCredito} onChange={(e) => updateForm('situacionBuroCredito', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:ring-2 focus:ring-pontifex-500 focus:border-pontifex-500">
                    <option value="">Seleccionar</option>
                    <option value="sin_atrasos">Sin atrasos</option>
                    <option value="atrasos_menores">Atrasos menores (1-30 días)</option>
                    <option value="atrasos_moderados">Atrasos moderados (31-90 días)</option>
                    <option value="cartera_vencida">Cartera vencida (90+ días)</option>
                    <option value="sin_historial">Sin historial</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="notas" className="block text-sm font-medium text-slate-700 mb-1">Observaciones</label>
                <textarea id="notas" rows={2} value={formData.notas} onChange={(e) => updateForm('notas', e.target.value)} placeholder="Información adicional relevante" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-pontifex-500 focus:border-pontifex-500 resize-none" />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button type="submit" disabled={!formComplete || savingApp} className="px-5 py-2.5 bg-pontifex-600 text-white rounded-lg font-medium hover:bg-pontifex-700 disabled:opacity-50 disabled:cursor-not-allowed">
                {savingApp ? 'Guardando…' : 'Continuar a documentos →'}
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
                  <span className="font-medium text-slate-800">Solicitud — {formData.razonSocial || 'Solicitante'}</span>
                  <span className="text-sm text-slate-600">
                    {Object.values(uploadedDocs).filter(d => d.status === 'validated').length}/{documentTypes.reduce((acc, cat) => acc + (cat.tipos?.length || 0), 0)} validados
                  </span>
                </div>
                {documentTypes.map((categoria) => (
                  <div key={categoria.id}>
                    <div className="px-4 py-2 bg-slate-100 border-b border-slate-200">
                      <span className="text-xs font-semibold uppercase tracking-wide text-slate-500">{categoria.nombre}</span>
                    </div>
                    <ul className="divide-y divide-slate-100">
                      {(categoria.tipos || []).map((doc) => {
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
                              onClick={() => handleSelectDocumentToReplace(doc)}
                              className="text-sm font-medium text-pontifex-600 hover:text-pontifex-700"
                            >
                              {s.status === 'pending' ? 'Subir' : 'Reemplazar'}
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  </div>
                ))}
              </div>

              {/* Spreadsheet: key values extracted via OCR — view + download */}
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
                  <div>
                    <h2 className="font-semibold text-slate-800">Valores clave extraídos (OCR)</h2>
                    <p className="text-xs text-slate-500 mt-0.5">Datos obtenidos de los documentos subidos; puedes descargar la hoja de cálculo.</p>
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      const baseName = formData.razonSocial?.replace(/\s+/g, '_') || 'solicitud'
                      
                      // Load documents with extractedData to populate Excel
                      let extractedFields = []
                      if (solicitudId) {
                        try {
                          const res = await fetch(`/api/solicitudes/${solicitudId}/documents`)
                          if (res.ok) {
                            const docs = await res.json()
                            // Convert extractedData to array format for getVal()
                            docs.forEach(doc => {
                              if (doc.extractedData) {
                                Object.entries(doc.extractedData).forEach(([key, value]) => {
                                  if (key !== '_extra' && value) {
                                    extractedFields.push({
                                      documento: doc.tipoDocumentoLabel,
                                      campo: key,
                                      valor: value,
                                      fuente: 'Textract'
                                    })
                                  }
                                })
                              }
                            })
                          }
                        } catch (err) {
                          console.error('Error loading documents:', err)
                        }
                      }
                      
                      // Use extracted fields if available, otherwise use spreadsheetData
                      const dataToUse = extractedFields.length > 0 ? extractedFields : spreadsheetData
                      
                      await downloadMasterClientXlsx(
                        formData,
                        dataToUse,
                        `master_client_pontifex_${baseName}.xlsx`
                      )
                    }}
                    className="px-3 py-2 rounded-lg border border-pontifex-200 bg-pontifex-50 text-pontifex-700 text-sm font-medium hover:bg-pontifex-100"
                  >
                    Descargar master_client_pontifex.xlsx
                  </button>
                </div>
                <div className="overflow-x-auto max-h-64 overflow-y-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 sticky top-0">
                      <tr className="text-left text-slate-600 border-b border-slate-200">
                        <th className="px-4 py-2 font-medium">Documento</th>
                        <th className="px-4 py-2 font-medium">Campo</th>
                        <th className="px-4 py-2 font-medium">Valor</th>
                        <th className="px-4 py-2 font-medium">Fuente</th>
                      </tr>
                    </thead>
                    <tbody>
                      {spreadsheetData.map((row, i) => (
                        <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/50">
                          <td className="px-4 py-2 text-slate-800">{row.documento}</td>
                          <td className="px-4 py-2 text-slate-700">{row.campo}</td>
                          <td className="px-4 py-2 font-mono text-slate-800">{row.valor}</td>
                          <td className="px-4 py-2 text-slate-500">{row.fuente}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => { setDocumentsComplete(true); setCurrentStep(2); loadDashboardData(solicitudId) }}
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
                  <button type="button" onClick={() => { setDocSubStep('checklist'); setUploadResult(null); setUploadError(null); setCurrentDocumentData(null) }} className="text-sm text-slate-500 hover:text-slate-700">← Volver</button>
                </div>

                {/* Show current document data if replacing */}
                {currentDocumentData && currentDocumentData.extractedData && (
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-medium text-blue-900">Documento actual</h3>
                        <p className="text-sm text-blue-700 mt-1">{currentDocumentData.fileName}</p>
                        <p className="text-xs text-blue-600 mt-0.5">
                          Subido: {new Date(currentDocumentData.createdAt).toLocaleDateString('es-MX', { 
                            year: 'numeric', 
                            month: 'long', 
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </p>
                      </div>
                      <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">
                        ✓ Datos extraídos
                      </span>
                    </div>
                    
                    <div className="border-t border-blue-200 pt-3 mt-3">
                      <p className="text-xs font-medium text-blue-800 uppercase tracking-wide mb-2">Campos extraídos:</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {Object.entries(currentDocumentData.extractedData).map(([key, value]) => {
                          // Skip internal/extra fields or null values
                          if (key === '_extra' || !value || value === '') return null
                          
                          // Format field names
                          const fieldLabel = key
                            .replace(/_/g, ' ')
                            .replace(/\b\w/g, l => l.toUpperCase())
                          
                          return (
                            <div key={key} className="text-sm">
                              <span className="text-blue-700 font-medium">{fieldLabel}:</span>{' '}
                              <span className="text-blue-900">{typeof value === 'object' ? JSON.stringify(value) : value}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                    
                    <p className="text-xs text-blue-600 mt-3 italic">
                      Al subir un nuevo archivo, estos datos serán reemplazados por los del nuevo documento.
                    </p>
                  </div>
                )}

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
                      <p className="text-slate-600 font-medium">Subiendo archivo...</p>
                      {selectedDocType?.id === 'constancia_situacion_fiscal' && (
                        <p className="text-sm text-slate-500">Extrayendo datos con Textract (puede tardar 10-30 segundos)</p>
                      )}
                    </div>
                  ) : (
                    <>
                      <p className="text-slate-600 mb-4">Arrastra el archivo aquí o haz clic para seleccionar</p>
                      <p className="text-xs text-slate-400 mb-4">Formatos: PDF, JPG, JPEG, PNG · Máx 10 MB</p>
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
                    <p className="text-emerald-800 font-medium">Archivo subido exitosamente a S3</p>
                    <p className="text-sm text-emerald-700">Nombre: {uploadResult.fileName}</p>
                    <p className="text-sm text-emerald-700 break-all">URL: {uploadResult.s3Url}</p>
                    <button
                      type="button"
                      onClick={() => { setDocSubStep('checklist'); setUploadResult(null); setCurrentDocumentData(null) }}
                      className="mt-2 px-4 py-2 bg-pontifex-600 text-white rounded-lg font-medium hover:bg-pontifex-700 text-sm"
                    >
                      Volver al listado
                    </button>
                  </div>
                )}
              </div>
            </>
          )}

          {docSubStep === 'extraction' && extractedFields && (
            <>
              <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <span className="font-medium text-slate-800">Datos extraídos de la Constancia</span>
                    <p className="text-xs text-slate-500 mt-0.5">Revisa y confirma los datos antes de guardarlos</p>
                  </div>
                  <span className="px-2 py-1 rounded text-sm font-medium bg-emerald-100 text-emerald-800">
                    ✓ Extraído con Textract
                  </span>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {/* Razón Social */}
                    {extractedFields.razon_social && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Razón Social</label>
                        <input
                          type="text"
                          value={extractedFields.razon_social}
                          onChange={(e) => setExtractedFields({ ...extractedFields, razon_social: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800"
                        />
                      </div>
                    )}

                    {/* RFC */}
                    {extractedFields.rfc && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">RFC</label>
                        <input
                          type="text"
                          value={extractedFields.rfc}
                          onChange={(e) => setExtractedFields({ ...extractedFields, rfc: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800"
                        />
                      </div>
                    )}

                    {/* Domicilio Fiscal */}
                    {extractedFields.domicilio_fiscal && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Domicilio Fiscal</label>
                        <textarea
                          rows={2}
                          value={extractedFields.domicilio_fiscal}
                          onChange={(e) => setExtractedFields({ ...extractedFields, domicilio_fiscal: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 resize-none"
                        />
                      </div>
                    )}

                    {/* Ciudad y Estado */}
                    <div className="grid grid-cols-2 gap-4">
                      {extractedFields.ciudad && (
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Ciudad</label>
                          <input
                            type="text"
                            value={extractedFields.ciudad}
                            onChange={(e) => setExtractedFields({ ...extractedFields, ciudad: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800"
                          />
                        </div>
                      )}
                      {extractedFields.estado && (
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
                          <input
                            type="text"
                            value={extractedFields.estado}
                            onChange={(e) => setExtractedFields({ ...extractedFields, estado: e.target.value })}
                            className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800"
                          />
                        </div>
                      )}
                    </div>

                    {/* Nombre Comercial */}
                    {extractedFields.nombre_comercial && (
                      <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Comercial</label>
                        <input
                          type="text"
                          value={extractedFields.nombre_comercial}
                          onChange={(e) => setExtractedFields({ ...extractedFields, nombre_comercial: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800"
                        />
                      </div>
                    )}

                    {/* Datos extra del CSF */}
                    {extractedFields._extra && (
                      <div className="pt-4 border-t border-slate-200">
                        <h3 className="text-sm font-semibold text-slate-700 mb-3">Información adicional</h3>
                        <div className="grid grid-cols-2 gap-3 text-sm">
                          {extractedFields._extra.estatus_padron && (
                            <div>
                              <span className="text-slate-500">Estatus padrón:</span>
                              <span className="ml-2 font-medium text-slate-800">{extractedFields._extra.estatus_padron}</span>
                            </div>
                          )}
                          {extractedFields._extra.fecha_inicio_operaciones && (
                            <div>
                              <span className="text-slate-500">Inicio operaciones:</span>
                              <span className="ml-2 font-medium text-slate-800">{extractedFields._extra.fecha_inicio_operaciones}</span>
                            </div>
                          )}
                          {extractedFields._extra.curp && (
                            <div>
                              <span className="text-slate-500">CURP:</span>
                              <span className="ml-2 font-medium text-slate-800">{extractedFields._extra.curp}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
                  <button 
                    type="button" 
                    onClick={() => { setDocSubStep('upload'); setExtractedFields(null) }} 
                    className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100"
                  >
                    ← Subir otro archivo
                  </button>
                  <div className="flex gap-2">
                    <button 
                      type="button" 
                      onClick={() => { setDocSubStep('checklist'); setExtractedFields(null) }} 
                      className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={handleConfirmExtractedData}
                      disabled={confirmingData}
                      className="px-5 py-2 bg-pontifex-600 text-white rounded-lg font-medium hover:bg-pontifex-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {confirmingData ? 'Confirmando...' : '✓ Confirmar y actualizar cliente'}
                    </button>
                  </div>
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
              <p className="text-slate-600 mt-1">{formData.razonSocial || 'Solicitante'}</p>
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

            {/* Gráficos generados por el chatbot (above Decisión) */}
            {chartWidgets.length > 0 && (
              <div className="lg:col-span-3 grid sm:grid-cols-2 gap-4">
                {chartWidgets.map((widget) => (
                  <div key={widget.id} className="bg-white rounded-xl border border-slate-200 p-4">
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
                <button
                  type="button"
                  onClick={() => { setDecision('approved'); if (solicitudId) submitDecision(solicitudId, { type: 'approved', reason: analystNotes }).catch(console.error) }}
                  className="px-5 py-2.5 rounded-lg font-medium bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  Aprobar (según recomendación)
                </button>
                <button
                  type="button"
                  onClick={() => { setDecision('adjusted'); if (solicitudId) submitDecision(solicitudId, { type: 'adjusted', reason: analystNotes }).catch(console.error) }}
                  className="px-5 py-2.5 rounded-lg font-medium border border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100"
                >
                  Aprobar con ajustes
                </button>
                <button
                  type="button"
                  onClick={() => { setDecision('rejected'); if (solicitudId) submitDecision(solicitudId, { type: 'rejected', reason: analystNotes }).catch(console.error) }}
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
                                <Pie
                                  data={m.chart.data}
                                  dataKey="value"
                                  nameKey="name"
                                  cx="50%"
                                  cy="50%"
                                  outerRadius={52}
                                  label={({ name, value }) => `${name}: ${value}`}
                                >
                                  {m.chart.data.map((_, idx) => (
                                    <Cell key={idx} fill={CHART_COLORS[idx % CHART_COLORS.length]} />
                                  ))}
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
