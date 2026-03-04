const { PutObjectCommand } = require('@aws-sdk/client-s3')
const { v4: uuidv4 } = require('uuid')
const path = require('path')
const { s3, S3_BUCKET } = require('../config/s3.cjs')
const { analyzeDocumentFormsAsync } = require('../services/textractService.cjs')
const { createDocumento } = require('../services/documentoService.cjs')

const ALLOWED_MIME = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
const MAX_SIZE = 10 * 1024 * 1024 // 10 MB

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
    console.log(`[Upload] documentTypeId: ${documentTypeId}, solicitudId: ${solicitudId}`)

    // ── 3. Run Textract FORMS for "Constancia de Situación Fiscal" ──
    // Usando método asíncrono para soportar PDFs multi-página
    let extractedData = null
    let textractError = null
    if (documentTypeId === 'constancia_situacion_fiscal') {
      console.log('[Upload] 🔍 Documento es Constancia de Situación Fiscal, llamando a Textract ASYNC...')
      try {
        // El archivo ya está en S3, así que usamos el método asíncrono
        // que soporta documentos multi-página
        extractedData = await analyzeDocumentFormsAsync(S3_BUCKET, key)
        console.log('[Upload] ✅ Textract completado exitosamente')
      } catch (textractErr) {
        console.error('❌ [Upload] Error calling Textract:')
        console.error('   Tipo:', textractErr.constructor.name)
        console.error('   Mensaje:', textractErr.message)
        console.error('   Código:', textractErr.code)
        console.error('   Stack:', textractErr.stack)
        if (textractErr.$metadata) {
          console.error('   Metadata:', JSON.stringify(textractErr.$metadata, null, 2))
        }
        textractError = `Error de Textract: ${textractErr.message || textractErr.code || 'Error desconocido'}`
      }
    } else {
      console.log(`[Upload] Documento tipo "${documentTypeId}", Textract no aplicable (solo para constancia_situacion_fiscal)`)
    }

    // ── 4. Save document record in the DB ──
    let documento = null
    try {
      documento = await createDocumento({
        solicitudId,
        documentType: documentTypeId,
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

    return res.json({
      success: true,
      documento,
      extractedData,
    })
  } catch (err) {
    console.error('Error uploading to S3:', err)
    return res.status(500).json({
      success: false,
      error: 'Error interno al subir el archivo a S3.',
    })
  }
}

module.exports = { uploadFile }
