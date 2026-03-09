import ExcelJS from 'exceljs'
import { BG_EXCEL_MAP, ER_EXCEL_MAP } from '../shared/ocrFields'

/**
 * Get first extracted value by field name (campo) from OCR spreadsheet.
 * Tries multiple variations of the field name.
 */
function getVal(extracted, ...campos) {
  for (const campo of campos) {
    const row = extracted.find((r) => {
      const campoLower = r.campo?.toLowerCase() || ''
      const valorLower = campo.toLowerCase()
      return campoLower.includes(valorLower) || campoLower.replace(/[_\s-]/g, '') === valorLower.replace(/[_\s-]/g, '')
    })
    if (row && row.valor) return row.valor
  }
  return ''
}

/**
 * Load Excel template and fill it with formData and extracted OCR values.
 * Loads from public/MASTER_Cliente_Template.xlsx
 * Uses ExcelJS to preserve all styles, formulas, and formatting.
 *
 * @param {object} formData
 * @param {Array}  extracted       - OCR spreadsheet rows (CSF, etc.)
 * @param {Array}  [bankStatements] - [{ mes:'YYYY-MM', abonos:number, retiros:number, banco_detectado:string }]
 */
export async function buildMasterClientWorkbook(formData, extracted, bankStatements = [], financialYears = []) {
  // 1. Load the template file
  const templatePath = '/MASTER_Cliente_Template.xlsx'
  console.log('[Excel] Fetching template from:', templatePath)
  const response = await fetch(templatePath)
  console.log('[Excel] Template fetch status:', response.status, response.ok)
  if (!response.ok) throw new Error(`No se pudo cargar la plantilla (HTTP ${response.status}): ${templatePath}`)
  const arrayBuffer = await response.arrayBuffer()
  console.log('[Excel] Template loaded, bytes:', arrayBuffer.byteLength)
  
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(arrayBuffer)

  // Fix: ExcelJS raises "Shared Formula master must exist above and or left of clone"
  // when re-serializing templates with sharedFormula references.
  // Solution: replace every sharedFormula clone cell with its cached result value.
  workbook.eachSheet(ws => {
    ws.eachRow({ includeEmpty: false }, row => {
      row.eachCell({ includeEmpty: false }, cell => {
        const v = cell.value
        if (v !== null && typeof v === 'object' && v.sharedFormula !== undefined) {
          cell.value = v.result !== undefined ? v.result : null
        }
      })
    })
  })

  // 2. Extract values from form and OCR
  // ── Datos Generales (Cliente) ──
  const razonSocial = formData.razonSocial || ''
  const nombreComercial = formData.nombreComercial || ''
  const rfc = getVal(extracted, 'RFC', 'rfc', 'R.F.C.', 'R F C')
  const domicilioFiscal = getVal(extracted, 'Domicilio Fiscal', 'domicilio_fiscal', 'domicilio fiscal', 'Domicilio', 'domicilio')
  const ciudad = getVal(extracted, 'Ciudad', 'ciudad')
  const estado = getVal(extracted, 'Estado', 'estado')
  const contactoNombre = formData.contacto_nombre || formData.contactoNombre || ''
  const telefono = formData.telefono || ''
  const correoElectronico = formData.correoElectronico || ''
  const paginaWeb = formData.paginaWeb || ''
  const numEmpleadosPermanentes = formData.numEmpleadosPermanentes || ''
  const numEmpleadosEventuales = formData.numEmpleadosEventuales || ''
  const numEmpleadosTotal = (Number(numEmpleadosPermanentes) || 0) + (Number(numEmpleadosEventuales) || 0)

  // ── Datos de la Solicitud ──
  const monto = formData.monto || ''
  const divisa = formData.divisa || 'MXN'
  const plazoDeseado = formData.plazoDeseado || ''
  const destino = formData.destino || ''
  const tasaObjetivo = formData.tasaObjetivo || ''
  const tipoColateral = formData.tipoColateral || ''

  // ── Información Cuantitativa ──
  // Extraer ventas del estado financiero más reciente disponible
  let nivelVentasAnuales = formData.nivelVentasAnuales || ''
  if (financialYears && financialYears.length > 0) {
    // Iterar en orden inverso para obtener el año más reciente primero
    for (let i = financialYears.length - 1; i >= 0; i--) {
      const yr = financialYears[i]
      if (yr) {
        const er = yr.estado_resultados || yr
        if (er.ventas != null) {
          nivelVentasAnuales = Number(er.ventas)
          break
        }
      }
    }
  }
  const margenRealUtilidad = formData.margenRealUtilidad || ''
  const situacionBuroCredito = formData.situacionBuroCredito || ''

  // Extraer resultado_ejercicio del estado financiero más reciente
  let resultadoEjercicio = ''
  if (financialYears && financialYears.length > 0) {
    for (let i = financialYears.length - 1; i >= 0; i--) {
      const yr = financialYears[i]
      if (yr) {
        const er = yr.estado_resultados || yr
        if (er.resultado_ejercicio != null) {
          // Dividir entre 100 porque Excel con formato % multiplica automáticamente
          // Si Bedrock extrae 12.9 → 12.9/100 = 0.129 → Excel muestra 12.9%
          resultadoEjercicio = Number(er.resultado_ejercicio) / 100
          break
        }
      }
    }
  }

  // 3. Get the "Infromacion General " sheet
  const worksheet = workbook.getWorksheet('Infromacion General ')
  if (!worksheet) {
    console.error('Sheet "Infromacion General " not found in template')
    return workbook
  }

  // 4. Fill in the cells (preserves all original styles)
  // ── DATOS GENERALES ──
  // Fila 6: Razón Social en F6
  worksheet.getCell('F6').value = razonSocial
  
  // Fila 7: Nombre Comercial en F7
  worksheet.getCell('F7').value = nombreComercial
  
  // Fila 8: RFC en F8, Domicilio Fiscal en K8
  worksheet.getCell('F8').value = rfc
  worksheet.getCell('K8').value = domicilioFiscal
  
  // Fila 9: Ciudad en F9, Estado en M9
  worksheet.getCell('F9').value = ciudad
  worksheet.getCell('M9').value = estado
  
  // Fila 10: Contacto en F10, Teléfono en N10
  worksheet.getCell('F10').value = contactoNombre
  worksheet.getCell('N10').value = telefono
  
  // Fila 11: Correo electrónico en F11, Página web en O11
  worksheet.getCell('F11').value = correoElectronico
  worksheet.getCell('O11').value = paginaWeb
  
  // Fila 12: Total empleados en F12, Permanentes en H12, Eventuales en K12
  worksheet.getCell('F12').value = numEmpleadosTotal
  worksheet.getCell('H12').value = numEmpleadosPermanentes
  worksheet.getCell('K12').value = numEmpleadosEventuales

  // ── SOLICITUD ──
  // Ajusta estas referencias de celda según tu plantilla Excel.
  // Ejemplo: si "Monto:" está en la fila 14, el valor iría en la celda después del label
  worksheet.getCell('F29').value = monto
  worksheet.getCell('F30').value = divisa
  worksheet.getCell('F31').value = plazoDeseado
  worksheet.getCell('F32').value = destino
  worksheet.getCell('F33').value = tasaObjetivo
  worksheet.getCell('F34').value = tipoColateral

  // ── INFORMACION CUANTITATIVA ──
  // Ajusta estas referencias de celda según tu plantilla Excel
  worksheet.getCell('F37').value = nivelVentasAnuales
  
  // K37: Resultado del Ejercicio (porcentaje con 1 decimal)
  const cellK37 = worksheet.getCell('K37')
  cellK37.value = resultadoEjercicio
  cellK37.numFmt = '0.0%'  // Formato: porcentaje con 1 decimal (ej: 12.9%)
  
  worksheet.getCell('P23').value = situacionBuroCredito

  // 5. Fill "Flujos" sheet with bank statement data
  //
  // Template layout (same columns for MXN and USD):
  //   Bank 1 → D (Ingresos), E (Egresos), F (Saldos Prom)  — name header at D4 / D22
  //   Bank 2 → H (Ingresos), I (Egresos), J (Saldos Prom)  — name header at H4 / H22
  //   Bank 3 → L (Ingresos), M (Egresos), N (Saldos Prom)  — name header at L4 / L22
  //
  // MXN section: name row=4, data rows 6-17 (Enero=6 … Diciembre=17)
  // USD section: name row=22, data rows 24-35 (Enero=24 … Diciembre=35)
  if (bankStatements && bankStatements.length > 0) {
    const flujoSheet = workbook.getWorksheet('Flujos')
    if (flujoSheet) {
      const BANK_COLS = [
        { nameCol: 'D', ingr: 'D', egr: 'E', saldo: 'F' },
        { nameCol: 'H', ingr: 'H', egr: 'I', saldo: 'J' },
        { nameCol: 'L', ingr: 'L', egr: 'M', saldo: 'N' },
      ]

      // Group statements by bank name
      const groupByBank = (stmts) => {
        const groups = {}
        stmts.forEach((s) => {
          const key = (s.banco_detectado || 'Banco').trim()
          if (!groups[key]) groups[key] = []
          groups[key].push(s)
        })
        return groups
      }

      // Fill one section (MXN or USD)
      const fillSection = (stmts, nameRow, dataStartRow) => {
        if (!stmts.length) return
        const groups = groupByBank(stmts)
        const banks = Object.keys(groups)

        // Build year map: monthNum → year (from statement mes "YYYY-MM")
        // ⚠️ WARNING: Si hay múltiples statements del mismo mes con años diferentes,
        // solo el ÚLTIMO año procesado aparecerá en columna B. Esto es una limitación
        // del diseño de la plantilla (un año por mes). El frontend debe advertir al
        // usuario sobre conflictos antes de generar el Excel.
        const yearByMonth = {}
        stmts.forEach((s) => {
          const m = mesToMonthNumber(s.mes)
          const yearMatch = s.mes && s.mes.match(/(\d{4})/)
          if (m && yearMatch) yearByMonth[m] = parseInt(yearMatch[1], 10)  // SOBRESCRIBE si existe
        })
        // Fill B column (year) for data rows
        for (let mo = 1; mo <= 12; mo++) {
          if (yearByMonth[mo]) {
            flujoSheet.getCell(`B${dataStartRow - 1 + mo}`).value = yearByMonth[mo]
          }
        }

        banks.forEach((banco, idx) => {
          if (idx >= BANK_COLS.length) return // template supports max 3 banks
          const cols = BANK_COLS[idx]

          // Write bank name in merged header cell (D4/H4/L4 for MXN; D22/H22/L22 for USD)
          flujoSheet.getCell(`${cols.nameCol}${nameRow}`).value = banco

          // Write per-month figures
          groups[banco].forEach((stmt) => {
            const monthNum = mesToMonthNumber(stmt.mes)
            if (!monthNum) {
              console.warn('[Excel] No se pudo determinar el mes de:', stmt.mes)
              return
            }
            const row = dataStartRow - 1 + monthNum // month 1 → dataStartRow
            if (stmt.abonos != null) flujoSheet.getCell(`${cols.ingr}${row}`).value = Number(stmt.abonos)
            if (stmt.retiros != null) flujoSheet.getCell(`${cols.egr}${row}`).value = Number(stmt.retiros)
            if (stmt.saldo_promedio != null) flujoSheet.getCell(`${cols.saldo}${row}`).value = Number(stmt.saldo_promedio)
          })
        })
      }

      const mxnStmts = bankStatements.filter((s) => !s.divisa || s.divisa === 'MXN')
      const usdStmts = bankStatements.filter((s) => s.divisa === 'USD')

      fillSection(mxnStmts, 4, 6)   // MXN: header at row 4, data rows 6-17
      fillSection(usdStmts, 22, 24)  // USD: header at row 22, data rows 24-35
    } else {
      console.warn('[Excel] Hoja "Flujos" no encontrada en la plantilla — se omitieron los estados de cuenta')
    }
  }

  // 6. Fill "Estados Financieros" sheet with Balance General + Estado de Resultados
  if (financialYears && financialYears.length > 0) {
    const efSheet = workbook.getWorksheet('Estados Financieros')
    if (efSheet) {
      // Columns C/E/G → years[0]/years[1]/years[2]
      // C = Antepenúltimo ejercicio, E = Penúltimo ejercicio, G = Ejercicio en curso
      const YEAR_COLS = ['C', 'E', 'G']

      // Procesar cada año en su posición fija (puede ser null si no se subió)
      financialYears.slice(0, 3).forEach((yr, idx) => {
        if (!yr) return  // Saltar posiciones vacías
        
        const col = YEAR_COLS[idx]
        if (!col) return

        // Balance General values
        const bg = yr.balance_general || yr  // support both nested and flat shapes
        for (const [key, row] of BG_EXCEL_MAP) {
          const val = bg[key]
          if (val != null) efSheet.getCell(`${col}${row}`).value = Number(val)
        }

        // Estado de Resultados values
        const er = yr.estado_resultados || yr
        for (const [key, row] of ER_EXCEL_MAP) {
          const val = er[key]
          if (val != null) efSheet.getCell(`${col}${row}`).value = Number(val)
        }
      })

      console.log(`[Excel] ✅ Hoja "Estados Financieros" llenada con ${Math.min(financialYears.length, 3)} años`)
    } else {
      console.warn('[Excel] Hoja "Estados Financieros" no encontrada en el template')
    }
  }

  // 7. Add or update "Datos extraídos (OCR)" sheet
  const ocrSheetName = 'Datos extraídos (OCR)'
  
  // Remove old OCR sheet if exists
  const existingSheet = workbook.getWorksheet(ocrSheetName)
  if (existingSheet) {
    workbook.removeWorksheet(existingSheet.id)
  }
  
  // Create new OCR sheet
  const ocrWorksheet = workbook.addWorksheet(ocrSheetName)
  
  // Add headers
  ocrWorksheet.columns = [
    { header: 'Documento', key: 'documento', width: 30 },
    { header: 'Campo', key: 'campo', width: 30 },
    { header: 'Valor', key: 'valor', width: 40 },
    { header: 'Fuente', key: 'fuente', width: 15 }
  ]
  
  // Style header row
  ocrWorksheet.getRow(1).font = { bold: true }
  ocrWorksheet.getRow(1).fill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD9E1F2' }
  }
  
  // Add data rows
  extracted.forEach((row) => {
    ocrWorksheet.addRow({
      documento: row.seccion || row.documento || '',
      campo: row.campo,
      valor: row.valor,
      fuente: row.fuente || 'OCR'
    })
  })

  return workbook
}

// ─── Meses en español → número ───────────────────────────────────────────────
const MONTH_MAP = {
  'enero': 1, 'ene': 1,
  'febrero': 2, 'feb': 2,
  'marzo': 3, 'mar': 3,
  'abril': 4, 'abr': 4,
  'mayo': 5, 'may': 5,
  'junio': 6, 'jun': 6,
  'julio': 7, 'jul': 7,
  'agosto': 8, 'ago': 8,
  'septiembre': 9, 'sep': 9, 'sept': 9,
  'octubre': 10, 'oct': 10,
  'noviembre': 11, 'nov': 11,
  'diciembre': 12, 'dic': 12,
}

/**
 * Extracts the month number (1-12) from a mes string.
 * Accepts formats: "YYYY-MM", "MM-YYYY", "Enero 2024", "ene-2024", etc.
 */
function mesToMonthNumber(mes) {
  if (!mes) return null
  // Try "YYYY-MM" or "MM-YYYY"
  const numMatch = mes.match(/(\d{4})-(\d{1,2})|(\d{1,2})-(\d{4})/)
  if (numMatch) {
    const a = parseInt(numMatch[2] || numMatch[3], 10)
    const b = parseInt(numMatch[1] || numMatch[4], 10)
    // The month number is the one between 1-12
    const monthNum = a >= 1 && a <= 12 ? a : b
    if (monthNum >= 1 && monthNum <= 12) return monthNum
  }
  // Try Spanish month name
  const lower = mes.toLowerCase()
  for (const [key, num] of Object.entries(MONTH_MAP)) {
    if (lower.includes(key)) return num
  }
  return null
}

/**
 * Detecta conflictos en bankStatements: meses que aparecen con múltiples años.
 * Útil para advertir al usuario antes de generar el Excel, ya que solo un año
 * por mes puede aparecer en la columna B de la hoja "Flujos".
 * 
 * @param {Array} bankStatements - Array de objetos { mes: "YYYY-MM", divisa, ... }
 * @returns {Array} - Array de conflictos: [{ mesNum, mesNombre, años: [...], divisa }, ...]
 */
export function detectMonthConflicts(bankStatements) {
  const MESES_NOMBRES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre']
  const conflicts = []
  
  // Separar por divisa (MXN y USD se escriben en diferentes secciones)
  const mxnStmts = bankStatements.filter(s => !s.divisa || s.divisa === 'MXN')
  const usdStmts = bankStatements.filter(s => s.divisa === 'USD')
  
  const checkConflicts = (stmts, divisaLabel) => {
    const monthMap = {} // { mesNum: Set([año1, año2, ...]) }
    
    stmts.forEach(s => {
      if (!s.mes || !s.mes.match(/^\d{4}-\d{2}$/)) return
      const [año, mes] = s.mes.split('-')
      const mesNum = parseInt(mes, 10)
      
      if (!monthMap[mesNum]) monthMap[mesNum] = new Set()
      monthMap[mesNum].add(año)
    })
    
    Object.entries(monthMap).forEach(([mesNum, años]) => {
      if (años.size > 1) {
        conflicts.push({
          mesNum: parseInt(mesNum),
          mesNombre: MESES_NOMBRES[parseInt(mesNum) - 1],
          años: Array.from(años).sort(),
          divisa: divisaLabel
        })
      }
    })
  }
  
  checkConflicts(mxnStmts, 'MXN')
  checkConflicts(usdStmts, 'USD')
  
  return conflicts
}

/**
 * Trigger download of master_client_pontifex.xlsx filled with formData and extracted data.
 */
export async function downloadMasterClientXlsx(formData, extracted, fileName = 'master_client_pontifex.xlsx', bankStatements = [], financialYears = []) {
  try {
    const workbook = await buildMasterClientWorkbook(formData, extracted, bankStatements, financialYears)
    
    // Generate buffer and trigger download
    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
    })
    
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    link.click()
    window.URL.revokeObjectURL(url)
  } catch (error) {
    console.error('Error generating Excel:', error)
    alert('Error al generar el archivo Excel:\n' + (error?.message || String(error)))
  }
}
