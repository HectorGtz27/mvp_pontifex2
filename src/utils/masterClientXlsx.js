import ExcelJS from 'exceljs'

/**
 * Get first extracted value by field name (campo) from OCR spreadsheet.
 */
function getVal(extracted, campo) {
  const row = extracted.find((r) => r.campo.toLowerCase().includes(campo.toLowerCase()))
  return row ? row.valor : ''
}

/**
 * Load Excel template and fill it with formData and extracted OCR values.
 * Loads from public/MASTER_Cliente_Template.xlsx
 * Uses ExcelJS to preserve all styles, formulas, and formatting.
 */
export async function buildMasterClientWorkbook(formData, extracted) {
  // 1. Load the template file
  const templatePath = '/MASTER_Cliente_Template.xlsx'
  const response = await fetch(templatePath)
  const arrayBuffer = await response.arrayBuffer()
  
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(arrayBuffer)

  // 2. Extract values from form and OCR
  const razonSocial = formData.razonSocial || ''
  const nombreComercial = formData.nombreComercial || ''
  const rfc = getVal(extracted, 'RFC')
  const domicilioFiscal = getVal(extracted, 'Domicilio Fiscal') || getVal(extracted, 'Domicilio') || ''
  const ciudad = getVal(extracted, 'Ciudad') || ''
  const estado = getVal(extracted, 'Estado') || ''
  const telefono = formData.telefono || ''
  const correoElectronico = formData.correoElectronico || ''
  const paginaWeb = formData.paginaWeb || ''
  const numEmpleadosPermanentes = formData.numEmpleadosPermanentes || ''
  const numEmpleadosEventuales = formData.numEmpleadosEventuales || ''
  const numEmpleadosTotal = (Number(numEmpleadosPermanentes) || 0) + (Number(numEmpleadosEventuales) || 0)

  // 3. Get the "Infromacion General " sheet
  const worksheet = workbook.getWorksheet('Infromacion General ')
  if (!worksheet) {
    console.error('Sheet "Infromacion General " not found in template')
    return workbook
  }

  // 4. Fill in the cells (preserves all original styles)
  worksheet.getCell('F6').value = razonSocial
  worksheet.getCell('F7').value = nombreComercial
  worksheet.getCell('F8').value = rfc
  worksheet.getCell('K8').value = domicilioFiscal
  worksheet.getCell('F9').value = ciudad
  worksheet.getCell('L9').value = estado
  worksheet.getCell('M10').value = telefono
  worksheet.getCell('F11').value = correoElectronico
  worksheet.getCell('N11').value = paginaWeb
  worksheet.getCell('F12').value = numEmpleadosTotal
  worksheet.getCell('H12').value = numEmpleadosPermanentes
  worksheet.getCell('K12').value = numEmpleadosEventuales

  // 5. Add or update "Datos extraídos (OCR)" sheet
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

/**
 * Trigger download of master_client_pontifex.xlsx filled with formData and extracted data.
 */
export async function downloadMasterClientXlsx(formData, extracted, fileName = 'master_client_pontifex.xlsx') {
  try {
    const workbook = await buildMasterClientWorkbook(formData, extracted)
    
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
