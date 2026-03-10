import { useState, useRef, useEffect, useCallback } from 'react'
import { useLocation } from 'react-router-dom'
import {
  fetchDocumentTypes,
  fetchSpreadsheet,
  fetchScore,
  fetchKpis,
  fetchRecommendation,
  fetchSolicitud,
  createCliente,
  createSolicitud,
  updateSolicitud,
  updateCliente,
  submitDecision,
  fetchCuentasBancarias,
  createCuentaBancaria,
  deleteCuentaBancaria,
  calcularLiquidez,
  calcularRentabilidad,
  calcularBuro,
  calcularDscr,
  calcularScore,
} from '../../utils/api'
import showToast from '../../utils/toast'

import {
  STEPS, INITIAL_FORM,
  FS_TYPE_IDS, FS_LABELS,
} from './constants'
import StepForm from './StepForm'
import StepEvaluation from './StepEvaluation'
import DocumentChecklist from './DocumentChecklist'
import BankStatements from './BankStatements'
import FinancialStatementsPanel from './FinancialStatementsPanel'
import SpreadsheetView from './SpreadsheetView'

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
  const [currentDocumentData, setCurrentDocumentData] = useState(null)
  const fileInputRef = useRef(null)

  // ── API-driven state ──
  const [clienteId, setClienteId] = useState(null)
  const [solicitudId, setSolicitudId] = useState(null)
  const [documentTypes, setDocumentTypes] = useState([])
  const [uploadedDocs, setUploadedDocs] = useState({})
  const [spreadsheetData, setSpreadsheetData] = useState([])
  const [scoreData, setScoreData] = useState(null)
  const [kpisData, setKpisData] = useState([])
  const [bankStatements, setBankStatements] = useState([])
  // ── Cuentas Bancarias ──
  const [cuentasBancarias, setCuentasBancarias] = useState([])
  const [bsNewBanco, setBsNewBanco] = useState('')
  const [bsAddingCuenta, setBsAddingCuenta] = useState(false)
  const [bsBulkState, setBsBulkState] = useState({})
  const [recommendationData, setRecommendationData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [savingApp, setSavingApp] = useState(false)
  // ── Estados Financieros ──
  const [showFsPanel, setShowFsPanel] = useState(false)
  const fsPanelRef = useRef(null)
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

  // ── Load documents when entering documents step ──
  useEffect(() => {
    if (solicitudId && currentStep === 1) {
      // Cargar documentos
      fetch(`/api/solicitudes/${solicitudId}/documents`)
        .then(res => res.ok ? res.json() : [])
        .then(docs => {
          const docsMap = {}
          docs.forEach(doc => {
            const isValidated = doc.extractedData || doc.estado === 'procesado'
            docsMap[doc.tipoDocumentoId] = {
              status: isValidated ? 'validated' : 'pending_review',
              fileName: doc.fileName,
              documentoId: doc.id
            }
          })
          setUploadedDocs(docsMap)

          const fsTypeOrder = ['edos_financieros_anio1', 'edos_financieros_anio2', 'edo_financiero_parcial']
          const setters = [setFsYear1, setFsYear2, setFsYear3]
          fsTypeOrder.forEach((tid, idx) => {
            const d = docs.find(x => x.tipoDocumentoId === tid)
            if (d?.extractedData?.tipo === 'estados_financieros') {
              setters[idx]({ uploading: false, dragOver: false, data: d.extractedData, fileName: d.fileName })
            }
          })
        })
        .catch(err => console.error('Error loading documents:', err))
      
      // Cargar cuentas bancarias
      fetchCuentasBancarias(solicitudId)
        .then(cuentas => setCuentasBancarias(cuentas))
        .catch(err => console.error('Error loading bank accounts:', err))
    }
  }, [solicitudId, currentStep])

  // ── Auto-scroll to FS panel ──
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
            nivelBuroCredito: sol.nivelBuroCredito || '',
            esg: sol.esg || '',
            notas: sol.notas || '',
          })
          setClienteId(sol.clienteId)

          try {
            const res = await fetch(`/api/solicitudes/${solicitudIdFromState}/documents`)
            if (res.ok) {
              const docs = await res.json()
              const docsMap = {}
              docs.forEach(doc => {
                const isValidated = doc.extractedData || doc.estado === 'procesado'
                docsMap[doc.tipoDocumentoId] = {
                  status: isValidated ? 'validated' : 'pending_review',
                  fileName: doc.fileName,
                  documentoId: doc.id
                }
              })
              setUploadedDocs(docsMap)

              const fsTypeOrder = ['edos_financieros_anio1', 'edos_financieros_anio2', 'edo_financiero_parcial']
              const setters = [setFsYear1, setFsYear2, setFsYear3]
              fsTypeOrder.forEach((tid, idx) => {
                const d = docs.find(x => x.tipoDocumentoId === tid)
                if (d?.extractedData?.tipo === 'estados_financieros') {
                  setters[idx]({ uploading: false, dragOver: false, data: d.extractedData, fileName: d.fileName })
                }
              })
            }
            
            // Cargar cuentas bancarias
            const cuentas = await fetchCuentasBancarias(solicitudIdFromState)
            setCuentasBancarias(cuentas)
          } catch (err) {
            console.error('Error loading documents:', err)
          }

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
      // Calcular indicadores de liquidez automáticamente
      try {
        await calcularLiquidez(id)
        console.log('✅ Indicadores de liquidez calculados automáticamente')
      } catch (err) {
        console.warn('⚠️ No se pudieron calcular indicadores de liquidez:', err.message)
        // No es crítico, continuar cargando el dashboard
      }

      // Calcular indicadores de rentabilidad automáticamente
      try {
        await calcularRentabilidad(id)
        console.log('✅ Indicadores de rentabilidad calculados automáticamente')
      } catch (err) {
        console.warn('⚠️ No se pudieron calcular indicadores de rentabilidad:', err.message)
        // No es crítico, continuar cargando el dashboard
      }

      // Calcular score de buró de crédito automáticamente
      try {
        await calcularBuro(id)
        console.log('✅ Score de buró de crédito calculado automáticamente')
      } catch (err) {
        console.warn('⚠️ No se pudo calcular score de buró:', err.message)
        // No es crítico, continuar cargando el dashboard
      }

      // Calcular DSCR automáticamente
      try {
        await calcularDscr(id)
        console.log('✅ DSCR calculado automáticamente')
      } catch (err) {
        console.warn('⚠️ No se pudo calcular DSCR:', err.message)
        // No es crítico, continuar cargando el dashboard
      }

      // Calcular Score Compuesto automáticamente
      try {
        await calcularScore(id)
        console.log('✅ Score compuesto calculado automáticamente')
      } catch (err) {
        console.warn('⚠️ No se pudo calcular score compuesto:', err.message)
        // No es crítico, continuar cargando el dashboard
      }

      // Cargar datos del dashboard
      const [score, kpis, rec, sheet] = await Promise.allSettled([
        fetchScore(id), fetchKpis(id), fetchRecommendation(id), fetchSpreadsheet(id),
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
    setSavingApp(true);
    try {
      // Si ya existe solicitudId, actualizar solicitud y cliente
      if (solicitudId) {
        if (clienteId) {
          await updateCliente(clienteId, {
            razonSocial: formData.razonSocial,
            nombreComercial: formData.nombreComercial || null,
            telefono: formData.telefono || null,
            celular: formData.celular || null,
            correoElectronico: formData.correoElectronico || null,
            paginaWeb: formData.paginaWeb || null,
            numEmpleadosPermanentes: formData.numEmpleadosPermanentes || null,
            numEmpleadosEventuales: formData.numEmpleadosEventuales || null,
          });
          showToast.cliente.updated && showToast.cliente.updated();
        }
        await updateSolicitud(solicitudId, {
          monto: Number(formData.monto),
          divisa: formData.divisa || 'MXN',
          plazoDeseado: formData.plazoDeseado || null,
          destino: formData.destino || null,
          tasaObjetivo: formData.tasaObjetivo || null,
          tipoColateral: formData.tipoColateral || null,
          nivelVentasAnuales: formData.nivelVentasAnuales ? Number(formData.nivelVentasAnuales) : null,
          margenRealUtilidad: formData.margenRealUtilidad ? Number(formData.margenRealUtilidad) : null,
          nivelBuroCredito: formData.nivelBuroCredito || null,
          esg: formData.esg || null,
          notas: formData.notas || null,
        });
        showToast.solicitud.updated();
        setCurrentStep(1);
      } else {
        // Crear cliente y solicitud
        const cliente = await createCliente({
          razonSocial: formData.razonSocial,
          nombreComercial: formData.nombreComercial || null,
          telefono: formData.telefono || null,
          celular: formData.celular || null,
          correoElectronico: formData.correoElectronico || null,
          paginaWeb: formData.paginaWeb || null,
          numEmpleadosPermanentes: formData.numEmpleadosPermanentes || null,
          numEmpleadosEventuales: formData.numEmpleadosEventuales || null,
        });
        setClienteId(cliente.id);
        showToast.cliente.created();

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
          nivelBuroCredito: formData.nivelBuroCredito || null,
          esg: formData.esg || null,
          notas: formData.notas || null,
        });
        setSolicitudId(sol.id);
        showToast.solicitud.created();
        setCurrentStep(1);
      }
    } catch (err) {
      showToast.error(err.message || 'Error al crear/editar la solicitud');
    } finally {
      setSavingApp(false);
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

  // ── Financial year upload ──
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
      if (!res.ok || !data.success) throw new Error(data.error || 'Error al subir')

      setYearState({ uploading: false, dragOver: false, data: data.extractedData, fileName: file.name })
      setUploadedDocs(prev => ({ ...prev, [typeId]: { status: 'validated', fileName: file.name } }))
      showToast.documento.uploaded()

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

  // ── Load current document data when replacing ──
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

  // ── View document details (read-only) ──
  const handleViewDocumentDetails = async (doc) => {
    setSelectedDocType(doc)
    setExtractedFields(null)
    const docInfo = docStatus(doc.id)
    if (docInfo.documentoId && solicitudId) {
      try {
        const res = await fetch(`/api/solicitudes/${solicitudId}/documents`)
        if (res.ok) {
          const docs = await res.json()
          const currentDoc = docs.find(d => d.id === docInfo.documentoId)
          if (currentDoc && currentDoc.extractedData) {
            setExtractedFields(currentDoc.extractedData)
            setDocSubStep('extraction')
          } else {
            showToast.info('Este documento no tiene datos extraídos.')
          }
        }
      } catch (err) {
        console.error('Error loading document details:', err)
        showToast.error('Error al cargar los detalles del documento')
      }
    }
  }

  const handleFileUpload = async (file) => {
    if (!file) return
    setUploading(true)
    setUploadError(null)
    setUploadResult(null)
    setExtractedFields(null)
    const formDataUpload = new FormData()
    formDataUpload.append('file', file)
    if (selectedDocType?.id) formDataUpload.append('documentTypeId', selectedDocType.id)
    if (solicitudId) formDataUpload.append('solicitudId', solicitudId)

    showToast.documento.processing()

    try {
      const res = await fetch('/api/upload', { method: 'POST', body: formDataUpload })
      const data = await res.json()
      if (!res.ok || !data.success) {
        setUploadError(data.error || 'Error al subir el archivo.')
        showToast.documento.uploadError()
      } else {
        setUploadResult(data)
        showToast.documento.uploaded()
        if (data.extractedData) {
          setExtractedFields(data.extractedData)
          setDocSubStep('extraction')
        } else {
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
        setFormData(prev => ({
          ...prev,
          razonSocial: extractedFields.razon_social || prev.razonSocial,
          nombreComercial: extractedFields.nombre_comercial || prev.nombreComercial,
        }))
      }

      if (extractedFields?.tipo === 'estado_cuenta_bancario') {
        setBankStatements(prev => {
          const filtered = prev.filter(b => b.mes !== extractedFields.mes)
          return [...filtered, {
            mes: extractedFields.mes,
            abonos: extractedFields.abonos,
            retiros: extractedFields.retiros,
            banco_detectado: extractedFields.banco_detectado,
          }]
        })
      }

      if (selectedDocType?.id) {
        setUploadedDocs(prev => ({
          ...prev,
          [selectedDocType.id]: {
            status: 'validated',
            fileName: uploadResult?.documento?.nombre_archivo || 'archivo.pdf'
          }
        }))
      }

      setDocSubStep('checklist')
      setExtractedFields(null)
    } catch (err) {
      alert('Error al confirmar los datos: ' + err.message)
    } finally {
      setConfirmingData(false)
    }
  }

  // Form validation
  const formComplete = formData.razonSocial?.trim() && formData.monto && formData.destino?.trim()
  const canGoToStep1 = formComplete
  const canGoToStep2 = documentsComplete
  
  const updateForm = async (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    
    // Auto-save nivelBuroCredito and esg when changed
    if ((field === 'nivelBuroCredito' || field === 'esg') && solicitudId) {
      try {
        await updateSolicitud(solicitudId, { [field]: value || null })
        console.log(`✅ ${field} actualizado automáticamente:`, value)
      } catch (err) {
        console.error(`Error al actualizar ${field}:`, err)
        showToast.error(`Error al guardar ${field === 'nivelBuroCredito' ? 'nivel de buró' : 'ESG'}`)
      }
    }
  }

  // ── Cuentas Bancarias handlers ──
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
      setBsBulkState(prev => ({
        ...prev,
        [cuentaId]: { uploading: false, progress: { done: data.successful, total: data.total }, results: data.results }
      }))
      const updated = await fetchCuentasBancarias(solicitudId)
      setCuentasBancarias(updated)
      data.results.forEach(r => {
        if (r.success && r.extractedData?.mes) {
          // ── Detectar y mostrar warning de conflicto de meses ──
          if (r.extractedData._warning?.type === 'month_conflict') {
            const w = r.extractedData._warning
            const añosTodos = [w.añoNuevo, ...w.añosExistentes]
            showToast.monthConflict(w.mesNombre, añosTodos)
          }
          
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
          <button type="button" onClick={resetFlow} className="text-sm text-slate-500 hover:text-slate-700 shrink-0">Reiniciar flujo</button>
          {STEPS.map((step, i) => (
            <div key={step.id} className="flex items-center flex-1 last:flex-none">
              <button
                type="button"
                onClick={() => {
                  if (step.id === 0) setCurrentStep(0)
                  if (step.id === 1 && canGoToStep1) setCurrentStep(1)
                  if (step.id === 2 && canGoToStep2) {
                    setCurrentStep(2)
                    loadDashboardData(solicitudId)
                  }
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
                <span className={`text-sm font-medium hidden sm:inline ${currentStep >= step.id ? 'text-slate-800' : 'text-slate-400'}`}>{step.short}</span>
              </button>
              {i < STEPS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-1 max-w-[60px] ${currentStep > step.id ? 'bg-pontifex-400' : 'bg-slate-200'}`} />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ========== STEP 0 ========== */}
      {currentStep === 0 && (
        <StepForm
          formData={formData}
          updateForm={updateForm}
          formComplete={formComplete}
          savingApp={savingApp}
          onSubmit={handleCreateApplication}
        />
      )}

      {/* ========== STEP 1: Documentos ========== */}
      {currentStep === 1 && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Paso 1 — Carga y validación de documentos</h1>
              <p className="text-slate-600 mt-1">Sube los documentos; el sistema extrae y valida los datos para el análisis.</p>
            </div>
            <button type="button" onClick={() => setCurrentStep(0)} className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100 text-sm">← Datos de solicitud</button>
          </div>

          {docSubStep === 'checklist' && !showFsPanel && (
            <>
              <DocumentChecklist
                formData={formData}
                documentTypes={documentTypes}
                uploadedDocs={uploadedDocs}
                cuentasBancarias={cuentasBancarias}
                fsYear1={fsYear1}
                fsYear2={fsYear2}
                fsYear3={fsYear3}
                docStatus={docStatus}
                onSelectDocumentToReplace={handleSelectDocumentToReplace}
                onViewDocumentDetails={handleViewDocumentDetails}
                onShowFsPanel={() => setShowFsPanel(true)}
                onOpenBankStatements={handleOpenBankStatements}
              />

              {/* Spreadsheet: key values extracted via OCR */}
              <SpreadsheetView
                formData={formData}
                spreadsheetData={spreadsheetData}
                solicitudId={solicitudId}
                cuentasBancarias={cuentasBancarias}
                setCuentasBancarias={setCuentasBancarias}
                bankStatements={bankStatements}
                fsYear1={fsYear1}
                fsYear2={fsYear2}
                fsYear3={fsYear3}
              />

              <div className="flex justify-end">
                <button type="button" onClick={() => { setDocumentsComplete(true); setCurrentStep(2); loadDashboardData(solicitudId) }} className="px-5 py-2.5 bg-pontifex-600 text-white rounded-lg font-medium hover:bg-pontifex-700">
                  Documentos listos → Ir a evaluación
                </button>
              </div>
            </>
          )}

          {/* ── Estados Financieros Panel ── */}
          {docSubStep === 'checklist' && showFsPanel && (
            <FinancialStatementsPanel
              fsPanelRef={fsPanelRef}
              fsYear1={fsYear1}
              setFsYear1={setFsYear1}
              fsRef1={fsRef1}
              fsYear2={fsYear2}
              setFsYear2={setFsYear2}
              fsRef2={fsRef2}
              fsYear3={fsYear3}
              setFsYear3={setFsYear3}
              fsRef3={fsRef3}
              docStatus={docStatus}
              onFinancialYearUpload={handleFinancialYearUpload}
              onClose={() => setShowFsPanel(false)}
            />
          )}

          {docSubStep === 'bank-statements' && (
            <BankStatements
              cuentasBancarias={cuentasBancarias}
              bsNewBanco={bsNewBanco}
              setBsNewBanco={setBsNewBanco}
              bsAddingCuenta={bsAddingCuenta}
              bsBulkState={bsBulkState}
              onAddCuenta={handleAddCuenta}
              onDeleteCuenta={handleDeleteCuenta}
              onBulkUpload={handleBulkUpload}
              onBack={() => setDocSubStep('checklist')}
            />
          )}

          {docSubStep === 'upload' && (
            <>
              <div className="bg-white rounded-xl border border-slate-200 p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="font-semibold text-slate-900">Subir: {selectedDocType?.label}</h2>
                  <button type="button" onClick={() => { setDocSubStep('checklist'); setUploadResult(null); setUploadError(null); setCurrentDocumentData(null) }} className="text-sm text-slate-500 hover:text-slate-700">← Volver</button>
                </div>

                {currentDocumentData && currentDocumentData.extractedData && (
                  <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-start justify-between mb-3">
                      <div>
                        <h3 className="font-medium text-blue-900">Documento actual</h3>
                        <p className="text-sm text-blue-700 mt-1">{currentDocumentData.fileName}</p>
                        <p className="text-xs text-blue-600 mt-0.5">
                          Subido: {new Date(currentDocumentData.createdAt).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <span className="px-2 py-1 rounded text-xs font-medium bg-blue-100 text-blue-800">✓ Datos extraídos</span>
                    </div>
                    <div className="border-t border-blue-200 pt-3 mt-3">
                      <p className="text-xs font-medium text-blue-800 uppercase tracking-wide mb-2">Campos extraídos:</p>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        {Object.entries(currentDocumentData.extractedData).map(([key, value]) => {
                          if (key === '_extra' || !value || value === '') return null
                          const fieldLabel = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
                          return (
                            <div key={key} className="text-sm">
                              <span className="text-blue-700 font-medium">{fieldLabel}:</span>{' '}
                              <span className="text-blue-900">{typeof value === 'object' ? JSON.stringify(value) : value}</span>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                    <p className="text-xs text-blue-600 mt-3 italic">Al subir un nuevo archivo, estos datos serán reemplazados por los del nuevo documento.</p>
                  </div>
                )}

                <input ref={fileInputRef} type="file" accept=".pdf,.jpg,.jpeg,.png" className="hidden" onChange={(e) => { const file = e.target.files?.[0]; if (file) handleFileUpload(file) }} />

                <div
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true) }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => { e.preventDefault(); setDragOver(false); const file = e.dataTransfer.files?.[0]; if (file) handleFileUpload(file) }}
                  className={`border-2 border-dashed rounded-xl p-12 text-center transition-colors ${dragOver ? 'border-pontifex-400 bg-pontifex-50' : 'border-slate-200 bg-slate-50'}`}
                >
                  {uploading ? (
                    <div className="flex flex-col items-center gap-3">
                      <svg className="animate-spin h-8 w-8 text-pontifex-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      <p className="text-slate-600 font-medium">Subiendo archivo...</p>
                      {selectedDocType?.id === 'constancia_situacion_fiscal' && <p className="text-sm text-slate-500">Extrayendo datos con Textract (puede tardar 10-30 segundos)</p>}
                    </div>
                  ) : (
                    <>
                      <p className="text-slate-600 mb-4">Arrastra el archivo aquí o haz clic para seleccionar</p>
                      <p className="text-xs text-slate-400 mb-4">Formatos: PDF, JPG, JPEG, PNG · Máx 10 MB</p>
                      <button type="button" onClick={() => fileInputRef.current?.click()} className="px-4 py-2 bg-pontifex-600 text-white rounded-lg font-medium hover:bg-pontifex-700">Seleccionar archivo</button>
                    </>
                  )}
                </div>

                {uploadError && <div className="mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{uploadError}</div>}

                {uploadResult && (
                  <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 rounded-lg space-y-2">
                    <p className="text-emerald-800 font-medium">Archivo subido exitosamente a S3</p>
                    <p className="text-sm text-emerald-700">Nombre: {uploadResult.fileName}</p>
                    <p className="text-sm text-emerald-700 break-all">URL: {uploadResult.s3Url}</p>
                    <button type="button" onClick={() => { setDocSubStep('checklist'); setUploadResult(null); setCurrentDocumentData(null) }} className="mt-2 px-4 py-2 bg-pontifex-600 text-white rounded-lg font-medium hover:bg-pontifex-700 text-sm">Volver al listado</button>
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
                    <span className="font-medium text-slate-800">{extractedFields.tipo === 'estado_cuenta_bancario' ? 'Datos extraídos: Estado de Cuenta' : 'Datos extraídos de la Constancia'}</span>
                    <p className="text-xs text-slate-500 mt-0.5">Revisa y confirma los datos antes de guardarlos</p>
                  </div>
                  <span className="px-2 py-1 rounded text-sm font-medium bg-emerald-100 text-emerald-800">✓ Extraído con Textract</span>
                </div>
                <div className="p-6">
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
                            {extractedFields.abonos != null ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(extractedFields.abonos) : '—'}
                          </p>
                        </div>
                        <div className="bg-red-50 rounded-lg p-4 border border-red-100 text-center">
                          <p className="text-xs text-red-600 mb-1">Total retiros</p>
                          <p className="text-lg font-bold text-red-700">
                            {extractedFields.retiros != null ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(extractedFields.retiros) : '—'}
                          </p>
                        </div>
                      </div>
                      {extractedFields.confianza != null && <p className="text-xs text-slate-400 text-center">Confianza de extracción: {Math.round(extractedFields.confianza * 100)}%</p>}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {extractedFields.razon_social && (
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Razón Social</label>
                          <input type="text" value={extractedFields.razon_social} onChange={(e) => setExtractedFields({ ...extractedFields, razon_social: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800" />
                        </div>
                      )}
                      {extractedFields.rfc && (
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">RFC</label>
                          <input type="text" value={extractedFields.rfc} onChange={(e) => setExtractedFields({ ...extractedFields, rfc: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800" />
                        </div>
                      )}
                      {extractedFields.domicilio_fiscal && (
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Domicilio Fiscal</label>
                          <textarea rows={2} value={extractedFields.domicilio_fiscal} onChange={(e) => setExtractedFields({ ...extractedFields, domicilio_fiscal: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800 resize-none" />
                        </div>
                      )}
                      <div className="grid grid-cols-2 gap-4">
                        {extractedFields.ciudad && (
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Ciudad</label>
                            <input type="text" value={extractedFields.ciudad} onChange={(e) => setExtractedFields({ ...extractedFields, ciudad: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800" />
                          </div>
                        )}
                        {extractedFields.estado && (
                          <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">Estado</label>
                            <input type="text" value={extractedFields.estado} onChange={(e) => setExtractedFields({ ...extractedFields, estado: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800" />
                          </div>
                        )}
                      </div>
                      {extractedFields.nombre_comercial && (
                        <div>
                          <label className="block text-sm font-medium text-slate-700 mb-1">Nombre Comercial</label>
                          <input type="text" value={extractedFields.nombre_comercial} onChange={(e) => setExtractedFields({ ...extractedFields, nombre_comercial: e.target.value })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-slate-800" />
                        </div>
                      )}
                      {extractedFields._extra && (
                        <div className="pt-4 border-t border-slate-200">
                          <h3 className="text-sm font-semibold text-slate-700 mb-3">Información adicional</h3>
                          <div className="grid grid-cols-2 gap-3 text-sm">
                            {extractedFields._extra.estatus_padron && <div><span className="text-slate-500">Estatus padrón:</span><span className="ml-2 font-medium text-slate-800">{extractedFields._extra.estatus_padron}</span></div>}
                            {extractedFields._extra.fecha_inicio_operaciones && <div><span className="text-slate-500">Inicio operaciones:</span><span className="ml-2 font-medium text-slate-800">{extractedFields._extra.fecha_inicio_operaciones}</span></div>}
                            {extractedFields._extra.curp && <div><span className="text-slate-500">CURP:</span><span className="ml-2 font-medium text-slate-800">{extractedFields._extra.curp}</span></div>}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex justify-between items-center">
                  {uploadResult ? (
                    <button type="button" onClick={() => { setDocSubStep('upload'); setExtractedFields(null) }} className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100">← Subir otro archivo</button>
                  ) : (
                    <button type="button" onClick={() => { setDocSubStep('checklist'); setExtractedFields(null) }} className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100">← Volver al listado</button>
                  )}
                  <div className="flex gap-2">
                    <button type="button" onClick={() => { setDocSubStep('checklist'); setExtractedFields(null) }} className="px-4 py-2 border border-slate-200 rounded-lg text-slate-700 hover:bg-slate-100">Cerrar</button>
                    {uploadResult && (
                      <button type="button" onClick={handleConfirmExtractedData} disabled={confirmingData} className="px-5 py-2 bg-pontifex-600 text-white rounded-lg font-medium hover:bg-pontifex-700 disabled:opacity-50 disabled:cursor-not-allowed">
                        {confirmingData ? 'Confirmando...' : extractedFields?.tipo === 'estado_cuenta_bancario' ? '✓ Confirmar datos' : '✓ Confirmar y actualizar cliente'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ========== STEP 2 ========== */}
      {currentStep === 2 && (
        <StepEvaluation
        formData={formData}
        scoreData={scoreData}
        solicitudId={solicitudId}
        kpisData={kpisData}
        recommendationData={recommendationData}
        spreadsheetData={spreadsheetData}
        uploadedDocs={uploadedDocs}
        documentTypes={documentTypes}
        decision={decision}
        analystNotes={analystNotes}
        setAnalystNotes={setAnalystNotes}
        onDecision={handleDecision}
        onBackToDocuments={() => setCurrentStep(1)}
      />
      )}
    </div>
  )
}
