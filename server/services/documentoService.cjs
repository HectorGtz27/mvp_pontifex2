const prisma = require('../prisma.cjs')

/**
 * Inserts a new documento record after uploading to S3.
 *
 * @param {Object} params
 * @param {string|null} params.solicitudId       - UUID of the parent Solicitud
 * @param {string}      params.documentType      - e.g. 'edos_cuenta_bancarios', 'constancia_situacion_fiscal'
 * @param {string|null} params.cuentaBancariaId  - UUID of the related CuentaBancaria (bank statements only)
 * @param {string}      params.fileName          - Original file name
 * @param {string}      params.s3Url             - Full S3 URL
 * @param {string}      params.s3Key             - S3 object key
 * @param {string}      params.mimeType          - MIME type
 * @param {number}      params.fileSize          - File size in bytes
 * @param {Object|null} params.extractedData     - Bedrock/Textract extracted data (JSON)
 * @param {string|null} params.textractError     - Error message if extraction failed
 * @returns {Promise<Object>} The inserted documento record
 */
async function createDocumento({ solicitudId, documentType, cuentaBancariaId = null, fileName, s3Url, s3Key, mimeType, fileSize, extractedData, textractError }) {
  console.log(`\n[DocumentoService] ▶ Guardando documento en BD...`)

  // Extraer campos bancarios de extractedData si existen
  const esBancario = documentType === 'edos_cuenta_bancarios' || documentType === 'estado_cuenta_bancario'
  const bancoCampos = esBancario && extractedData ? {
    banco:          extractedData.banco_detectado ?? null,
    divisa:         extractedData.divisa ?? null,
    periodo:        extractedData.mes ?? null,
    abonos:         extractedData.abonos != null ? extractedData.abonos : null,
    retiros:        extractedData.retiros != null ? extractedData.retiros : null,
    saldo_promedio: extractedData.saldo_promedio != null ? extractedData.saldo_promedio : null,
  } : {}

  const documento = await prisma.documento.create({
    data: {
      solicitud_id:       solicitudId,
      tipo_documento_id:  documentType || 'presentacion_curriculum',
      cuenta_bancaria_id: cuentaBancariaId ?? null,
      nombre_archivo:     fileName,
      s3_url:             s3Url,
      s3_key:             s3Key,
      mime_type:          mimeType,
      tamano_archivo:     fileSize,
      extracted_data:     extractedData ?? undefined,
      textract_error:     textractError ?? null,
      ...bancoCampos,
    },
  })

  // Update docs_subidos count on the solicitud
  if (solicitudId) {
    const count = await prisma.documento.count({ where: { solicitud_id: solicitudId } })
    await prisma.solicitud.update({
      where: { id: solicitudId },
      data: { docs_subidos: count },
    })
  }

  console.log(`[DocumentoService] ✓ Documento guardado en BD (ID: ${documento.id})`)
  return documento
}

module.exports = { createDocumento }
