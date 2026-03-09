import { BANCOS_MX, MESES_CORTOS, getLast12Months } from './constants'

/**
 * Componente para gestionar estados de cuenta bancarios
 */
export default function BankStatements({
  cuentasBancarias,
  bsNewBanco,
  setBsNewBanco,
  bsAddingCuenta,
  bsBulkState,
  onAddCuenta,
  onDeleteCuenta,
  onBulkUpload,
  onBack,
}) {
  const last12 = getLast12Months()

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-slate-900 text-lg">Estados de cuenta bancarios</h2>
        <button type="button" onClick={onBack} className="text-sm text-slate-500 hover:text-slate-700">
          ← Volver al listado
        </button>
      </div>

      {/* Declarar nueva cuenta */}
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
            onClick={onAddCuenta} 
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

      {cuentasBancarias.length === 0 && (
        <p className="text-center text-slate-500 text-sm py-8">
          Declara las cuentas bancarias para comenzar la carga de estados.
        </p>
      )}

      {/* Lista de cuentas bancarias */}
      {cuentasBancarias.map(cuenta => {
        const bs = bsBulkState[cuenta.id] || {}
        const mesSet = new Set(cuenta.mesesCubiertos || [])
        const totalMeses = mesSet.size
        
        return (
          <div key={cuenta.id} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-slate-800">{cuenta.banco}</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cuenta.divisa === 'USD' ? 'bg-sky-100 text-sky-700' : 'bg-emerald-100 text-emerald-700'}`}>
                  {cuenta.divisa}
                </span>
                <span className="text-xs text-slate-500">{totalMeses}/12 meses</span>
              </div>
              <button 
                type="button" 
                onClick={() => onDeleteCuenta(cuenta.id)} 
                className="text-slate-400 hover:text-red-500 text-sm" 
                title="Eliminar cuenta"
              >
                ✕
              </button>
            </div>
            
            <div className="p-4 space-y-4">
              {/* Cobertura de meses */}
              <div>
                <p className="text-xs text-slate-500 mb-2">Cobertura (últimos 12 meses)</p>
                <div className="flex gap-1 flex-wrap">
                  {last12.map(periodo => {
                    const [yr, mo] = periodo.split('-')
                    const covered = mesSet.has(periodo)
                    
                    const docsDelMes = cuenta.documentos?.filter(d => {
                      if (!d.periodo) return false
                      const [docYear, docMonth] = d.periodo.split('-')
                      return docMonth === mo
                    }) || []
                    
                    const añosDelMes = [...new Set(docsDelMes.map(d => d.periodo.split('-')[0]))]
                    const hasConflict = añosDelMes.length > 1
                    const tooltip = hasConflict 
                      ? `${MESES_CORTOS[parseInt(mo)-1]} — ⚠️ Años: ${añosDelMes.join(', ')}`
                      : `${MESES_CORTOS[parseInt(mo)-1]} ${yr}${covered ? ' — subido' : ' — faltante'}`
                    
                    return (
                      <div 
                        key={periodo} 
                        title={tooltip} 
                        className={`w-10 h-8 rounded flex flex-col items-center justify-center text-xs font-medium ${
                          hasConflict 
                            ? 'bg-amber-100 text-amber-700 border-2 border-amber-500' 
                            : covered 
                              ? 'bg-emerald-100 text-emerald-700' 
                              : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        <span className="flex items-center gap-0.5">
                          {hasConflict && <span className="text-[10px]">⚠️</span>}
                          {MESES_CORTOS[parseInt(mo)-1]}
                        </span>
                        <span className="text-[10px]">{yr.slice(2)}</span>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Upload progress */}
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
                    onChange={e => onBulkUpload(cuenta.id, e.target.files)} 
                  />
                </label>
              )}

              {/* Documentos subidos */}
              {cuenta.documentos && cuenta.documentos.length > 0 && <DocumentosSubidos documentos={cuenta.documentos} />}

              {/* Resultados del último upload */}
              {bs.results && bs.results.length > 0 && <UploadResults results={bs.results} />}
            </div>
          </div>
        )
      })}
    </div>
  )
}

function DocumentosSubidos({ documentos }) {
  const docsMXN = documentos.filter(d => !d.divisa || d.divisa === 'MXN')
  const docsUSD = documentos.filter(d => d.divisa === 'USD')
  const docsSinDivisa = documentos.filter(d => !d.divisa)
  
  const renderDocRow = (doc, i) => (
    <div key={i} className="flex flex-wrap items-center gap-2 text-xs px-3 py-1.5 rounded-lg bg-white border border-slate-100">
      <span>📄</span>
      <span className="font-mono text-slate-700 truncate max-w-[180px]">{doc.fileName || 'documento.pdf'}</span>
      {doc.periodo && <span className="bg-slate-50 border border-slate-200 px-2 py-0.5 rounded text-slate-600">{doc.periodo}</span>}
      {doc.abonos != null && <span className="text-emerald-700">↑ {new Intl.NumberFormat('es-MX',{style:'currency',currency:doc.divisa||'MXN',maximumFractionDigits:0}).format(doc.abonos)}</span>}
      {doc.retiros != null && <span className="text-red-600">↓ {new Intl.NumberFormat('es-MX',{style:'currency',currency:doc.divisa||'MXN',maximumFractionDigits:0}).format(doc.retiros)}</span>}
      {doc.saldoPromedio != null && <span className="text-slate-600">∅ {new Intl.NumberFormat('es-MX',{style:'currency',currency:doc.divisa||'MXN',maximumFractionDigits:0}).format(doc.saldoPromedio)}</span>}
    </div>
  )
  
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-slate-600">Documentos subidos ({documentos.length}):</p>
      {docsMXN.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">MXN</span>
            <span className="text-xs text-slate-500">{docsMXN.length} estado(s) en pesos</span>
          </div>
          <div className="space-y-1 pl-2">{docsMXN.map(renderDocRow)}</div>
        </div>
      )}
      {docsUSD.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-700">USD</span>
            <span className="text-xs text-slate-500">{docsUSD.length} estado(s) en dólares</span>
          </div>
          <div className="space-y-1 pl-2">{docsUSD.map(renderDocRow)}</div>
        </div>
      )}
      {docsSinDivisa.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">⚠️ Sin divisa</span>
            <span className="text-xs text-slate-500">{docsSinDivisa.length} archivo(s)</span>
          </div>
          <div className="space-y-1 pl-2">{docsSinDivisa.map(renderDocRow)}</div>
        </div>
      )}
    </div>
  )
}

function UploadResults({ results }) {
  const resultsMXN = results.filter(r => r.success && r.extractedData?.divisa === 'MXN')
  const resultsUSD = results.filter(r => r.success && r.extractedData?.divisa === 'USD')
  const resultsSinDivisa = results.filter(r => r.success && !r.extractedData?.divisa)
  const resultsError = results.filter(r => !r.success)
  
  const renderResultRow = (r, i) => (
    <div key={i} className={`flex flex-wrap items-center gap-2 text-xs px-3 py-1.5 rounded-lg ${r.success ? 'bg-white border border-slate-100' : 'bg-red-50'}`}>
      <span>{r.success ? '✅' : '❌'}</span>
      <span className="font-mono text-slate-700 truncate max-w-[180px]">{r.fileName}</span>
      {r.success && r.extractedData && (
        <>
          {r.extractedData.mes && <span className="bg-slate-50 border border-slate-200 px-2 py-0.5 rounded text-slate-600">{r.extractedData.mes}</span>}
          {r.extractedData.abonos != null && <span className="text-emerald-700">↑ {new Intl.NumberFormat('es-MX',{style:'currency',currency:r.extractedData.divisa||'MXN',maximumFractionDigits:0}).format(r.extractedData.abonos)}</span>}
          {r.extractedData.retiros != null && <span className="text-red-600">↓ {new Intl.NumberFormat('es-MX',{style:'currency',currency:r.extractedData.divisa||'MXN',maximumFractionDigits:0}).format(r.extractedData.retiros)}</span>}
          {r.extractedData.saldo_promedio != null && <span className="text-slate-600">∅ {new Intl.NumberFormat('es-MX',{style:'currency',currency:r.extractedData.divisa||'MXN',maximumFractionDigits:0}).format(r.extractedData.saldo_promedio)}</span>}
          {r.extractedData.confianza && <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${r.extractedData.confianza === 'alta' ? 'bg-emerald-100 text-emerald-700' : r.extractedData.confianza === 'media' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>{r.extractedData.confianza}</span>}
        </>
      )}
      {!r.success && <span className="text-red-600">{r.error}</span>}
    </div>
  )
  
  return (
    <div className="space-y-3">
      <p className="text-xs font-semibold text-slate-600">Resultados del lote ({results.length} archivos):</p>
      {resultsMXN.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700">MXN</span>
            <span className="text-xs text-slate-500">{resultsMXN.length} estado(s) en pesos</span>
          </div>
          <div className="space-y-1 pl-2">{resultsMXN.map(renderResultRow)}</div>
        </div>
      )}
      {resultsUSD.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-sky-100 text-sky-700">USD</span>
            <span className="text-xs text-slate-500">{resultsUSD.length} estado(s) en dólares</span>
          </div>
          <div className="space-y-1 pl-2">{resultsUSD.map(renderResultRow)}</div>
        </div>
      )}
      {resultsSinDivisa.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">⚠️ Sin divisa</span>
            <span className="text-xs text-slate-500">{resultsSinDivisa.length} archivo(s)</span>
          </div>
          <div className="space-y-1 pl-2">{resultsSinDivisa.map(renderResultRow)}</div>
        </div>
      )}
      {resultsError.length > 0 && (
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">❌ Errores</span>
            <span className="text-xs text-slate-500">{resultsError.length} archivo(s)</span>
          </div>
          <div className="space-y-1 pl-2">{resultsError.map(renderResultRow)}</div>
        </div>
      )}
    </div>
  )
}
