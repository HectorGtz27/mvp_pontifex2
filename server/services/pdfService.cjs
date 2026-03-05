'use strict'

const { PDFDocument } = require('pdf-lib')

/**
 * Extrae únicamente la primera página de un PDF multi-página.
 * El buffer original NUNCA se modifica ni se guarda en disco.
 *
 * Si el archivo no es un PDF (JPEG, PNG), lo devuelve intacto
 * porque Textract puede procesarlo directamente en modo síncrono.
 *
 * @param {Buffer} fileBuffer  - Contenido completo del archivo
 * @param {string} mimeType    - MIME del archivo ('application/pdf', 'image/jpeg', ...)
 * @returns {Promise<{ buffer: Buffer, pageCount: number, wasSliced: boolean }>}
 */
async function extractFirstPage(fileBuffer, mimeType) {
  // Si no es PDF, devolver intacto (imágenes se procesan directo)
  if (mimeType !== 'application/pdf') {
    return { buffer: fileBuffer, pageCount: 1, wasSliced: false }
  }

  let srcDoc
  try {
    srcDoc = await PDFDocument.load(fileBuffer, { ignoreEncryption: true })
  } catch (err) {
    console.error('[pdfService] Error cargando PDF:', err.message)
    // Si pdf-lib no puede leerlo, devolver el buffer original y dejar que Textract falle con un mensaje claro
    return { buffer: fileBuffer, pageCount: null, wasSliced: false }
  }

  const pageCount = srcDoc.getPageCount()
  console.log(`[pdfService] PDF con ${pageCount} páginas recibido`)

  // Si ya es de 1 página, no hay nada que hacer
  if (pageCount === 1) {
    return { buffer: fileBuffer, pageCount: 1, wasSliced: false }
  }

  // Crear un PDF nuevo con sólo la página 1
  const singleDoc = await PDFDocument.create()
  const [firstPage] = await singleDoc.copyPages(srcDoc, [0])
  singleDoc.addPage(firstPage)

  const singleBytes = await singleDoc.save()
  const singleBuffer = Buffer.from(singleBytes)

  console.log(
    `[pdfService] ✅ Página 1 extraída: ${singleBuffer.length} bytes (original: ${fileBuffer.length} bytes, ${pageCount} págs)`
  )

  return { buffer: singleBuffer, pageCount, wasSliced: true }
}

module.exports = { extractFirstPage }
