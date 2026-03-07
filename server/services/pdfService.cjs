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

/**
 * Extrae las primeras N páginas de un PDF multi-página.
 * Si el archivo no es PDF, lo devuelve intacto.
 *
 * @param {Buffer} fileBuffer  - Contenido completo del archivo
 * @param {string} mimeType    - MIME del archivo
 * @param {number} maxPages    - Cuántas páginas incluir (ej. 2)
 * @returns {Promise<{ buffer: Buffer, pageCount: number, wasSliced: boolean }>}
 */
async function extractPages(fileBuffer, mimeType, maxPages = 2) {
  if (mimeType !== 'application/pdf') {
    return { buffer: fileBuffer, pageCount: 1, wasSliced: false }
  }

  let srcDoc
  try {
    srcDoc = await PDFDocument.load(fileBuffer, { ignoreEncryption: true })
  } catch (err) {
    console.error('[pdfService] Error cargando PDF:', err.message)
    return { buffer: fileBuffer, pageCount: null, wasSliced: false }
  }

  const pageCount = srcDoc.getPageCount()
  console.log(`[pdfService] PDF con ${pageCount} páginas recibido (máx a extraer: ${maxPages})`)

  const pagesToCopy = Math.min(maxPages, pageCount)

  if (pagesToCopy >= pageCount) {
    return { buffer: fileBuffer, pageCount, wasSliced: false }
  }

  const slicedDoc = await PDFDocument.create()
  const indices = Array.from({ length: pagesToCopy }, (_, i) => i)
  const copiedPages = await slicedDoc.copyPages(srcDoc, indices)
  copiedPages.forEach(p => slicedDoc.addPage(p))

  const slicedBytes = await slicedDoc.save()
  const slicedBuffer = Buffer.from(slicedBytes)

  console.log(
    `[pdfService] ✅ Páginas 1-${pagesToCopy} extraídas: ${slicedBuffer.length} bytes (original: ${fileBuffer.length} bytes, ${pageCount} págs)`
  )

  return { buffer: slicedBuffer, pageCount, wasSliced: true }
}

/**
 * Extrae exactamente UNA página específica de un PDF (0-indexed).
 * Necesario porque Textract sync sólo acepta PDFs de 1 página vía bytes.
 *
 * @param {Buffer} fileBuffer  - Contenido completo del archivo
 * @param {string} mimeType    - MIME del archivo
 * @param {number} pageIndex   - Índice de la página (0 = primera)
 * @returns {Promise<Buffer|null>} Buffer del PDF de 1 página, o null si no existe
 */
async function extractPageAt(fileBuffer, mimeType, pageIndex) {
  if (mimeType !== 'application/pdf') {
    // Para imágenes sólo existe la página 0
    return pageIndex === 0 ? fileBuffer : null
  }

  let srcDoc
  try {
    srcDoc = await PDFDocument.load(fileBuffer, { ignoreEncryption: true })
  } catch (err) {
    console.error('[pdfService] Error cargando PDF:', err.message)
    return null
  }

  const pageCount = srcDoc.getPageCount()
  if (pageIndex >= pageCount) return null

  const singleDoc = await PDFDocument.create()
  const [page] = await singleDoc.copyPages(srcDoc, [pageIndex])
  singleDoc.addPage(page)

  const bytes = await singleDoc.save()
  return Buffer.from(bytes)
}

/**
 * Converts a PDF page buffer to a PNG image buffer.
 * This is necessary because AWS Textract DetectDocumentText (sync)
 * works more reliably with images than with single-page PDFs.
 *
 * Uses pdf-poppler (poppler-utils) to convert PDF to PNG at high resolution.
 *
 * @param {Buffer} pdfPageBuffer - Single-page PDF buffer (from extractPageAt)
 * @returns {Promise<Buffer>} PNG image buffer
 */
async function convertPdfPageToImage(pdfPageBuffer) {
  const { convert } = require('pdf-poppler')
  const fs = require('fs')
  const os = require('os')
  const path = require('path')
  const { promisify } = require('util')
  const writeFile = promisify(fs.writeFile)
  const readFile = promisify(fs.readFile)
  const unlink = promisify(fs.unlink)

  console.log(`[pdfService] Converting PDF page to PNG (${pdfPageBuffer.length} bytes)...`)

  // Create temporary file for pdf-poppler (it requires file path)
  const tmpDir = os.tmpdir()
  const tmpPdfPath = path.join(tmpDir, `pdf-${Date.now()}-${Math.random().toString(36).slice(2)}.pdf`)
  const tmpOutputPrefix = path.join(tmpDir, `pdf-out-${Date.now()}-${Math.random().toString(36).slice(2)}`)

  try {
    // Write PDF buffer to temp file
    await writeFile(tmpPdfPath, pdfPageBuffer)

    // Convert PDF to PNG (generates tmpOutputPrefix-1.png for page 1)
    const opts = {
      format: 'png',
      scale: 2048,      // High resolution for better OCR
      out_dir: tmpDir,
      out_prefix: path.basename(tmpOutputPrefix),
      page: null,       // Convert all pages (should be 1)
    }

    await convert(tmpPdfPath, opts)

    // Read the generated PNG
    const outputPngPath = `${tmpOutputPrefix}-1.png`
    const pngBuffer = await readFile(outputPngPath)

    console.log(`[pdfService] ✅ PDF page rendered to PNG: ${pngBuffer.length} bytes`)

    // Clean up temp files
    await unlink(tmpPdfPath).catch(() => {})
    await unlink(outputPngPath).catch(() => {})

    return pngBuffer
  } catch (err) {
    // Clean up on error
    await unlink(tmpPdfPath).catch(() => {})
    throw err
  }
}

module.exports = { extractFirstPage, extractPages, extractPageAt, convertPdfPageToImage }
