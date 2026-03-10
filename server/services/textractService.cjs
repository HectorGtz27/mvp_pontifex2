const {
  TextractClient,
  DetectDocumentTextCommand,
  StartDocumentTextDetectionCommand,
  GetDocumentTextDetectionCommand,
} = require('@aws-sdk/client-textract')
const { awsCredentials } = require('../config/aws.cjs')

// Cached singleton Textract client
let _client = null
function getClient() {
  if (!_client) {
    _client = new TextractClient(awsCredentials)
  }
  return _client
}

// ═══════════════════════════════════════════════════════════
//  Async job polling helper
//  Shared between all async Textract operations.
// ═══════════════════════════════════════════════════════════
const POLL_INTERVAL_MS = 2000
const MAX_POLL_ATTEMPTS = 60 // 60 × 2 s = 2 min max

/**
 * Polls a Textract async job until it succeeds, fails, or times out.
 * Handles paginated results transparently.
 *
 * @param {string} jobId              - Textract JobId
 * @param {Function} GetCommandClass  - SDK command constructor (e.g. GetDocumentTextDetectionCommand)
 * @param {string} logPrefix          - Log prefix for console messages
 * @returns {Promise<Array>}          - All Blocks collected from the job
 */
async function pollJob(jobId, GetCommandClass, logPrefix) {
  const client = getClient()
  let status = 'IN_PROGRESS'
  let allBlocks = []
  let attempts = 0

  while (status === 'IN_PROGRESS' && attempts < MAX_POLL_ATTEMPTS) {
    attempts++
    console.log(`[${logPrefix}] ⏳ Esperando... (intento ${attempts}/${MAX_POLL_ATTEMPTS})`)
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS))

    const getResponse = await client.send(new GetCommandClass({ JobId: jobId }))
    status = getResponse.JobStatus

    if (status === 'SUCCEEDED') {
      allBlocks.push(...(getResponse.Blocks || []))

      // Paginated results
      let nextToken = getResponse.NextToken
      while (nextToken) {
        console.log(`[${logPrefix}] 📑 Obteniendo siguiente página de resultados...`)
        const nextRes = await client.send(new GetCommandClass({ JobId: jobId, NextToken: nextToken }))
        allBlocks.push(...(nextRes.Blocks || []))
        nextToken = nextRes.NextToken
      }

      console.log(`[${logPrefix}] ✅ Job completado — ${allBlocks.length} bloques`)
      return allBlocks
    }

    if (status === 'FAILED') {
      throw new Error(`Textract job failed: ${getResponse.StatusMessage}`)
    }
  }

  throw new Error(`Textract timeout — el documento tardó demasiado en procesarse`)
}

// ═══════════════════════════════════════════════════════════
//  TEXT DETECTION — Plain text extraction
//  Sync  → DetectDocumentText   (single page, <5 MB image or 1-page PDF)
//  Async → StartDocumentTextDetection (multi-page PDF in S3)
// ═══════════════════════════════════════════════════════════

/**
 * Sleep helper for retry logic
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Extracts plain text from a single-page document (image or 1-page PDF).
 * Faster and cheaper than FORMS analysis.
 * Includes retry logic for AWS throttling.
 *
 * @param {Buffer} fileBuffer - File bytes from multer
 * @returns {Promise<string>} All text lines joined with newlines
 */
async function extractRawTextSync(fileBuffer) {
  console.log(`[Textract/TEXT] Extrayendo texto (sync), ${fileBuffer.length} bytes...`)

  const client = getClient()
  const maxRetries = 3
  let lastError = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await client.send(
        new DetectDocumentTextCommand({ Document: { Bytes: fileBuffer } })
      )

      const lines = (response.Blocks || [])
        .filter(b => b.BlockType === 'LINE')
        .map(b => b.Text || '')

      console.log(`[Textract/TEXT] ✅ Extraídas ${lines.length} líneas`)
      return lines.join('\n')
    } catch (err) {
      lastError = err
      const isThrottling = err.name === 'ThrottlingException' || err.message?.includes('Too many requests')
      
      if (isThrottling && attempt < maxRetries) {
        const delayMs = Math.min(1000 * Math.pow(2, attempt), 8000) // Exponential backoff: 1s, 2s, 4s
        console.log(`[Textract/TEXT] ⚠️  Throttled (intento ${attempt + 1}/${maxRetries + 1}), reintentando en ${delayMs}ms...`)
        await sleep(delayMs)
        continue
      }
      
      throw err
    }
  }

  throw lastError
}

/**
 * Extracts plain text from a multi-page PDF already stored in S3.
 * Uses async job polling via pollJob().
 *
 * @param {string} s3Bucket  - S3 bucket name
 * @param {string} s3Key     - S3 object key
 * @param {number} [maxPages] - If set, only return lines from the first N pages
 * @returns {Promise<string>} All text lines joined with newlines
 */
async function extractRawTextAsync(s3Bucket, s3Key, maxPages = null) {
  console.log(`[Textract/TEXT-ASYNC] Iniciando extracción multi-página: ${s3Key}${maxPages ? ` (págs 1-${maxPages})` : ''}`)

  const client = getClient()

  const startResponse = await client.send(
    new StartDocumentTextDetectionCommand({
      DocumentLocation: { S3Object: { Bucket: s3Bucket, Name: s3Key } },
    })
  )

  const jobId = startResponse.JobId
  console.log(`[Textract/TEXT-ASYNC] ✓ Job iniciado: ${jobId}`)

  const allBlocks = await pollJob(jobId, GetDocumentTextDetectionCommand, 'Textract/TEXT-ASYNC')

  const lines = allBlocks
    .filter(b => b.BlockType === 'LINE' && (maxPages === null || (b.Page || 1) <= maxPages))
    .map(b => b.Text || '')

  console.log(`[Textract/TEXT-ASYNC] ✅ ${lines.length} líneas extraídas de ${s3Bucket}/${s3Key}`)
  return lines.join('\n')
}

module.exports = {
  extractRawTextSync,
  extractRawTextAsync,
}
