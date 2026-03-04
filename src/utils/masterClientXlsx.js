import ExcelJS from 'exceljs'

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
export async function buildMasterClientWorkbook(formData, extracted, bankStatements = []) {
  // 1. Load the template file
  const templatePath = '/MASTER_Cliente_Template.xlsx'
  const response = await fetch(templatePath)
  const arrayBuffer = await response.arrayBuffer()
  
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(arrayBuffer)

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
  const nivelVentasAnuales = formData.nivelVentasAnuales || ''
  const margenRealUtilidad = formData.margenRealUtilidad || ''
  const situacionBuroCredito = formData.situacionBuroCredito || ''

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
  worksheet.getCell('K37').value = margenRealUtilidad
  worksheet.getCell('P23').value = situacionBuroCredito

  // 5. Fill "Flujos" sheet with bank statement data
  // Row 6 = Enero, Row 7 = Febrero, ..., Row 17 = Diciembre
  // D = Ingresos (abonos), E = Egresos (retiros)
  if (bankStatements && bankStatements.length > 0) {
    const flujoSheet = workbook.getWorksheet('Flujos')
    if (flujoSheet) {
      bankStatements.forEach((stmt) => {
        const monthNum = mesToMonthNumber(stmt.mes)
        if (!monthNum) {
          console.warn(`[Excel] No se pudo determinar el mes de: ${stmt.mes}`)
          return
        }
        const row = 5 + monthNum // month 1 → row 6, month 12 → row 17
        if (stmt.abonos != null) {
          flujoSheet.getCell(`D${row}`).value = Number(stmt.abonos)
        }
        if (stmt.retiros != null) {
          flujoSheet.getCell(`E${row}`).value = Number(stmt.retiros)
        }
      })
    } else {
      console.warn('[Excel] Hoja "Flujos" no encontrada en la plantilla — se omitieron los estados de cuenta')
    }
  }

  // 6. Add or update "Datos extraídos (OCR)" sheet
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
 * Trigger download of master_client_pontifex.xlsx filled with formData and extracted data.
 */
export async function downloadMasterClientXlsx(formData, extracted, fileName = 'master_client_pontifex.xlsx', bankStatements = []) {
  try {
    const workbook = await buildMasterClientWorkbook(formData, extracted, bankStatements)
    
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
    alert('Error al generar el archivo Excel. Por favor, verifica que la plantilla existe.')
  }
}
