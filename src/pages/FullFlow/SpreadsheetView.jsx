import { fetchCuentasBancarias } from '../../utils/api'
import { downloadMasterClientXlsx } from '../../utils/masterClientXlsx'

/**
 * Tabla de valores clave extraídos vía OCR con opción de descarga a Excel
 */
export default function SpreadsheetView({
  formData,
  spreadsheetData,
  solicitudId,
  cuentasBancarias,
  setCuentasBancarias,
  bankStatements,
  fsYear1,
  fsYear2,
  fsYear3,
}) {
  const handleDownloadExcel = async () => {
    const baseName = formData.razonSocial?.replace(/\s+/g, '_') || 'solicitud'
    const dataToUse = spreadsheetData
    
    let cuentasData = cuentasBancarias
    if (solicitudId && cuentasData.length === 0) {
      try { 
        cuentasData = await fetchCuentasBancarias(solicitudId)
        setCuentasBancarias(cuentasData)
      } catch (_) {}
    }
    
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
              banco_detectado: d.banco || cuenta.banco 
            }))
        )
      : bankStatements
    
    // Detectar conflictos de meses antes de generar Excel
    const conflictos = []
    const MESES_NOMBRES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
    
    if (bankStatementsForExcel.length > 0) {
      const mxnStmts = bankStatementsForExcel.filter(s => !s.divisa || s.divisa === 'MXN')
      const usdStmts = bankStatementsForExcel.filter(s => s.divisa === 'USD')
      
      const checkConflicts = (stmts, divisaLabel) => {
        const monthMap = {}
        stmts.forEach(s => {
          if (!s.mes || !s.mes.match(/^\d{4}-\d{2}$/)) return
          const [año, mes] = s.mes.split('-')
          const mesNum = parseInt(mes, 10)
          if (!monthMap[mesNum]) monthMap[mesNum] = new Set()
          monthMap[mesNum].add(año)
        })
        
        Object.entries(monthMap).forEach(([mesNum, años]) => {
          if (años.size > 1) {
            conflictos.push({
              mesNombre: MESES_NOMBRES[parseInt(mesNum) - 1],
              años: Array.from(años).sort(),
              divisa: divisaLabel
            })
          }
        })
      }
      
      checkConflicts(mxnStmts, 'MXN')
      checkConflicts(usdStmts, 'USD')
    }
    
    // Si hay conflictos, mostrar modal de confirmación
    if (conflictos.length > 0) {
      const mensaje = `⚠️ ADVERTENCIA: Meses con años diferentes\n\n` +
        conflictos.map(c => `• ${c.mesNombre} (${c.divisa}): ${c.años.join(', ')}`).join('\n') +
        `\n\nEn el Excel solo aparecerá el año del último documento procesado para cada mes.\n\n¿Continuar de todos modos?`
      
      if (!window.confirm(mensaje)) {
        return // Usuario canceló
      }
    }
    
    // Construir array con posiciones fijas: [año1, año2, año3]
    let financialYearsForExcel = [fsYear1.data, fsYear2.data, fsYear3.data]
    
    // Si no hay datos en memoria, buscar en los documentos guardados
    if (!financialYearsForExcel.some(Boolean) && solicitudId) {
      try {
        const docsRes = await fetch(`/api/solicitudes/${solicitudId}/documents`)
        if (docsRes.ok) {
          const allDocs = await docsRes.json()
          const typeToIndex = {
            'edos_financieros_anio1': 0,
            'edos_financieros_anio2': 1,
            'edo_financiero_parcial': 2,
          }
          financialYearsForExcel = [null, null, null]
          for (const [tid, idx] of Object.entries(typeToIndex)) {
            const d = allDocs.find(x => x.tipoDocumentoId === tid)
            if (d?.extractedData?.tipo === 'estados_financieros') {
              financialYearsForExcel[idx] = d.extractedData
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
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
      <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
        <div>
          <h2 className="font-semibold text-slate-800">Valores clave extraídos (OCR)</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Datos obtenidos de los documentos subidos; puedes descargar la hoja de cálculo.
          </p>
        </div>
        <button
          type="button"
          onClick={handleDownloadExcel}
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
  )
}
