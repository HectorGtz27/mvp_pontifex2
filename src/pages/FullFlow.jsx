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
  fetchCuentasBancarias,
  createCuentaBancaria,
  deleteCuentaBancaria,
} from '../utils/api'
import { downloadMasterClientXlsx } from '../utils/masterClientXlsx'
import { BG_FIELDS, ER_FIELDS } from '../shared/ocrFields'
import showToast from '../utils/toast'


const GRADE_COLORS = { A: 'bg-emerald-100 text-emerald-800', B: 'bg-sky-100 text-sky-800', C: 'bg-amber-100 text-amber-800', D: 'bg-red-100 text-red-800' }

const BANCOS_MX = ['BBVA', 'Citibanamex', 'Santander', 'Banorte', 'HSBC', 'Scotiabank', 'Bajío', 'Inbursa', 'Afirme', 'Mifel', 'Otro']

// Genera los últimos N meses en formato YYYY-MM (del más antiguo al más reciente)
function getLast12Months() {
  const now = new Date()
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
}
const MESES_CORTOS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

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
  nivelBuroCredito: '',
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
  const [bankStatements, setBankStatements] = useState([]) // [{ mes, abonos, retiros, banco_detectado }]
  // ── Cuentas Bancarias (est. de cuenta multi-archivo) ──
  const [cuentasBancarias, setCuentasBancarias] = useState([])
  const [bsNewBanco, setBsNewBanco] = useState('')
  const [bsAddingCuenta, setBsAddingCuenta] = useState(false)
  const [bsBulkState, setBsBulkState] = useState({}) // { [cuentaId]: { uploading, progress:{done,total}, results:[] } }
  const [recommendationData, setRecommendationData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [savingApp, setSavingApp] = useState(false)
  // ── Estados Financieros: 3 uploads separados (1 por ejercicio) ──
  const [showFsPanel, setShowFsPanel] = useState(false)
  const fsPanelRef = useRef(null)
  // Estado individual por año fiscal
  const [fsYear1, setFsYear1] = useState({ uploading: false, dragOver: false, data: null, fileName: null })
  const [fsYear2, setFsYear2] = useState({ uploading: false, dragOver: false, data: null, fileName: null })
  const [fsYear3, setFsYear3] = useState({ uploading: false, dragOver: false, data: null, fileName: null })
  const fsRef1 = useRef(null)
  const fsRef2 = useRef(null)
  const fsRef3 = useRef(null)

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
          
          // Load financial statements data into individual year states
          const fsTypeOrder = ['edos_financieros_anio1', 'edos_financieros_anio2', 'edo_financiero_parcial']
          const setters = [setFsYear1, setFsYear2, setFsYear3]
          fsTypeOrder.forEach((tid, idx) => {
            const d = docs.find(x => x.tipoDocumentoId === tid)
            if (d?.extractedData?.tipo === 'estados_financieros') {
              setters[idx]({
                uploading: false,
                dragOver: false,
                data: d.extractedData,
                fileName: d.fileName
              })
            }
          })
        })
        .catch(err => console.error('Error loading documents:', err))
    }
  }, [solicitudId, currentStep])

  // ── Auto-scroll to FS panel when it opens ──
  useEffect(() => {
    if (showFsPanel && fsPanelRef.current) {
      setTimeout(() => fsPanelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50)
    }
  }, [showFsPanel])

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
            nivelBuroCredito: sol.nivelBuroCredito || '',
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
              
              // Load financial statements data into individual year states
              const fsTypeOrder = ['edos_financieros_anio1', 'edos_financieros_anio2', 'edo_financiero_parcial']
              const setters = [setFsYear1, setFsYear2, setFsYear3]
              fsTypeOrder.forEach((tid, idx) => {
                const d = docs.find(x => x.tipoDocumentoId === tid)
                if (d?.extractedData?.tipo === 'estados_financieros') {
                  setters[idx]({
                    uploading: false,
                    dragOver: false,
                    data: d.extractedData,
                    fileName: d.fileName
                  })
                }
              })
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
      showToast.cliente.created()

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
        nivelBuroCredito: formData.nivelBuroCredito || null,
        notas: formData.notas || null,
      })
      setSolicitudId(sol.id)
      showToast.solicitud.created()
      setCurrentStep(1)
    } catch (err) {
      showToast.error(err.message || 'Error al crear la solicitud')
    } finally {
      setSavingApp(false)
    }
  }

  // ── Handle credit decision ──
  const handleDecision = async (type) => {
    if (!solicitudId) return
    
    setDecision(type)
    try {
      await submitDecision(solicitudId, { type, reason: analystNotes })
      const messages = {
        approved: '✓ Solicitud aprobada exitosamente',
        adjusted: '✓ Solicitud aprobada con ajustes',
        rejected: '✓ Solicitud rechazada'
      }
      showToast.info(messages[type] || '✓ Decisión registrada')
    } catch (err) {
      showToast.error('Error al registrar la decisión')
      console.error(err)
    }
  }

  function docStatus(id) {
    if (uploadedDocs[id]) return uploadedDocs[id]
    return { status: 'pending', fileName: null }
  }

  // ── Estados Financieros: hasta 3 PDFs (1 por ejercicio) ──
  const FS_TYPE_IDS = ['edos_financieros_anio1', 'edos_financieros_anio2', 'edo_financiero_parcial']
  const FS_LABELS   = ['Antepenúltimo ejercicio', 'Penúltimo ejercicio', 'Ejercicio en curso']
  const FS_LABELS_SHORT = ['Año 1', 'Año 2', 'Año 3']

  // Función genérica para subir estado financiero de un año específico
  const handleFinancialYearUpload = async (file, yearIndex) => {
    if (!file || !solicitudId) return
    
    const typeId = FS_TYPE_IDS[yearIndex]
    const label = FS_LABELS[yearIndex]
    const setYearState = [setFsYear1, setFsYear2, setFsYear3][yearIndex]
    
    setYearState(prev => ({ ...prev, uploading: true }))
    showToast.documento.processing()
    
    try {
      const fd = new FormData()
      fd.append('file', file)
      fd.append('documentTypeId', typeId)
      fd.append('solicitudId', solicitudId)
      
      const res = await fetch('/api/upload', { method: 'POST', body: fd })
      const data = await res.json()
      
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Error al subir')
      }
      
      // Actualizar estado del año con datos extraídos
      setYearState({
        uploading: false,
        dragOver: false,
        data: data.extractedData,
        fileName: file.name
      })
      
      // Marcar como validado en el checklist
      setUploadedDocs(prev => ({
        ...prev,
        [typeId]: { status: 'validated', fileName: file.name },
      }))
      
      showToast.documento.uploaded()
      
      // Refresh OCR table
      try {
        const sp = await fetch(`/api/solicitudes/${solicitudId}/spreadsheet`)
        if (sp.ok) setSpreadsheetData(await sp.json())
      } catch (_) {}
    } catch (e) {
      showToast.documento.uploadError()
      showToast.error(`Error en ${label}: ${e.message}`)
      setYearState(prev => ({ ...prev, uploading: false }))
    }
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
    
    const uploadingToastId = showToast.documento.processing()
    
    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formDataUpload })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setUploadError(data.error || 'Error al subir el archivo.')
        showToast.documento.uploadError()
      } else {
        setUploadResult(data)
        showToast.documento.uploaded()
        
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
      showToast.serverError()
    } finally {
      setUploading(false)
    }
  }

  const handleConfirmExtractedData = async () => {
    setConfirmingData(true)
    try {
      // Solo actualizar el cliente si es CSF (no para estados de cuenta)
      if (clienteId && extractedFields && extractedFields.tipo !== 'estado_cuenta_bancario') {
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
      
      // Si es estado de cuenta, acumular los datos para el Excel
      if (extractedFields?.tipo === 'estado_cuenta_bancario') {
        setBankStatements(prev => {
          // Reemplaza si ya existe el mismo mes
          const filtered = prev.filter(b => b.mes !== extractedFields.mes)
          return [...filtered, {
            mes: extractedFields.mes,
            abonos: extractedFields.abonos,
            retiros: extractedFields.retiros,
            banco_detectado: extractedFields.banco_detectado,
          }]
        })
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

  // ────────────────────────────────────────────────────────────
  // Cuentas Bancarias handlers
  // ────────────────────────────────────────────────────────────

  const handleOpenBankStatements = async () => {
    if (solicitudId) {
      try {
        const data = await fetchCuentasBancarias(solicitudId)
        setCuentasBancarias(data)
      } catch (e) { console.error(e) }
    }
    setDocSubStep('bank-statements')
  }

  const handleAddCuenta = async () => {
    if (!bsNewBanco || !solicitudId) return
    setBsAddingCuenta(true)
    try {
      const banco = bsNewBanco === 'Otro' ? prompt('Nombre del banco:') || 'Otro' : bsNewBanco
      const nueva = await createCuentaBancaria({ solicitudId, banco })
      setCuentasBancarias(prev => [...prev, nueva])
      setBsNewBanco('')
      showToast.created('Cuenta bancaria')
    } catch (e) {
      showToast.error(e.message)
    } finally {
      setBsAddingCuenta(false)
    }
  }

  const handleDeleteCuenta = async (id) => {
    if (!confirm('¿Eliminar esta cuenta y todos sus documentos?')) return
    try {
      await deleteCuentaBancaria(id)
      setCuentasBancarias(prev => prev.filter(c => c.id !== id))
      showToast.deleted('Cuenta bancaria')
    } catch (e) { 
      showToast.error(e.message)
    }
  }

  const handleBulkUpload = async (cuentaId, files) => {
    if (!files || files.length === 0) return
    
    // Validar máximo 24 archivos
    if (files.length > 24) {
      showToast.error(`Máximo 24 archivos por lote. Seleccionaste ${files.length}. Por favor divide en múltiples lotes.`)
      return
    }
    
    setBsBulkState(prev => ({
      ...prev,
      [cuentaId]: { uploading: true, progress: { done: 0, total: files.length }, results: [] }
    }))
    const formDataUpload = new FormData()
    Array.from(files).forEach(f => formDataUpload.append('files', f))
    formDataUpload.append('solicitudId', solicitudId)
    formDataUpload.append('cuentaBancariaId', cuentaId)
    try {
      const res = await fetch('/api/upload/bulk', { method: 'POST', body: formDataUpload })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error en bulk upload')
      // Actualizar resultados
      setBsBulkState(prev => ({
        ...prev,
        [cuentaId]: { uploading: false, progress: { done: data.successful, total: data.total }, results: data.results }
      }))
      // Refrescar cobertura de esta cuenta
      const updated = await fetchCuentasBancarias(solicitudId)
      setCuentasBancarias(updated)
      // Actualizar bankStatements para Excel
      data.results.forEach(r => {
        if (r.success && r.extractedData?.mes) {
          setBankStatements(prev => {
            const filtered = prev.filter(b => !(b.mes === r.extractedData.mes && b.banco_detectado === r.extractedData.banco_detectado))
            return [...filtered, {
              mes: r.extractedData.mes,
              abonos: r.extractedData.abonos,
              retiros: r.extractedData.retiros,
              saldo_promedio: r.extractedData.saldo_promedio,
              divisa: r.extractedData.divisa,
              banco_detectado: r.extractedData.banco_detectado,
            }]
          })
        }
      })
      // Marcar edos_cuenta_bancarios como validado si hay al menos un doc
      if (data.successful > 0) {
        setUploadedDocs(prev => ({ ...prev, edos_cuenta_bancarios: { status: 'validated', fileName: `${data.successful} estados` } }))
      }
    } catch (e) {
      setBsBulkState(prev => ({ ...prev, [cuentaId]: { uploading: false, progress: { done: 0, total: files.length }, results: [], error: e.message } }))
      alert('Error al subir: ' + e.message)
    }
  }

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
    setCuentasBancarias([])
    setBsBulkState({})
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
            onSubmit={(e) => { e.preventDefault(); if (formComplete && !savingApp) handleCreateApplication() }}
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
                <select id="tipoColateral" value={formData.tipoColateral} onChange={(e) => updateForm('tipoColateral', e.target.value)} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 focus:ring-2 focus:ring-pontifex-500 focus:border-pontifex-500">
                  <option value="">Seleccionar</option>
                  <option value="AVAL / OBLIGADO SOLIDARIO">AVAL / OBLIGADO SOLIDARIO</option>
                  <option value="RELACIÓN PATRIMONIAL">RELACIÓN PATRIMONIAL</option>
                  <option value="HIPOTECARIA">HIPOTECARIA</option>
                  <option value="PRENDARIA">PRENDARIA</option>
                  <option value="LIQUIDA">LIQUIDA</option>
                  <option value="CONTRATOS">CONTRATOS</option>
                </select>
              </div>
            </div>

            {/* ── Sección 3: Información cuantitativa adicional ── */}
            <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-5">
              <h2 className="text-lg font-semibold text-slate-800 border-b border-slate-100 pb-2">Información cuantitativa</h2>

              <div className="grid sm:grid-cols-2 gap-5">
                <div>
                  <label htmlFor="nivelVentasAnuales" className="block text-sm font-medium text-slate-700 mb-1">Nivel de ventas anuales</label>
                  <input id="nivelVentasAnuales" type="number" min="0" value={formData.nivelVentasAnuales} onChange={(e) => updateForm('nivelVentasAnuales', e.target.value)} placeholder="Ej. 5000000" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-pontifex-500 focus:border-pontifex-500" />
                </div>
                <div>
                  <label htmlFor="margenRealUtilidad" className="block text-sm font-medium text-slate-700 mb-1">Margen real de utilidad (%)</label>
                  <input id="margenRealUtilidad" type="number" step="0.01" min="0" max="100" value={formData.margenRealUtilidad} onChange={(e) => updateForm('margenRealUtilidad', e.target.value)} placeholder="Ej. 12.5" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-pontifex-500 focus:border-pontifex-500" />
                </div>
              </div>

              <div className="grid sm:grid-cols-2 gap-5">
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
                <div>
                  <label htmlFor="nivelBuroCredito" className="block text-sm font-medium text-slate-700 mb-1">Nivel del buró de crédito</label>
                  <input id="nivelBuroCredito" type="text" value={formData.nivelBuroCredito} onChange={(e) => updateForm('nivelBuroCredito', e.target.value)} placeholder="Ej. 650, Excelente, AAA" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:ring-2 focus:ring-pontifex-500 focus:border-pontifex-500" />
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

          {docSubStep === 'checklist' && !showFsPanel && (
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

                        // ── Unified financial statements row ──────────────
                        // The 3 financial types are uploaded as ONE file;
                        // skip anio2 & parcial, and render a merged row for anio1.
                        if (doc.id === 'edos_financieros_anio2' || doc.id === 'edo_financiero_parcial') {
                          return null
                        }
                        if (doc.id === 'edos_financieros_anio1') {
                          const s1 = docStatus('edos_financieros_anio1')
                          const s2 = docStatus('edos_financieros_anio2')
                          const s3 = docStatus('edo_financiero_parcial')
                          const allValidated = s1.status === 'validated' && s2.status === 'validated' && s3.status === 'validated'
                          const anyValidated = s1.status === 'validated' || s2.status === 'validated' || s3.status === 'validated'
                          const anyFsUploading = fsYear1.uploading || fsYear2.uploading || fsYear3.uploading
                          const fsYears = [fsYear1.data, fsYear2.data, fsYear3.data].filter(Boolean)
                          return (
                            <li key="fs-unified" className="px-4 py-3 hover:bg-slate-50/50">
                              <div className="flex items-center gap-4">
                                <span className="w-6">
                                  {allValidated && <span className="text-emerald-500">✓</span>}
                                  {!allValidated && anyValidated && <span className="text-amber-500">◐</span>}
                                  {!allValidated && !anyValidated && <span className="text-slate-300">○</span>}
                                </span>
                                <span className="flex-1 text-slate-800 font-medium">
                                  Estados Financieros
                                  <span className="ml-2 text-xs font-normal text-slate-500">(hasta 3 PDFs — 1 por ejercicio fiscal)</span>
                                </span>
                                {anyValidated && !anyFsUploading && (
                                  <span className="text-sm text-slate-500">
                                    {[s1, s2, s3].filter(s => s.status === 'validated').length}/3 subidos
                                  </span>
                                )}
                                {anyFsUploading ? (
                                  <span className="text-sm text-pontifex-600 flex items-center gap-1">
                                    <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"/>
                                    </svg>
                                    Analizando…
                                  </span>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setShowFsPanel(true)}
                                    className="text-sm font-medium text-pontifex-600 hover:text-pontifex-700"
                                  >
                                    {anyValidated ? 'Agregar / reemplazar' : 'Subir (1–3 PDFs)'}
                                  </button>
                                )}
                              </div>
                              {/* Per-file status rows */}
                              <div className="mt-2 ml-10 space-y-1">
                                {FS_TYPE_IDS.map((tid, i) => {
                                  const st = docStatus(tid)
                                  const yr = fsYears[i]
                                  return (
                                    <div key={tid} className="flex items-center gap-2 text-xs text-slate-500">
                                      <span className={st.status === 'validated' ? 'text-emerald-500' : 'text-slate-300'}>
                                        {st.status === 'validated' ? '✓' : '○'}
                                      </span>
                                      <span>{FS_LABELS[i]}</span>
                                      {st.fileName && <span className="font-mono text-slate-400">{st.fileName}</span>}
                                      {yr?.periodo && (
                                        <span className="ml-1 px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                                          {yr.periodo}{yr.estado_resultados?.ventas != null && ` · Ventas: ${Number(yr.estado_resultados.ventas).toLocaleString()}`}
                                        </span>
                                      )}
                                    </div>
                                  )
                                })}
                              </div>
                            </li>
                          )
                        }
                        // ── Default row ───────────────────────────────────

                        return (
                          <li key={doc.id} className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50/50">
                            <span className="w-6">
                              {s.status === 'validated' && <span className="text-emerald-500">✓</span>}
                              {s.status === 'pending_review' && <span className="text-amber-500">◐</span>}
                              {s.status === 'pending' && <span className="text-slate-300">○</span>}
                            </span>
                            <span className="flex-1 text-slate-800">{doc.label}</span>
                            {s.fileName && <span className="text-sm text-slate-500 font-mono">{s.fileName}</span>}
                            {doc.id === 'edos_cuenta_bancarios' ? (
                              <button
                                type="button"
                                onClick={handleOpenBankStatements}
                                className="text-sm font-medium text-pontifex-600 hover:text-pontifex-700"
                              >
                                Gestionar {cuentasBancarias.length > 0 ? `(${cuentasBancarias.length} cuenta${cuentasBancarias.length !== 1 ? 's' : ''})` : ''}
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleSelectDocumentToReplace(doc)}
                                className="text-sm font-medium text-pontifex-600 hover:text-pontifex-700"
                              >
                                {s.status === 'pending' ? 'Subir' : 'Reemplazar'}
                              </button>
                            )}
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
                      // Also ensure cuentasBancarias are loaded (needed for Flujos sheet)
                      let cuentasData = cuentasBancarias
                      if (solicitudId && cuentasData.length === 0) {
                        try {
                          cuentasData = await fetchCuentasBancarias(solicitudId)
                          setCuentasBancarias(cuentasData)
                        } catch (_) {}
                      }
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
                      
                      // Derive bank statements from DB data (cuentasBancarias) so
                      // it reflects all uploaded statements, not just the current session
                      const bankStatementsForExcel = cuentasData.length > 0
                        ? cuentasData.flatMap(cuenta =>
                            cuenta.documentos
                              .filter(d => d.abonos != null || d.retiros != null || d.saldoPromedio != null)
                              .map(d => ({
                                mes: d.periodo,
                                abonos: d.abonos,
                                retiros: d.retiros,
                                saldo_promedio: d.saldoPromedio,
                                divisa: d.divisa || cuenta.divisa,
                                banco_detectado: d.banco || cuenta.banco,
                              }))
                          )
                        : bankStatements

                      // Reconstruct financial years from session or DB documents
                      let financialYearsForExcel = [fsYear1.data, fsYear2.data, fsYear3.data].filter(Boolean)
                      if (financialYearsForExcel.length === 0 && solicitudId) {
                        try {
                          const docsRes = await fetch(`/api/solicitudes/${solicitudId}/documents`)
                          if (docsRes.ok) {
                            const allDocs = await docsRes.json()
                            const typeOrder = ['edos_financieros_anio1', 'edos_financieros_anio2', 'edo_financiero_parcial']
                            for (const tid of typeOrder) {
                              const d = allDocs.find(x => x.tipoDocumentoId === tid)
                              if (d?.extractedData?.tipo === 'estados_financieros') {
                                financialYearsForExcel.push(d.extractedData)
                              }
                            }
                          }
                        } catch (_) {}
                      }

                      await downloadMasterClientXlsx(
                        formData,
                        dataToUse,
                        `master_client_pontifex_${baseName}.xlsx`,
                        bankStatementsForExcel,
                        financialYearsForExcel
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

          {/* ── Estados Financieros Panel ── */}
          {docSubStep === 'checklist' && showFsPanel && (
            <div ref={fsPanelRef} className="space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-semibold text-slate-900 text-lg">Estados Financieros</h2>
                  <p className="text-sm text-slate-500 mt-0.5">Sube 1 PDF por ejercicio fiscal. Los datos se extraen automáticamente con OCR + IA.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setShowFsPanel(false)}
                  className="text-sm text-slate-500 hover:text-slate-700"
                >
                  ← Volver al listado
                </button>
              </div>

              {/* Three separate upload zones */}
              {[
                { state: fsYear1, setState: setFsYear1, ref: fsRef1, index: 0 },
                { state: fsYear2, setState: setFsYear2, ref: fsRef2, index: 1 },
                { state: fsYear3, setState: setFsYear3, ref: fsRef3, index: 2 },
              ].map(({ state, setState, ref, index }) => {
                const typeId = FS_TYPE_IDS[index]
                const label = FS_LABELS[index]
                const shortLabel = FS_LABELS_SHORT[index]
                const docSt = docStatus(typeId)
                const isValidated = docSt.status === 'validated'
                
                return (
                  <div key={typeId} className="bg-slate-50 rounded-xl p-5 space-y-4">
                    {/* Year header */}
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
                      onDragOver={e => { e.preventDefault(); setState(prev => ({ ...prev, dragOver: true })) }}
                      onDragLeave={() => setState(prev => ({ ...prev, dragOver: false }))}
                      onDrop={e => {
                        e.preventDefault()
                        setState(prev => ({ ...prev, dragOver: false }))
                        const files = e.dataTransfer.files
                        if (files?.[0]) handleFinancialYearUpload(files[0], index)
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
                        if (file) handleFinancialYearUpload(file, index)
                        e.target.value = ''
                      }}
                    />

                    {/* Extracted data for this year */}
                    {state.data && (() => {
                      const yr = state.data
                      const fmt = v => v == null ? '—' : Number(v).toLocaleString('es-MX')
                      return (
                        <div className="bg-white rounded-lg border border-slate-200 overflow-hidden">
                          <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex items-center gap-2">
                            <span className="font-medium text-slate-800 text-xs">Información extraída</span>
                            {yr.confianza && (
                              <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
                                yr.confianza === 'alta' ? 'bg-emerald-100 text-emerald-700' :
                                yr.confianza === 'media' ? 'bg-amber-100 text-amber-700' :
                                'bg-red-100 text-red-700'
                              }`}>
                                {yr.confianza}
                              </span>
                            )}
                          </div>
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <tbody>
                                <tr className="bg-blue-50 border-b border-slate-200">
                                  <td colSpan="2" className="px-3 py-1.5 font-bold uppercase tracking-wider text-blue-700">Balance General</td>
                                </tr>
                                {BG_FIELDS.map(({ key, label }) => (
                                  <tr key={key} className="border-b border-slate-100 hover:bg-slate-50/50">
                                    <td className="px-3 py-2 text-slate-700">{label}</td>
                                    <td className="px-3 py-2 text-right font-mono text-slate-800">
                                      {fmt((yr.balance_general || yr)[key])}
                                    </td>
                                  </tr>
                                ))}
                                <tr className="bg-amber-50 border-b border-slate-200">
                                  <td colSpan="2" className="px-3 py-1.5 font-bold uppercase tracking-wider text-amber-700">Estado de Resultados</td>
                                </tr>
                                {ER_FIELDS.map(({ key, label }) => (
                                  <tr key={key} className="border-b border-slate-100 hover:bg-slate-50/50">
                                    <td className="px-3 py-2 text-slate-700">{label}</td>
                                    <td className="px-3 py-2 text-right font-mono text-slate-800">
                                      {fmt((yr.estado_resultados || yr)[key])}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )
                    })()}
                  </div>
                )
              })}
            </div>
          )}

          {docSubStep === 'bank-statements' && (() => {
            const last12 = getLast12Months()
            return (
              <div className="space-y-5">
                {/* Header */}
                <div className="flex items-center justify-between">
                  <h2 className="font-semibold text-slate-900 text-lg">Estados de cuenta bancarios</h2>
                  <button
                    type="button"
                    onClick={() => setDocSubStep('checklist')}
                    className="text-sm text-slate-500 hover:text-slate-700"
                  >
                    ← Volver al listado
                  </button>
                </div>

                {/* Add new account */}
                <div className="bg-white rounded-xl border border-slate-200 p-4">
                  <p className="text-sm font-semibold text-slate-700 mb-3">Declarar nueva cuenta bancaria</p>
                  <div className="flex flex-wrap gap-2 items-center">
                    <select
                      value={bsNewBanco}
                      onChange={e => setBsNewBanco(e.target.value)}
                      className="px-3 py-2 rounded-lg border border-slate-200 text-sm text-slate-800 bg-white focus:outline-none focus:ring-2 focus:ring-pontifex-300"
                    >
                      <option value="">Seleccionar banco…</option>
                      {BANCOS_MX.map(b => <option key={b} value={b}>{b}</option>)}
                    </select>
                    <button
                      type="button"
                      onClick={handleAddCuenta}
                      disabled={!bsNewBanco || bsAddingCuenta}
                      className="px-4 py-2 rounded-lg bg-pontifex-600 text-white text-sm font-medium hover:bg-pontifex-700 disabled:opacity-40"
                    >
                      {bsAddingCuenta ? 'Agregando…' : '+ Agregar cuenta'}
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    💡 La divisa (MXN/USD) se detecta automáticamente al procesar los estados de cuenta
                  </p>
                </div>

                {/* No accounts */}
                {cuentasBancarias.length === 0 && (
                  <p className="text-center text-slate-500 text-sm py-8">Declara las cuentas bancarias para comenzar la carga de estados.</p>
                )}

                {/* Account cards */}
                {cuentasBancarias.map(cuenta => {
                  const bs = bsBulkState[cuenta.id] || {}
                  const mesSet = new Set(cuenta.mesesCubiertos || [])
                  const totalMeses = mesSet.size
                  return (
                    <div key={cuenta.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                      {/* Card header */}
                      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="font-semibold text-slate-800">{cuenta.banco}</span>
                          <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                            cuenta.divisa === 'USD' ? 'bg-sky-100 text-sky-700' : 'bg-emerald-100 text-emerald-700'
                          }`}>{cuenta.divisa}</span>
                          <span className="text-xs text-slate-500">{totalMeses}/12 meses</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteCuenta(cuenta.id)}
                          className="text-slate-400 hover:text-red-500 text-sm"
                          title="Eliminar cuenta"
                        >✕</button>
                      </div>

                      <div className="p-4 space-y-4">
                        {/* Coverage grid */}
                        <div>
                          <p className="text-xs text-slate-500 mb-2">Cobertura (últimos 12 meses)</p>
                          <div className="flex gap-1 flex-wrap">
                            {last12.map(periodo => {
                              const [yr, mo] = periodo.split('-')
                              const covered = mesSet.has(periodo)
                              return (
                                <div
                                  key={periodo}
                                  title={`${MESES_CORTOS[parseInt(mo)-1]} ${yr}${covered ? ' — subido' : ' — faltante'}`}
                                  className={`w-10 h-8 rounded flex flex-col items-center justify-center text-xs font-medium ${
                                    covered ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
                                  }`}
                                >
                                  <span>{MESES_CORTOS[parseInt(mo)-1]}</span>
                                  <span className="text-[10px]">{yr.slice(2)}</span>
                                </div>
                              )
                            })}
                          </div>
                        </div>

                        {/* Upload zone */}
                        {bs.uploading ? (
                          <div className="space-y-1">
                            <div className="flex justify-between text-xs text-slate-600">
                              <span>Procesando…</span>
                              <span>{bs.progress?.done ?? 0}/{bs.progress?.total ?? '?'}</span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                              <div
                                className="h-2 bg-pontifex-500 rounded-full transition-all"
                                style={{ width: `${bs.progress?.total ? (bs.progress.done / bs.progress.total) * 100 : 0}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <label className="flex items-center gap-3 px-4 py-3 rounded-lg border-2 border-dashed border-slate-200 hover:border-pontifex-400 hover:bg-pontifex-50 cursor-pointer transition-colors">
                            <span className="text-2xl">📁</span>
                            <div>
                              <p className="text-sm font-medium text-slate-700">Seleccionar estados de cuenta</p>
                              <p className="text-xs text-slate-500">Hasta 24 PDFs a la vez — se procesan automáticamente</p>
                            </div>
                            <input
                              type="file"
                              multiple
                              accept=".pdf,.jpg,.jpeg,.png"
                              className="hidden"
                              onChange={e => handleBulkUpload(cuenta.id, e.target.files)}
                            />
                          </label>
                        )}

                        {/* Results */}
                        {bs.results && bs.results.length > 0 && (() => {
                          // Agrupar resultados por divisa
                          const resultsMXN = bs.results.filter(r => r.success && r.extractedData?.divisa === 'MXN')
                          const resultsUSD = bs.results.filter(r => r.success && r.extractedData?.divisa === 'USD')
                          const resultsSinDivisa = bs.results.filter(r => r.success && !r.extractedData?.divisa)
                          const resultsError = bs.results.filter(r => !r.success)
                          
                          const renderResultRow = (r, i) => (
                            <div key={i} className={`flex flex-wrap items-center gap-2 text-xs px-3 py-1.5 rounded-lg ${
                              r.success ? 'bg-white border border-slate-100' : 'bg-red-50'
                            }`}>
                              <span>{r.success ? '✅' : '❌'}</span>
                              <span className="font-mono text-slate-700 truncate max-w-[180px]">{r.fileName}</span>
                              {r.success && r.extractedData && (
                                <>
                                  {r.extractedData.mes && <span className="bg-slate-50 border border-slate-200 px-2 py-0.5 rounded text-slate-600">{r.extractedData.mes}</span>}
                                  {r.extractedData.abonos != null && (
                                    <span className="text-emerald-700">↑ {new Intl.NumberFormat('es-MX',{style:'currency',currency:r.extractedData.divisa||'MXN',maximumFractionDigits:0}).format(r.extractedData.abonos)}</span>
                                  )}
                                  {r.extractedData.retiros != null && (
                                    <span className="text-red-600">↓ {new Intl.NumberFormat('es-MX',{style:'currency',currency:r.extractedData.divisa||'MXN',maximumFractionDigits:0}).format(r.extractedData.retiros)}</span>
                                  )}
                                  {r.extractedData.saldo_promedio != null && (
                                    <span className="text-slate-600">∅ {new Intl.NumberFormat('es-MX',{style:'currency',currency:r.extractedData.divisa||'MXN',maximumFractionDigits:0}).format(r.extractedData.saldo_promedio)}</span>
                                  )}
                                  {r.extractedData.confianza && (
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${
                                      r.extractedData.confianza === 'alta' ? 'bg-emerald-100 text-emerald-700' :
                                      r.extractedData.confianza === 'media' ? 'bg-amber-100 text-amber-700' :
                                      'bg-red-100 text-red-700'
                                    }`}>{r.extractedData.confianza}</span>
                                  )}
                                </>
                              )}
                              {!r.success && <span className="text-red-600">{r.error}</span>}
                            </div>
                          )
                          
                          return (
                            <div className="space-y-3">
                              <p className="text-xs font-semibold text-slate-600">Resultados del lote ({bs.results.length} archivos):</p>
                              
                              {/* Pesos MXN */}
                              {resultsMXN.length > 0 && (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">MXN</span>
                                    <span className="text-xs text-slate-500">{resultsMXN.length} estado(s) en pesos</span>
                                  </div>
                                  <div className="space-y-1 pl-2">
                                    {resultsMXN.map(renderResultRow)}
                                  </div>
                                </div>
                              )}
                              
                              {/* Dólares USD */}
                              {resultsUSD.length > 0 && (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-700">USD</span>
                                    <span className="text-xs text-slate-500">{resultsUSD.length} estado(s) en dólares</span>
                                  </div>
                                  <div className="space-y-1 pl-2">
                                    {resultsUSD.map(renderResultRow)}
                                  </div>
                                </div>
                              )}
                              
                              {/* Sin divisa detectada */}
                              {resultsSinDivisa.length > 0 && (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">⚠️ Sin divisa</span>
                                    <span className="text-xs text-slate-500">{resultsSinDivisa.length} archivo(s)</span>
                                  </div>
                                  <div className="space-y-1 pl-2">
                                    {resultsSinDivisa.map(renderResultRow)}
                                  </div>
                                </div>
                              )}
                              
                              {/* Errores */}
                              {resultsError.length > 0 && (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">❌ Errores</span>
                                    <span className="text-xs text-slate-500">{resultsError.length} archivo(s)</span>
                                  </div>
                                  <div className="space-y-1 pl-2">
                                    {resultsError.map(renderResultRow)}
                                  </div>
                                </div>
                              )}
                            </div>
                          )
                        })()}
                      </div>
                    </div>
                  )
                })}
              </div>
            )
          })()}

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
                    <span className="font-medium text-slate-800">
                    {extractedFields.tipo === 'estado_cuenta_bancario' ? 'Datos extraídos: Estado de Cuenta' : 'Datos extraídos de la Constancia'}
                  </span>
                    <p className="text-xs text-slate-500 mt-0.5">Revisa y confirma los datos antes de guardarlos</p>
                  </div>
                  <span className="px-2 py-1 rounded text-sm font-medium bg-emerald-100 text-emerald-800">
                    ✓ Extraído con Textract
                  </span>
                </div>
                <div className="p-6">
                  {/* ── Estado de cuenta bancario ── */}
                  {extractedFields.tipo === 'estado_cuenta_bancario' ? (
                    <div>
                      <div className="grid grid-cols-3 gap-3 mb-4">
                        <div className="bg-slate-50 rounded-lg p-4 border border-slate-100 text-center">
                          <p className="text-xs text-slate-500 mb-1">Periodo</p>
                          <p className="text-lg font-bold text-slate-800">{extractedFields.mes ?? '—'}</p>
                          <p className="text-xs text-slate-400 mt-0.5">{extractedFields.banco_detectado ?? ''}</p>
                        </div>
                        <div className="bg-emerald-50 rounded-lg p-4 border border-emerald-100 text-center">
                          <p className="text-xs text-emerald-600 mb-1">Total abonos</p>
                          <p className="text-lg font-bold text-emerald-700">
                            {extractedFields.abonos != null
                              ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(extractedFields.abonos)
                              : '—'}
                          </p>
                        </div>
                        <div className="bg-red-50 rounded-lg p-4 border border-red-100 text-center">
                          <p className="text-xs text-red-600 mb-1">Total retiros</p>
                          <p className="text-lg font-bold text-red-700">
                            {extractedFields.retiros != null
                              ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(extractedFields.retiros)
                              : '—'}
                          </p>
                        </div>
                      </div>
                      {extractedFields.confianza != null && (
                        <p className="text-xs text-slate-400 text-center">
                          Confianza de extracción: {Math.round(extractedFields.confianza * 100)}%
                        </p>
                      )}
                    </div>
                  ) : (
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
                  )} {/* end CSF / bank statement conditional */}
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
                      {confirmingData ? 'Confirmando...' : extractedFields?.tipo === 'estado_cuenta_bancario' ? '✓ Confirmar datos' : '✓ Confirmar y actualizar cliente'}
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
                  onClick={() => handleDecision('approved')}
                  className="px-5 py-2.5 rounded-lg font-medium bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  Aprobar (según recomendación)
                </button>
                <button
                  type="button"
                  onClick={() => handleDecision('adjusted')}
                  className="px-5 py-2.5 rounded-lg font-medium border border-amber-300 text-amber-800 bg-amber-50 hover:bg-amber-100"
                >
                  Aprobar con ajustes
                </button>
                <button
                  type="button"
                  onClick={() => handleDecision('rejected')}
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
