const { PutObjectCommand } = require('@aws-sdk/client-s3')
const { v4: uuidv4 } = require('uuid')
const path = require('path')
const { s3, S3_BUCKET } = require('../config/s3.cjs')
const { extractRawTextSync, extractRawTextAsync } = require('../services/textractService.cjs')
const { extractBankStatementData, extractCSFData, extractFinancialStatementsData } = require('../services/bedrockService.cjs')
const { extractFirstPage } = require('../services/pdfService.cjs')
const { createDocumento } = require('../services/documentoService.cjs')
const { processDocumentoCampos } = require('../services/campoExtraidoService.cjs')

const ALLOWED_MIME = [
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'application/octet-stream',
]
const MAX_SIZE = 30 * 1024 * 1024 // 30 MB (estados financieros PDF multi-página)

async function uploadFile(req, res) {
  try {
    const file = req.file

    if (!file) {
      return res.status(400).json({ success: false, error: 'No se envió ningún archivo.' })
    }

    // Validate MIME type
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      return res.status(400).json({
        success: false,
        error: `Tipo de archivo no permitido (${file.mimetype}). Solo se permiten PDF, JPG, JPEG, PNG.`,
      })
    }

    // Validate size (multer already limits, but double-check)
    if (file.size > MAX_SIZE) {
      return res.status(400).json({
        success: false,
        error: `El archivo excede el límite de 10 MB (${(file.size / 1024 / 1024).toFixed(2)} MB).`,
      })
    }

    // Build S3 key: uploads/{uuid}.{ext}
    const ext = path.extname(file.originalname).replace('.', '').toLowerCase()
    const key = `uploads/${uuidv4()}.${ext}`

    // ── 1. Upload to S3 ──
    const putCommand = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    })

    await s3.send(putCommand)

    const s3Url = `https://${S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`
    console.log(`[Upload] S3 OK: ${s3Url}`)

    // ── 2. Determine document type and solicitud from request ──
    const documentTypeId = req.body?.documentTypeId || null
    const solicitudId = req.body?.solicitudId || req.body?.clienteId || null
    const cuentaBancariaId = req.body?.cuentaBancariaId || null
    console.log(`[Upload] documentTypeId: ${documentTypeId}, solicitudId: ${solicitudId}, cuentaBancariaId: ${cuentaBancariaId}`)

    // ── 3. Extract document data using DetectDocumentText + Claude ──
    // New approach: 14x cheaper than AnalyzeDocument FORMS
    // Cost comparison:
    //   - Old (FORMS):     ~$0.05 USD per page
    //   - New (Text+LLM):  ~$0.0035 USD per page
    let extractedData = null
    let textractError = null
    if (documentTypeId === 'constancia_situacion_fiscal') {
      console.log('[Upload] 📄 Documento es Constancia de Situación Fiscal, extrayendo con Textract + Claude...')
      try {
        // Step 1: Extract first page only (CSF key data is on page 1)
        const { buffer: page1Buffer, pageCount, wasSliced } = await extractFirstPage(file.buffer, file.mimetype)
        console.log(`[Upload] 📄 PDF: ${pageCount} págs → usando página 1 en modo síncrono (wasSliced: ${wasSliced})`)

        // Step 2: DetectDocumentText (cheap, fast)
        const rawText = await extractRawTextSync(page1Buffer, file.mimetype)

        if (!rawText || rawText.trim().length < 50) {
          throw new Error('Textract no pudo extraer texto suficiente del documento')
        }

        // Step 3: Claude via Bedrock extracts structured CSF fields
        const bedrockResult = await extractCSFData(rawText)

        extractedData = {
          tipo: 'constancia_situacion_fiscal',
          ...bedrockResult,
          paginas_totales: pageCount,
          ...(bedrockResult.parseError && { error_parseo: bedrockResult.parseError }),
        }
        console.log('[Upload] ✅ CSF procesada exitosamente')
      } catch (err) {
        console.error('❌ [Upload] Error procesando CSF:', err.message)
        textractError = `Error procesando CSF: ${err.message}`
      }
    } else if (documentTypeId === 'edos_cuenta_bancarios' || documentTypeId === 'estado_cuenta_bancario') {
      console.log('[Upload] 🏦 Documento es Estado de Cuenta Bancario, extrayendo texto con Textract + Claude...')
      try {
        const banco = req.body?.banco || null

        // Step 1: Extraer sólo la página 1 en memoria (el PDF completo ya está en S3)
        const { buffer: page1Buffer, pageCount, wasSliced } = await extractFirstPage(file.buffer, file.mimetype)
        console.log(`[Upload] 📄 PDF: ${pageCount} págs → usando página 1 en modo síncrono (wasSliced: ${wasSliced})`)

        // Step 2: Textract síncrono sobre la página 1 (mucho más rápido que async)
        const rawText = await extractRawTextSync(page1Buffer, file.mimetype)

        if (!rawText || rawText.trim().length < 50) {
          throw new Error('Textract no pudo extraer texto suficiente del documento')
        }

        // Step 3: Claude via Bedrock extrae los 6 campos requeridos
        const bedrockResult = await extractBankStatementData(rawText, banco)

        extractedData = {
          tipo: 'estado_cuenta_bancario',
          mes: bedrockResult.mes,
          abonos: bedrockResult.abonos,
          retiros: bedrockResult.retiros,
          saldo_promedio: bedrockResult.saldo_promedio,
          divisa: bedrockResult.divisa,
          banco_detectado: bedrockResult.banco_detectado,
          confianza: bedrockResult.confianza,
          paginas_totales: pageCount,
          ...(bedrockResult.parseError && { error_parseo: bedrockResult.parseError }),
        }
        console.log('[Upload] ✅ Estado de cuenta procesado:', extractedData)
      } catch (err) {
        console.error('❌ [Upload] Error procesando estado de cuenta:', err.message)
        textractError = `Error procesando estado de cuenta: ${err.message}`
      }
    } else if (
      documentTypeId === 'edos_financieros_anio1' ||
      documentTypeId === 'edos_financieros_anio2' ||
      documentTypeId === 'edo_financiero_parcial'
    ) {
      // ──────────────────────────────────────────────────────────────────
      // ESTADO FINANCIERO — 1 PDF por ejercicio fiscal
      // Flujo: StartDocumentTextDetection (async) leyendo desde S3,
      //        polling hasta SUCCEEDED, filtrar sólo bloques LINE,
      //        limitar a las primeras 2 páginas.
      // ──────────────────────────────────────────────────────────────────
      console.log(`[Upload] 📈 Estado financiero (${documentTypeId}), extrayendo con Textract async + Claude...`)
      try {
        // ── Extracción async vía S3: StartDocumentTextDetection, sólo LINEs, págs 1-2 ──
        console.log(`[Upload] 📄 Iniciando StartDocumentTextDetection sobre S3: ${key} (págs 1-2)`)
        const rawText = await extractRawTextAsync(S3_BUCKET, key, 2)

        if (!rawText || rawText.trim().length < 100) {
          throw new Error('Textract no pudo extraer texto suficiente del documento')
        }
        console.log(`[Upload] 📄 Textract extrajo ${rawText.length} caracteres`)
        

        const bedrockResult = await extractFinancialStatementsData(rawText)
        const yearData = bedrockResult.years?.[0]

        if (!yearData) {
          throw new Error('Claude no pudo identificar el período fiscal en el documento')
        }

        extractedData = {
          tipo: 'estados_financieros',
          periodo: yearData.periodo,
          confianza: bedrockResult.confianza,
          balance_general: {
            inventarios:                      yearData.inventarios,
            clientes:                         yearData.clientes,
            deudores_diversos:                yearData.deudores_diversos,
            terrenos_edificios:               yearData.terrenos_edificios,
            maquinaria_equipo:                yearData.maquinaria_equipo,
            equipo_transporte:                yearData.equipo_transporte,
            intangibles:                      yearData.intangibles,
            proveedores:                      yearData.proveedores,
            acreedores_diversos:              yearData.acreedores_diversos,
            docs_pagar_cp:                    yearData.docs_pagar_cp,
            docs_pagar_lp:                    yearData.docs_pagar_lp,
            otros_pasivos:                    yearData.otros_pasivos,
            capital_social:                   yearData.capital_social,
            utilidades_ejercicios_anteriores: yearData.utilidades_ejercicios_anteriores,
          },
          estado_resultados: {
            ventas:             yearData.ventas,
            costos_venta:       yearData.costos_venta,
            gastos_operacion:   yearData.gastos_operacion,
            gastos_financieros: yearData.gastos_financieros,
            otros_productos:    yearData.otros_productos,
            otros_gastos:       yearData.otros_gastos,
            impuestos:          yearData.impuestos,
            depreciacion:       yearData.depreciacion,
          },
        }
        console.log(`[Upload] ✅ Estado financiero extraído: periodo=${yearData.periodo}`)
      } catch (err) {
        console.error(`❌ [Upload] Error procesando estado financiero (${documentTypeId}):`, err.message)
        textractError = `Error procesando estado financiero: ${err.message}`
      }
    } else {
      console.log(`[Upload] Documento tipo "${documentTypeId}", sin procesamiento OCR configurado`)
    }

    // ── 4. Save document record in the DB ──
    let documento = null
    try {
      documento = await createDocumento({
        solicitudId,
        documentType: documentTypeId,
        cuentaBancariaId,
        fileName: file.originalname,
        s3Url,
        s3Key: key,
        mimeType: file.mimetype,
        fileSize: file.size,
        extractedData,
        textractError,
      })
    } catch (dbErr) {
      console.error('Error saving documento:', dbErr)
      return res.json({
        success: true,
        s3Url,
        extractedData,
        dbError: 'Archivo subido a S3 pero no se pudo guardar en la base de datos.',
      })
    }

    // ── 5. Parse extracted_data → campos_extraidos ──
    let camposInsertados = 0
    if (documento && extractedData && !textractError) {
      try {
        camposInsertados = await processDocumentoCampos(documento)
      } catch (campoErr) {
        // No-fatal: el documento ya está guardado, solo logueamos el error
        console.error('[Upload] Error al procesar campos extraídos:', campoErr.message)
      }
    }

    return res.json({
      success: true,
      documento,
      extractedData,
      camposInsertados,
    })
  } catch (err) {
    console.error('Error uploading to S3:', err)
    return res.status(500).json({
      success: false,
      error: 'Error interno al subir el archivo a S3.',
    })
  }
}

// ────────────────────────────────────────────────────────────────
// Bulk Upload — hasta 12 archivos a la vez para una cuenta bancaria
// ────────────────────────────────────────────────────────────────

/**
 * Procesa un lote de archivos en paralelo con concurrencia limitada.
 * @param {Array} items - Array de inputs
 * @param {Function} fn - Async function por item
 * @param {number} concurrency - Máximo de jobs paralelos
 */
async function pLimit(items, fn, concurrency = 4) {
  const results = []
  let idx = 0
  async function worker() {
    while (idx < items.length) {
      const i = idx++
      results[i] = await fn(items[i], i)
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker))
  return results
}

/**
 * Procesa un solo archivo de estado de cuenta (extrae página 1 → Textract → Bedrock).
 * Retorna el documento guardado + datos extraídos.
 */
async function processBankStatementFile(file, { solicitudId, cuentaBancariaId, s3Key, s3Url }) {
  let extractedData = null
  let textractError = null

  try {
    const { buffer: page1Buffer, pageCount, wasSliced } = await extractFirstPage(file.buffer, file.mimetype)
    console.log(`[Bulk] 📄 ${file.originalname}: ${pageCount} págs → página 1 (wasSliced: ${wasSliced})`)

    const rawText = await extractRawTextSync(page1Buffer, file.mimetype)
    if (!rawText || rawText.trim().length < 50) {
      throw new Error('Textract no pudo extraer texto suficiente')
    }

    const bedrockResult = await extractBankStatementData(rawText, null)

    extractedData = {
      tipo: 'estado_cuenta_bancario',
      mes: bedrockResult.mes,
      abonos: bedrockResult.abonos,
      retiros: bedrockResult.retiros,
      saldo_promedio: bedrockResult.saldo_promedio,
      divisa: bedrockResult.divisa,
      banco_detectado: bedrockResult.banco_detectado,
      confianza: bedrockResult.confianza,
      paginas_totales: pageCount,
      ...(bedrockResult.parseError && { error_parseo: bedrockResult.parseError }),
    }
  } catch (err) {
    console.error(`[Bulk] ❌ Error en ${file.originalname}:`, err.message)
    textractError = err.message
  }

  const documento = await createDocumento({
    solicitudId,
    documentType: 'edos_cuenta_bancarios',
    cuentaBancariaId,
    fileName: file.originalname,
    s3Url,
    s3Key,
    mimeType: file.mimetype,
    fileSize: file.size,
    extractedData,
    textractError,
  })

  return {
    fileName: file.originalname,
    success: !textractError,
    error: textractError || null,
    documento,
    extractedData,
  }
}

async function uploadBulk(req, res) {
  try {
    const files = req.files
    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, error: 'No se enviaron archivos.' })
    }
    if (files.length > 24) {
      return res.status(400).json({ success: false, error: 'Máximo 24 archivos por lote.' })
    }

    const cuentaBancariaId = req.body?.cuentaBancariaId || null
    const solicitudId = req.body?.solicitudId || null

    if (!cuentaBancariaId || !solicitudId) {
      return res.status(400).json({ success: false, error: 'cuentaBancariaId y solicitudId son requeridos.' })
    }

    console.log(`[Bulk] 📦 Procesando ${files.length} archivos para cuenta ${cuentaBancariaId}`)

    // 1. Subir todos los archivos a S3 primero (rápido, en paralelo)
    const s3Uploads = await pLimit(files, async (file) => {
      const ext = path.extname(file.originalname).replace('.', '').toLowerCase()
      const key = `uploads/${uuidv4()}.${ext}`
      await s3.send(new PutObjectCommand({
        Bucket: S3_BUCKET,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }))
      const s3Url = `https://${S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`
      return { file, key, s3Url }
    }, 6)

    // 2. Procesar Textract + Bedrock en paralelo (máx 4 concurrentes para respetar límites AWS)
    const results = await pLimit(s3Uploads, async ({ file, key, s3Url }) => {
      return processBankStatementFile(file, { solicitudId, cuentaBancariaId, s3Key: key, s3Url })
    }, 4)

    const successful = results.filter(r => r.success).length
    const failed = results.filter(r => !r.success).length

    console.log(`[Bulk] ✅ Completado: ${successful} OK, ${failed} errores`)

    return res.json({
      success: true,
      total: files.length,
      successful,
      failed,
      results,
    })
  } catch (err) {
    console.error('[Bulk] Error general:', err)
    return res.status(500).json({ success: false, error: err.message })
  }
}

module.exports = { uploadFile, uploadBulk }
