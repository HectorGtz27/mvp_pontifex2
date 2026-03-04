const prisma = require('../prisma.cjs')

/**
 * Inserts a new documento record after uploading to S3.
 *
 * @param {Object} params
 * @param {string|null} params.solicitudId - UUID of the parent Solicitud
 * @param {string} params.documentType - e.g. 'constancia_situacion_fiscal', 'acta_constitutiva', etc.
 * @param {string} params.fileName - Original file name
 * @param {string} params.s3Url - Full S3 URL
 * @param {string} params.s3Key - S3 object key
 * @param {string} params.mimeType - MIME type
 * @param {number} params.fileSize - File size in bytes
 * @param {Object|null} params.extractedData - Textract extracted data (JSON)
 * @param {string|null} params.textractError - Error message if Textract failed
 * @returns {Promise<Object>} The inserted documento record
 */
async function createDocumento({ solicitudId, documentType, fileName, s3Url, s3Key, mimeType, fileSize, extractedData, textractError }) {
  console.log(`\n[DocumentoService] ▶ Guardando documento en BD...`)

  const documento = await prisma.documento.create({
    data: {
      solicitud_id:      solicitudId,
      tipo_documento_id: documentType || 'presentacion_curriculum',
      nombre_archivo:    fileName,
      s3_url:            s3Url,
      s3_key:            s3Key,
      mime_type:         mimeType,
      tamano_archivo:    fileSize,
      extracted_data:    extractedData ?? undefined,
      textract_error:    textractError ?? null,
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
