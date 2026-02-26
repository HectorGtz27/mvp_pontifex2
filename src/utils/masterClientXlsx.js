import * as XLSX from 'xlsx'

/**
 * Get first extracted value by field name (campo) from OCR spreadsheet.
 */
function getVal(extracted, campo) {
  const row = extracted.find((r) => r.campo.toLowerCase().includes(campo.toLowerCase()))
  return row ? row.valor : ''
}

/**
 * Build workbook that matches master_client_pontifex.xlsx structure,
 * filled with formData and extracted OCR values.
 */
export function buildMasterClientWorkbook(formData, extracted) {
  const wb = XLSX.utils.book_new()
  const rs = formData.applicant || ''
  const nc = formData.organizationType || ''
  const rfc = getVal(extracted, 'RFC')
  const domicilio = getVal(extracted, 'Domicilio Fiscal') || getVal(extracted, 'Domicilio') || ''
  const ciudad = ''
  const estado = ''
  const tel = formData.contactPhone || ''
  const correo = formData.contactEmail || ''
  const web = ''
  const empleados = ''
  const permanentes = ''
  const eventuales = ''

  // Sheet "Infromacion General " — same layout as template (row indices 0-based)
  const aoa = [
    [],
    [],
    ['', '', 'Información General'],
    [],
    ['', 'DATOS GENERALES'],
    ['', '', '', '', 'Razon Social:', rs],
    ['', '', '', '', 'Nombre Comercial:', nc],
    ['', '', '', '', 'RFC:', rfc, '', '', '', 'Domicilio Fiscal:', domicilio],
    ['', '', '', '', 'Ciudad:', ciudad, '', '', '', '', 'Estado:', estado],
    ['', '', 'Contacto', '', '', '', '', '', '', '', '', 'Telefono:', tel],
    ['', '', '', '', 'Correo electrónico:', correo, '', '', '', '', '', '', 'Pagina web:', web],
    ['', '', '', '', 'Numero de  empleados:', empleados, '', 'Permanentes:', permanentes, '', 'Eventuales:', eventuales],
    [],
    ['', 'HISTORIA Y DESCRIPCIÓN DEL CLIENTE'],
    [],
    [],
    [],
    ['', 'CUANDRO ACCIONARIO', '', '', '', '', '', '', '', '', '', 'PRINCIPALES FUNCIONARIOS'],
    [],
    ['', '#', 'Nombre', '', '', '', '', '%', '$', '', '', '', 'Nombre', '', '', '', 'Puesto / Funcion'],
    ['', 1, '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['', 2, '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['', 3, '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['', 4, '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
    ['', 5, '', '', '', '', '', '', '', '', '', '', '', '', '', ''],
  ]

  const ws1 = XLSX.utils.aoa_to_sheet(aoa)
  XLSX.utils.book_append_sheet(wb, ws1, 'Infromacion General ')

  // Sheet 2: Datos extraídos (OCR)
  const ocrRows = [['Documento', 'Campo', 'Valor', 'Fuente']].concat(
    extracted.map((r) => [r.documento, r.campo, r.valor, r.fuente])
  )
  const ws2 = XLSX.utils.aoa_to_sheet(ocrRows)
  XLSX.utils.book_append_sheet(wb, ws2, 'Datos extraídos (OCR)')

  return wb
}

/**
 * Trigger download of master_client_pontifex.xlsx filled with formData and extracted data.
 */
export function downloadMasterClientXlsx(formData, extracted, fileName = 'master_client_pontifex.xlsx') {
  const wb = buildMasterClientWorkbook(formData, extracted)
  XLSX.writeFile(wb, fileName)
}
