import { FS_TYPE_IDS, FS_LABELS } from './constants'

/**
 * Componente que muestra el checklist de documentos requeridos
 */
export default function DocumentChecklist({
  formData,
  documentTypes,
  uploadedDocs,
  cuentasBancarias,
  fsYear1,
  fsYear2,
  fsYear3,
  docStatus,
  onSelectDocumentToReplace,
  onViewDocumentDetails,
  onShowFsPanel,
  onOpenBankStatements,
}) {
  const totalValidated = Object.values(uploadedDocs).filter(d => d.status === 'validated').length
  const totalDocs = documentTypes.reduce((acc, cat) => acc + (cat.tipos?.length || 0), 0)
  const anyFsUploading = fsYear1.uploading || fsYear2.uploading || fsYear3.uploading

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
        <span className="font-medium text-slate-800">Solicitud — {formData.razonSocial || 'Solicitante'}</span>
        <span className="text-sm text-slate-600">
          {totalValidated}/{totalDocs} validados
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
              
              // Skip intermediate financial statements (they're grouped)
              if (doc.id === 'edos_financieros_anio2' || doc.id === 'edo_financiero_parcial') return null
              
              // Estados Financieros (grouped)
              if (doc.id === 'edos_financieros_anio1') {
                return (
                  <FinancialStatementsRow
                    key="fs-unified"
                    docStatus={docStatus}
                    fsYear1={fsYear1}
                    fsYear2={fsYear2}
                    fsYear3={fsYear3}
                    anyFsUploading={anyFsUploading}
                    onShowFsPanel={onShowFsPanel}
                  />
                )
              }
              
              // Estados de cuenta bancarios (special handling)
              if (doc.id === 'edos_cuenta_bancarios') {
                return (
                  <BankStatementsRow
                    key={doc.id}
                    doc={doc}
                    cuentasBancarias={cuentasBancarias}
                    onOpenBankStatements={onOpenBankStatements}
                  />
                )
              }
              
              // Regular document
              return (
                <RegularDocumentRow
                  key={doc.id}
                  doc={doc}
                  status={s}
                  onSelectDocumentToReplace={onSelectDocumentToReplace}
                  onViewDocumentDetails={onViewDocumentDetails}
                />
              )
            })}
          </ul>
        </div>
      ))}
    </div>
  )
}

function FinancialStatementsRow({ docStatus, fsYear1, fsYear2, fsYear3, anyFsUploading, onShowFsPanel }) {
  const s1 = docStatus('edos_financieros_anio1')
  const s2 = docStatus('edos_financieros_anio2')
  const s3 = docStatus('edo_financiero_parcial')
  const allValidated = s1.status === 'validated' && s2.status === 'validated' && s3.status === 'validated'
  const anyValidated = s1.status === 'validated' || s2.status === 'validated' || s3.status === 'validated'
  
  return (
    <li className="px-4 py-3 hover:bg-slate-50/50">
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
            onClick={onShowFsPanel} 
            className="text-sm font-medium text-pontifex-600 hover:text-pontifex-700"
          >
            {anyValidated ? 'Agregar / reemplazar' : 'Subir (1–3 PDFs)'}
          </button>
        )}
      </div>
      <div className="mt-2 ml-10 space-y-1">
        {FS_TYPE_IDS.map((tid, i) => {
          const st = docStatus(tid)
          const yr = [fsYear1.data, fsYear2.data, fsYear3.data][i]
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

function BankStatementsRow({ doc, cuentasBancarias, onOpenBankStatements }) {
  const totalCuentas = cuentasBancarias.length
  const totalDocs = cuentasBancarias.reduce((sum, c) => sum + (c.documentos?.length || 0), 0)
  const hasDocs = totalDocs > 0
  
  return (
    <li className="px-4 py-3 hover:bg-slate-50/50">
      <div className="flex items-center gap-4">
        <span className="w-6">
          {hasDocs && <span className="text-emerald-500">✓</span>}
          {!hasDocs && <span className="text-slate-300">○</span>}
        </span>
        <span className="flex-1 text-slate-800 font-medium">
          {doc.label}
        </span>
        {hasDocs && (
          <span className="text-sm text-slate-500">{totalDocs} estado(s) subido(s)</span>
        )}
        <button 
          type="button" 
          onClick={onOpenBankStatements} 
          className="text-sm font-medium text-pontifex-600 hover:text-pontifex-700"
        >
          Gestionar {totalCuentas > 0 ? `(${totalCuentas} cuenta${totalCuentas !== 1 ? 's' : ''})` : ''}
        </button>
      </div>
      {hasDocs && (
        <div className="mt-2 ml-10 space-y-1">
          {cuentasBancarias.map((cuenta) => {
            if (!cuenta.documentos || cuenta.documentos.length === 0) return null
            
            const docsMXN = cuenta.documentos.filter(d => !d.divisa || d.divisa === 'MXN').length
            const docsUSD = cuenta.documentos.filter(d => d.divisa === 'USD').length
            
            return (
              <div key={cuenta.id} className="flex items-center gap-2 text-xs text-slate-500">
                <span className="text-emerald-500">✓</span>
                <span className="font-medium">{cuenta.banco}</span>
                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${cuenta.divisa === 'USD' ? 'bg-sky-100 text-sky-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {cuenta.divisa}
                </span>
                {docsMXN > 0 && <span className="text-slate-400">{docsMXN} MXN</span>}
                {docsUSD > 0 && <span className="text-slate-400">{docsUSD} USD</span>}
              </div>
            )
          })}
        </div>
      )}
    </li>
  )
}

function RegularDocumentRow({ doc, status, onSelectDocumentToReplace, onViewDocumentDetails }) {
  return (
    <li className="flex items-center gap-4 px-4 py-3 hover:bg-slate-50/50">
      <span className="w-6">
        {status.status === 'validated' && <span className="text-emerald-500">✓</span>}
        {status.status === 'pending_review' && <span className="text-amber-500">◐</span>}
        {status.status === 'pending' && <span className="text-slate-300">○</span>}
      </span>
      <span className="flex-1 text-slate-800">{doc.label}</span>
      {status.fileName && <span className="text-sm text-slate-500 font-mono">{status.fileName}</span>}
      <div className="flex gap-2">
        {status.status === 'validated' && status.documentoId && (
          <button 
            type="button" 
            onClick={() => onViewDocumentDetails(doc)} 
            className="text-sm font-medium text-slate-600 hover:text-slate-800"
          >
            Ver detalles
          </button>
        )}
        <button 
          type="button" 
          onClick={() => onSelectDocumentToReplace(doc)} 
          className="text-sm font-medium text-pontifex-600 hover:text-pontifex-700"
        >
          {status.status === 'pending' ? 'Subir' : 'Reemplazar'}
        </button>
      </div>
    </li>
  )
}
