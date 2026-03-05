const express = require('express')
const multer = require('multer')
const { uploadFile, uploadBulk } = require('../controllers/uploadController.cjs')

const router = express.Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
  fileFilter(_req, file, cb) {
    const allowed = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png']
    if (allowed.includes(file.mimetype)) {
      cb(null, true)
    } else {
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

// POST /api/upload/bulk — hasta 12 archivos para una cuenta bancaria
router.post('/bulk', upload.array('files', 12), (req, res, next) => {
  console.log(`\n[Multer/Bulk] ▶ ${req.files?.length || 0} archivos recibidos`)
  console.log(`[Multer/Bulk] body:`, JSON.stringify(req.body))
  uploadBulk(req, res).catch(next)
})

// Handle multer errors gracefully
router.use((err, _req, res, _next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === 'LIMIT_FILE_SIZE') {
      return res.status(400).json({ success: false, error: 'El archivo excede el límite de 10 MB.' })
    }
    if (err.code === 'LIMIT_UNEXPECTED_FILE') {
      return res.status(400).json({ success: false, error: 'Tipo de archivo no permitido. Solo PDF, JPG, JPEG, PNG.' })
    }
    return res.status(400).json({ success: false, error: err.message })
  }
  return res.status(500).json({ success: false, error: 'Error interno del servidor.' })
})

module.exports = router
