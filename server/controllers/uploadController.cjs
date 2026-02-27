const { PutObjectCommand } = require('@aws-sdk/client-s3')
const { v4: uuidv4 } = require('uuid')
const path = require('path')
const { s3, S3_BUCKET } = require('../config/s3.cjs')
const { analyzeDocumentForms } = require('../services/textractService.cjs')
const { createEmpresa } = require('../services/empresaService.cjs')
const { createDocumento } = require('../services/documentoService.cjs')

const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

async function uploadFile(req, res) {
  try {
    const file = req.file
    console.log(`\n═══════════════════════════════════════════════════════════`)
    console.log(`[Upload] ▶ INICIANDO CARGA DE ARCHIVO`)
    console.log(`═══════════════════════════════════════════════════════════`)

    if (!file) {
      console.error(`[Upload] ✗ No se envió archivo`)
      return res.status(400).json({ success: false, error: 'No se envió ningún archivo.' })
    }

    console.log(`[Upload] Archivo recibido: ${file.originalname} (${(file.size / 1024).toFixed(2)} KB, MIME: ${file.mimetype})`)

    // Validate MIME type
    if (!ALLOWED_MIME.includes(file.mimetype)) {
      console.error(`[Upload] ✗ MIME type no permitido: ${file.mimetype}`)
      return res.status(400).json({
        success: false,
        error: `Tipo de archivo no permitido (${file.mimetype}). Solo se permiten PDF, JPG, JPEG, PNG.`,
      })
    }

    // Validate size (multer already limits, but double-check)
    if (file.size > MAX_SIZE) {
      console.error(`[Upload] ✗ Archivo demasiado grande: ${(file.size / 1024 / 1024).toFixed(2)} MB`)
      return res.status(400).json({
        success: false,
        error: `El archivo excede el límite de 10 MB (${(file.size / 1024 / 1024).toFixed(2)} MB).`,
      })
    }

    console.log(`[Upload] ✓ Validaciones aceptadas`)

    // Build S3 key: uploads/{uuid}.{ext}
    const ext = path.extname(file.originalname).replace('.', '').toLowerCase()
    const key = `uploads/${uuidv4()}.${ext}`

    // ── 1. Upload to S3 ──
    console.log(`[Upload] ▶ Subiendo a S3 con clave: ${key}`)
    const putCommand = new PutObjectCommand({
      Bucket: S3_BUCKET,
      Key: key,
      Body: file.buffer,
      ContentType: file.mimetype,
    })

    await s3.send(putCommand)

    const s3Url = `https://${S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`
    console.log(`[Upload] ✓ S3 OK: ${s3Url}`)

    // ── 2. Determine document type from request ──
    const rawDocType = req.body?.documentTypeId
    const documentTypeId = (rawDocType && rawDocType !== 'null' && rawDocType !== 'undefined')
      ? rawDocType
      : null
    console.log(`[Upload] 📋 documentTypeId recibido: "${rawDocType}" → usando: "${documentTypeId}"`)

    // ── 3. Run Textract on ALL document types ──
    let extractedData = null
    let textractError = null
    try {
      console.log(`[Upload] ▶ Llamando a analyzeDocumentForms()...`)
      extractedData = await analyzeDocumentForms(file.buffer, file.mimetype, key)
      console.log(`[Upload] ✓ Textract completado exitosamente`)
      console.log(`[Upload] Datos extraídos:`, JSON.stringify(extractedData, null, 2))
    } catch (textractErr) {
      console.error(`[Upload] ✗ ERROR EN TEXTRACT:`, textractErr.message)
      textractError = textractErr.message
    }

    // ── 4. Save document record to DB (always) ──
    let documento = null
    try {
      documento = await createDocumento({
        documentType: documentTypeId || 'unknown',
        fileName: file.originalname,
        s3Url,
        s3Key: key,
        mimeType: file.mimetype,
        fileSize: file.size,
        extractedData,
        textractError,
      })
      console.log(`[Upload] ✓ Documento guardado en BD (ID: ${documento.id})`)
    } catch (dbErr) {
      console.error(`[Upload] ✗ ERROR AL GUARDAR DOCUMENTO EN BD:`, dbErr.message)
      console.error(`[Upload] Stack:`, dbErr.stack)
      // Continue — we still return the S3 URL even if DB insert fails
    }

    // ── 5. For situacion_fiscal, also create Empresa record ──
    let empresa = null
    if (documentTypeId === 'situacion_fiscal' && extractedData) {
      try {
        console.log(`[Upload] ▶ Documento tipo "situacion_fiscal" — guardando en tabla empresas...`)
        empresa = await createEmpresa(extractedData)
        console.log(`[Upload] ✓ Empresa guardada en BD (ID: ${empresa.id})`)
      } catch (dbErr) {
        console.error(`[Upload] ✗ ERROR AL GUARDAR EMPRESA EN BD:`, dbErr.message)
      }
    }

    console.log(`[Upload] ✓ PROCESO COMPLETADO EXITOSAMENTE`)
    console.log(`═══════════════════════════════════════════════════════════\n`)

    return res.json({
      success: true,
      s3Url,
      fileName: file.originalname,
      documentTypeId,
      documento,
      extractedData,
      empresa,
      ...(textractError ? { textractError } : {}),
    })
  } catch (err) {
    console.error(`[Upload] ✗ ERROR CRÍTICO EN UPLOADFILE:`, err.message)
    console.error(`[Upload] Stack:`, err.stack)
    return res.status(500).json({
      success: false,
      error: 'Error interno al subir el archivo a S3.',
      errorDetails: err.message,
    })
  }
}

module.exports = { uploadFile }
