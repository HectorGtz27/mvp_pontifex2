import { useState, useRef } from 'react'
import { INITIAL_FORM } from './constants'

/**
 * Hook personalizado para manejar todo el estado del flujo completo
 */
export function useFullFlowState() {
  // ── Estados principales ──
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState(INITIAL_FORM)
  const [clienteId, setClienteId] = useState(null)
  const [solicitudId, setSolicitudId] = useState(null)
  
  // ── Estados de documentos ──
  const [docSubStep, setDocSubStep] = useState('checklist')
  const [selectedDocType, setSelectedDocType] = useState(null)
  const [documentsComplete, setDocumentsComplete] = useState(false)
  const [documentTypes, setDocumentTypes] = useState([])
  const [uploadedDocs, setUploadedDocs] = useState({})
  const [currentDocumentData, setCurrentDocumentData] = useState(null)
  
  // ── Estados de upload ──
  const [uploading, setUploading] = useState(false)
  const [uploadResult, setUploadResult] = useState(null)
  const [uploadError, setUploadError] = useState(null)
  const [dragOver, setDragOver] = useState(false)
  const [extractedFields, setExtractedFields] = useState(null)
  const [confirmingData, setConfirmingData] = useState(false)
  const fileInputRef = useRef(null)
  
  // ── Estados de Estados Financieros ──
  const [showFsPanel, setShowFsPanel] = useState(false)
  const [fsYear1, setFsYear1] = useState({ uploading: false, dragOver: false, data: null, fileName: null })
  const [fsYear2, setFsYear2] = useState({ uploading: false, dragOver: false, data: null, fileName: null })
  const [fsYear3, setFsYear3] = useState({ uploading: false, dragOver: false, data: null, fileName: null })
  const fsPanelRef = useRef(null)
  const fsRef1 = useRef(null)
  const fsRef2 = useRef(null)
  const fsRef3 = useRef(null)
  
  // ── Estados de Cuentas Bancarias ──
  const [cuentasBancarias, setCuentasBancarias] = useState([])
  const [bsNewBanco, setBsNewBanco] = useState('')
  const [bsAddingCuenta, setBsAddingCuenta] = useState(false)
  const [bsBulkState, setBsBulkState] = useState({})
  const [bankStatements, setBankStatements] = useState([])
  
  // ── Estados de Dashboard ──
  const [spreadsheetData, setSpreadsheetData] = useState([])
  const [scoreData, setScoreData] = useState(null)
  const [kpisData, setKpisData] = useState([])
  const [recommendationData, setRecommendationData] = useState(null)
  
  // ── Estados de Decisión ──
  const [decision, setDecision] = useState(null)
  const [analystNotes, setAnalystNotes] = useState('')
  
  // ── Estados de loading ──
  const [loading, setLoading] = useState(false)
  const [savingApp, setSavingApp] = useState(false)
  
  const updateForm = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }))
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
    setBankStatements([])
    setFsYear1({ uploading: false, dragOver: false, data: null, fileName: null })
    setFsYear2({ uploading: false, dragOver: false, data: null, fileName: null })
    setFsYear3({ uploading: false, dragOver: false, data: null, fileName: null })
  }
  
  return {
    // Estados
    currentStep, setCurrentStep,
    formData, setFormData, updateForm,
    clienteId, setClienteId,
    solicitudId, setSolicitudId,
    docSubStep, setDocSubStep,
    selectedDocType, setSelectedDocType,
    documentsComplete, setDocumentsComplete,
    documentTypes, setDocumentTypes,
    uploadedDocs, setUploadedDocs,
    currentDocumentData, setCurrentDocumentData,
    uploading, setUploading,
    uploadResult, setUploadResult,
    uploadError, setUploadError,
    dragOver, setDragOver,
    extractedFields, setExtractedFields,
    confirmingData, setConfirmingData,
    fileInputRef,
    showFsPanel, setShowFsPanel,
    fsYear1, setFsYear1,
    fsYear2, setFsYear2,
    fsYear3, setFsYear3,
    fsPanelRef, fsRef1, fsRef2, fsRef3,
    cuentasBancarias, setCuentasBancarias,
    bsNewBanco, setBsNewBanco,
    bsAddingCuenta, setBsAddingCuenta,
    bsBulkState, setBsBulkState,
    bankStatements, setBankStatements,
    spreadsheetData, setSpreadsheetData,
    scoreData, setScoreData,
    kpisData, setKpisData,
    recommendationData, setRecommendationData,
    decision, setDecision,
    analystNotes, setAnalystNotes,
    loading, setLoading,
    savingApp, setSavingApp,
    resetFlow,
  }
}
