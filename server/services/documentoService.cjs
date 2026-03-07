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

  const esBancario = documentType === 'edos_cuenta_bancarios' || documentType === 'estado_cuenta_bancario'

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
    },
  })

  // ── Crear registro en estados_cuenta si es estado de cuenta bancario ──
  if (esBancario && extractedData) {
    const periodo        = extractedData.mes ?? null
    const abonos         = extractedData.abonos != null ? extractedData.abonos : null
    const retiros        = extractedData.retiros != null ? extractedData.retiros : null
    const saldoPromedio  = extractedData.saldo_promedio != null ? extractedData.saldo_promedio : null

    if (periodo || abonos != null || retiros != null || saldoPromedio != null) {
      await prisma.estadoCuenta.create({
        data: {
          documento_id:   documento.id,
          periodo,
          abonos,
          retiros,
          saldo_promedio: saldoPromedio,
        },
      })
      console.log(`[DocumentoService] ✓ EstadoCuenta creado (periodo: ${periodo})`)
    }

    // Propagar divisa/banco detectados a la cuenta bancaria (si existe y faltan)
    if (cuentaBancariaId) {
      const divisa = extractedData.divisa ?? null
      if (divisa) {
        await prisma.cuentaBancaria.updateMany({
          where: { id: cuentaBancariaId, divisa: null },
          data:  { divisa },
        })
      }
    }
  }

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
