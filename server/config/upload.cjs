'use strict'

/**
 * Shared upload constraints used by both multer (routes/upload.cjs)
 * and the upload controller's secondary validation (controllers/uploadController.cjs).
 */

/** Maximum file size in bytes — 30 MB (covers multi-page financial PDFs). */
const MAX_FILE_SIZE = 30 * 1024 * 1024

/** MIME types accepted by the upload endpoints. */
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/x-pdf',
  'application/octet-stream', // Some PDFs arrive with this type
  'image/jpeg',
  'image/jpg',
  'image/png',
]

/** File extensions accepted by the upload endpoints. */
const ALLOWED_EXTENSIONS = ['.pdf', '.jpg', '.jpeg', '.png']

module.exports = { MAX_FILE_SIZE, ALLOWED_MIME_TYPES, ALLOWED_EXTENSIONS }
