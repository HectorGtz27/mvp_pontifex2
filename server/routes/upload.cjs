const express = require('express')
const multer = require('multer')
const path = require('path')
const { uploadFile, uploadBulk } = require('../controllers/uploadController.cjs')

const router = express.Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter(_req, file, cb) {
    // Validar por MIME type
    const allowedMimeTypes = [
      'application/pdf',
      'application/x-pdf',
      'application/octet-stream', // Algunos PDFs vienen así
      'image/jpeg',
      'image/jpg',
      'image/png',
    ]
    
    // Validar por extensión (más confiable que MIME type)
    const ext = path.extname(file.originalname).toLowerCase()
    const allowedExtensions = ['.pdf', '.jpg', '.jpeg', '.png']
    
    const validMimeType = allowedMimeTypes.includes(file.mimetype)
    const validExtension = allowedExtensions.includes(ext)
    
    console.log(`[Multer] Validando: ${file.originalname} | mimetype: ${file.mimetype} | ext: ${ext}`)
    
    if (validExtension && (validMimeType || ext === '.pdf')) {
      // Si la extensión es válida y el mimetype es válido O es un PDF, aceptar
      cb(null, true)
    } else {
      console.log(`[Multer] ❌ Archivo rechazado: ${file.originalname}`)
      cb(new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname))
    }
  },
})

// POST /api/upload
router.post('/', upload.single('file'), (req, res, next) => {
  console.log(`\n[Multer] ▶ Middleware ejecutado`)
  console.log(`[Multer] req.file:`, req.file ? { fieldname: req.file.fieldname, originalname: req.file.originalname, mimetype: req.file.mimetype, size: req.file.size } : 'undefined')
  console.log(`[Multer] req.body:`, JSON.stringify(req.body, null, 2))
  console.log(`[Multer] req.body.documentTypeId:`, req.body?.documentTypeId)
  uploadFile(req, res).catch(next)
})

// POST /api/upload/bulk — hasta 24 archivos para una cuenta bancaria
router.post('/bulk', upload.array('files', 24), (req, res, next) => {
  console.log(`\n[Multer/Bulk] ▶ ${req.files?.length || 0} archivos recibidos`)
  console.log(`[Multer/Bulk] body:`, JSON.stringify(req.body))
  
  // Log each file received
  if (req.files) {
    req.files.forEach((f, i) => {
      console.log(`[Multer/Bulk]   ${i+1}. ${f.originalname} (${f.mimetype}, ${(f.size/1024).toFixed(1)} KB)`)
    })
  }
  
  uploadBulk(req, res).catch(next)
})

// Handle multer errors gracefully
router.use((err, _req, res, _next) => {
  console.error('[Multer] Error:', err.code, err.message)
  
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, error: 'El archivo excede el límite de 10 MB.' })
    }
    if (err.code === 'LIMIT_FILE_COUNT') {
      return res.status(400).json({ success: false, error: 'Máximo 24 archivos por lote.' })
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ success: false, error: 'Tipo de archivo no permitido. Solo PDF, JPG, JPEG, PNG.' })
    }
    return res.status(400).json({ success: false, error: `Error de Multer: ${err.message}` })
  }
  
  // Log non-multer errors with full detail
  console.error('[Multer] Error no-multer:', err)
  return res.status(500).json({ success: false, error: 'Error interno del servidor.' })
})

module.exports = router
