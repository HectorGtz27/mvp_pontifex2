const {
  TextractClient,
  AnalyzeDocumentCommand,
  StartDocumentAnalysisCommand,
  GetDocumentAnalysisCommand,
  DetectDocumentTextCommand,
  StartDocumentTextDetectionCommand,
  GetDocumentTextDetectionCommand,
} = require('@aws-sdk/client-textract')

// ═══════════════════════════════════════════════════════════
//  FORMS mode — key-value pairs (used for CSF and similar)
// ═══════════════════════════════════════════════════════════

// Map of CSF label → internal field name
// Keys are normalised (lowercase, no trailing colon/spaces)
const CSF_KEY_MAP = {
  'rfc':                          'rfc',
  'curp':                         'curp',
  'denominacion/razon social':    'razon_social',
  'denominacion o razon social':  'razon_social',
  'razon social':                 'razon_social',
  'nombre (s)':                   'nombre',
  'primer apellido':              'primer_apellido',
  'segundo apellido':             'segundo_apellido',
  'nombre comercial':             'nombre_comercial',
  'nombre de vialidad':           'vialidad',
  'numero exterior':              'numero_exterior',
  'numero interior':              'numero_interior',
  'nombre de la colonia':         'colonia',
  'nombre de la localidad':       'localidad',
  'nombre del municipio o demarcacion territorial': 'municipio',
  'nombre de la entidad federativa': 'estado',
  'tipo de vialidad':             'tipo_vialidad',
  'entre calle':                  'entre_calle',
  'fecha inicio de operaciones':  'fecha_inicio_operaciones',
  'estatus en el padron':         'estatus_padron',
  'lugar y fecha de emision':     'lugar_fecha_emision',
  'idcif':                        'id_cif',
}

/**
 * Creates a fresh TextractClient (avoids SDK singleton issues).
 */
function createClient() {
  return new TextractClient({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  })
}

/**
 * Analyses a document using FORMS (key-value pairs).
 * Best for structured documents like the CSF.
 *
 * @param {Buffer} fileBuffer - File bytes from multer
 * @param {string} mimeType  - MIME type
 * @returns {Promise<Object>} Mapped fields
 */
async function analyzeDocumentForms(fileBuffer, mimeType) {
  console.log(`[Textract/FORMS] Buffer: ${fileBuffer.length} bytes, MIME: ${mimeType}`)

  if (!fileBuffer || fileBuffer.length === 0) {
    throw new Error('[Textract] Buffer is empty')
  }

  const client = createClient()

  const command = new AnalyzeDocumentCommand({
    Document: { Bytes: fileBuffer },
    FeatureTypes: ['FORMS'],
  })

  console.log('[Textract/FORMS] Sending AnalyzeDocument...')
  const response = await client.send(command)

  const blocks = response.Blocks || []
  console.log(`[Textract/FORMS] Success - ${blocks.length} blocks received`)

  return parseFormsResponse(blocks)
}

/**
 * Parses FORMS (KEY_VALUE_SET) blocks into a clean object.
 *
 * 1. Builds a block lookup map.
 * 2. Finds KEY blocks and follows CHILD → WORD for the label text.
 * 3. Follows VALUE relationship → CHILD → WORD for the value text.
 * 4. Normalises the label and maps it to our internal field name.
 * 5. Assembles the final empresa-compatible object.
 */
function parseFormsResponse(blocks) {
  const blockMap = {}
  for (const b of blocks) blockMap[b.Id] = b

  // Extract raw key-value pairs
  const rawPairs = {}

  for (const b of blocks) {
    if (b.BlockType !== 'KEY_VALUE_SET') continue
    if (!b.EntityTypes || b.EntityTypes[0] !== 'KEY') continue

    // ── Get key text ──
    let keyText = ''
    for (const rel of b.Relationships || []) {
      if (rel.Type === 'CHILD') {
        for (const id of rel.Ids || []) {
          const child = blockMap[id]
          if (child?.BlockType === 'WORD') keyText += (keyText ? ' ' : '') + child.Text
        }
      }
    }

    // ── Get value text ──
    let valueText = ''
    for (const rel of b.Relationships || []) {
      if (rel.Type === 'VALUE') {
        for (const id of rel.Ids || []) {
          const valueBlock = blockMap[id]
          if (!valueBlock) continue
          for (const vRel of valueBlock.Relationships || []) {
            if (vRel.Type === 'CHILD') {
              for (const vid of vRel.Ids || []) {
                const word = blockMap[vid]
                if (word?.BlockType === 'WORD') valueText += (valueText ? ' ' : '') + word.Text
              }
            }
          }
        }
      }
    }

    // Normalise key: lowercase, remove accents, trailing colon/spaces
    const normKey = keyText
      .toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // strip accents
      .replace(/:?\s*$/, '')                             // strip trailing : and spaces
      .trim()

    const fieldName = CSF_KEY_MAP[normKey]
    if (fieldName && valueText.trim()) {
      rawPairs[fieldName] = valueText.trim()
    } else if (!fieldName) {
      // Log unmapped keys for debugging
      console.log(`[Textract/FORMS] Unmapped key: "${normKey}" → "${valueText.trim()}"`)
    }
  }

  console.log('[Textract/FORMS] Mapped fields:', JSON.stringify(rawPairs, null, 2))

  // ── Build empresa-compatible object ──
  // Persona moral: uses "Denominación/Razón Social" directly
  // Persona física: combines nombre + apellidos
  let razonSocial = rawPairs.razon_social || null
  if (!razonSocial) {
    const nombreParts = [rawPairs.nombre, rawPairs.primer_apellido, rawPairs.segundo_apellido]
      .filter(Boolean)
    razonSocial = nombreParts.length > 0 ? nombreParts.join(' ') : null
  }

  // Build domicilio fiscal from address parts
  // Formato: localidad + estado + colonia + tipo_vialidad + vialidad + numero_exterior
  const domicilioParts = [
    rawPairs.localidad,
    rawPairs.estado,
    rawPairs.colonia,
    rawPairs.tipo_vialidad,
    rawPairs.vialidad,
    rawPairs.numero_exterior,
  ].filter(Boolean)
  const domicilioFiscal = domicilioParts.length > 0 ? domicilioParts.join(', ') : null

  return {
    razon_social:       razonSocial,
    nombre_comercial:   rawPairs.nombre_comercial || null,
    rfc:                rawPairs.rfc || null,
    domicilio_fiscal:   domicilioFiscal,
    ciudad:             rawPairs.localidad || rawPairs.municipio || null,
    estado:             rawPairs.estado || null,
    telefono:           null,  // CSF doesn't include phone
    correo_electronico: null,  // CSF doesn't include email
    pagina_web:         null,  // CSF doesn't include website
    numero_empleados:   null,  // CSF doesn't include employees
    // Extra CSF fields (not in empresa table but useful)
    _extra: {
      curp:                     rawPairs.curp || null,
      estatus_padron:           rawPairs.estatus_padron || null,
      fecha_inicio_operaciones: rawPairs.fecha_inicio_operaciones || null,
      lugar_fecha_emision:      rawPairs.lugar_fecha_emision || null,
      id_cif:                   rawPairs.id_cif || null,
      entre_calle:              rawPairs.entre_calle || null,
    },
  }
}

// ═══════════════════════════════════════════════════════════
//  ASYNC mode — multi-page documents (StartDocumentAnalysis)
// ═══════════════════════════════════════════════════════════

/**
 * Analyses a multi-page document using async Textract (FORMS mode).
 * The document MUST already be in S3.
 *
 * @param {string} s3Bucket - S3 bucket name
 * @param {string} s3Key - S3 object key
 * @returns {Promise<Object>} Mapped fields (same format as analyzeDocumentForms)
 */
async function analyzeDocumentFormsAsync(s3Bucket, s3Key) {
  console.log(`[Textract/ASYNC] Iniciando análisis de documento multi-página...`)
  console.log(`[Textract/ASYNC] Bucket: ${s3Bucket}, Key: ${s3Key}`)

  const client = createClient()

  // ── 1. Iniciar análisis ──
  const startCommand = new StartDocumentAnalysisCommand({
    DocumentLocation: {
      S3Object: {
        Bucket: s3Bucket,
        Name: s3Key,
      },
    },
    FeatureTypes: ['FORMS'],
  })

  console.log('[Textract/ASYNC] 🚀 Enviando StartDocumentAnalysis...')
  const startResponse = await client.send(startCommand)
  const jobId = startResponse.JobId

  console.log(`[Textract/ASYNC] ✓ Job iniciado con ID: ${jobId}`)

  // ── 2. Polling hasta que complete ──
  let status = 'IN_PROGRESS'
  let allBlocks = []
  const maxAttempts = 60 // 60 intentos × 2 segundos = 2 minutos máximo
  let attempts = 0

  while (status === 'IN_PROGRESS' && attempts < maxAttempts) {
    attempts++
    console.log(`[Textract/ASYNC] ⏳ Esperando... (intento ${attempts}/${maxAttempts})`)
    
    // Esperar 2 segundos entre intentos
    await new Promise(resolve => setTimeout(resolve, 2000))

    const getCommand = new GetDocumentAnalysisCommand({ JobId: jobId })
    const getResponse = await client.send(getCommand)

    status = getResponse.JobStatus
    console.log(`[Textract/ASYNC] Estado: ${status}`)

    if (status === 'SUCCEEDED') {
      // Recopilar todos los bloques (puede ser paginado)
      allBlocks.push(...(getResponse.Blocks || []))

      // Si hay más páginas, obtenerlas
      let nextToken = getResponse.NextToken
      while (nextToken) {
        console.log(`[Textract/ASYNC] 📑 Obteniendo siguiente página de resultados...`)
        const nextCommand = new GetDocumentAnalysisCommand({ 
          JobId: jobId, 
          NextToken: nextToken 
        })
        const nextResponse = await client.send(nextCommand)
        allBlocks.push(...(nextResponse.Blocks || []))
        nextToken = nextResponse.NextToken
      }

      console.log(`[Textract/ASYNC] ✅ Análisis completado - ${allBlocks.length} bloques recibidos`)
      break
    } else if (status === 'FAILED') {
      throw new Error(`Textract job failed: ${getResponse.StatusMessage}`)
    }
  }

  if (status === 'IN_PROGRESS') {
    throw new Error('Textract timeout - el documento tardó demasiado en procesarse')
  }

  // ── 3. Parsear los bloques usando la misma lógica que el método síncrono ──
  return parseFormsResponse(allBlocks)
}

// ═══════════════════════════════════════════════════════════
//  QUERIES mode — ask specific questions (reserved for future use)
// ═══════════════════════════════════════════════════════════

// Queries for Textract (English to avoid SDK unicode serialization bug in v3.999)
// Aliases remain in Spanish for downstream compatibility
const QUERIES = [
  { Text: 'What is the company legal name or razon social?', Alias: 'razon_social' },
  { Text: 'What is the trade name or nombre comercial?', Alias: 'nombre_comercial' },
  { Text: 'What is the RFC or tax ID?', Alias: 'rfc' },
  { Text: 'What is the fiscal address or domicilio fiscal?', Alias: 'domicilio_fiscal' },
  { Text: 'What is the city?', Alias: 'ciudad' },
  { Text: 'What is the state or estado?', Alias: 'estado' },
  { Text: 'What is the phone number?', Alias: 'telefono' },
  { Text: 'What is the email address?', Alias: 'correo_electronico' },
  { Text: 'What is the website or pagina web?', Alias: 'pagina_web' },
  { Text: 'How many employees does the company have?', Alias: 'numero_empleados' },
]

/**
 * Calls Amazon Textract synchronously using AnalyzeDocument.
 *
 * Sends the raw file bytes directly — no special S3 permissions needed.
 * Processes a single page; suitable for CSF and similar documents.
 *
 * @param {Buffer} fileBuffer - The file content as a Buffer (from multer)
 * @param {string} mimeType - The MIME type of the file
 * @returns {Promise<Object>} Clean object with the extracted fields
 */
/**
 * Analyses a document using QUERIES mode.
 * Reserved for future use with non-standard documents.
 *
 * @param {Buffer} fileBuffer - File bytes from multer
 * @param {string} mimeType  - MIME type
 * @returns {Promise<Object>} Extracted fields keyed by alias
 */
async function analyzeDocumentQueries(fileBuffer, mimeType) {
  console.log(`[Textract/QUERIES] Buffer: ${fileBuffer.length} bytes, MIME: ${mimeType}`)

  if (!fileBuffer || fileBuffer.length === 0) {
    throw new Error('[Textract] Buffer is empty')
  }

  const client = createClient()

  const command = new AnalyzeDocumentCommand({
    Document: { Bytes: fileBuffer },
    FeatureTypes: ['QUERIES'],
    QueriesConfig: { Queries: QUERIES },
  })

  console.log('[Textract/QUERIES] Sending AnalyzeDocument...')
  const response = await client.send(command)

  const blocks = response.Blocks || []
  console.log(`[Textract/QUERIES] Success - ${blocks.length} blocks received`)

  return parseTextractQueriesResponse({ Blocks: blocks })
}

// ─── Minimum confidence (0-100) to accept a QUERY_RESULT ───
const MIN_CONFIDENCE = 50

/**
 * Parses the full Textract response (or an object with a `Blocks` array)
 * and extracts QUERY / QUERY_RESULT pairs mapped by their Alias.
 *
 * Steps:
 *   1. Build a lookup map  BlockId → Block  (O(n)).
 *   2. Walk only QUERY blocks.
 *   3. Follow each QUERY's ANSWER relationship to its QUERY_RESULT.
 *   4. Accept the result only if Confidence >= MIN_CONFIDENCE.
 *   5. When duplicate aliases appear (multi-page docs), keep the
 *      answer with the highest confidence.
 *
 * @param {{ Blocks: Array }} response - Textract response or equivalent
 * @returns {Object} Clean key-value object. Keys = aliases, values = string | null
 */
function parseTextractQueriesResponse(response) {
  const blocks = response?.Blocks || []

  // ── 1. Build block lookup ────────────────────────────────
  const blockMap = {}
  for (const block of blocks) {
    blockMap[block.Id] = block
  }

  // ── 2. Initialise result with null for every known alias ─
  const result = {}
  const confidenceMap = {} // tracks best confidence per alias

  for (const q of QUERIES) {
    result[q.Alias] = null
    confidenceMap[q.Alias] = -1
  }

  // ── 3. Walk QUERY blocks ─────────────────────────────────
  for (const block of blocks) {
    if (block.BlockType !== 'QUERY') continue

    const alias = block.Query?.Alias
    if (!alias || !(alias in result)) continue // unknown alias — skip

    const relationships = block.Relationships || []

    for (const rel of relationships) {
      if (rel.Type !== 'ANSWER') continue

      for (const answerId of rel.Ids || []) {
        const answerBlock = blockMap[answerId]

        // Only accept QUERY_RESULT blocks
        if (!answerBlock || answerBlock.BlockType !== 'QUERY_RESULT') continue

        const confidence = answerBlock.Confidence ?? 0
        const text = (answerBlock.Text || '').trim()

        // ── 4. Reject low-confidence or empty results ──────
        if (confidence < MIN_CONFIDENCE || !text) continue

        // ── 5. Keep the highest-confidence answer per alias ─
        if (confidence > confidenceMap[alias]) {
          result[alias] = text
          confidenceMap[alias] = confidence
        }
      }
    }
  }

  return result
}

// ═══════════════════════════════════════════════════════════
//  TEXT DETECTION — Plain text extraction (for bank statements)
//  Uses DetectDocumentText (sync, 1 page) or
//  StartDocumentTextDetection (async, multi-page PDF in S3)
// ═══════════════════════════════════════════════════════════

/**
 * Extracts plain text from a single-page document (image or 1-page PDF).
 * Faster and cheaper than FORMS analysis.
 *
 * @param {Buffer} fileBuffer - File bytes from multer
 * @returns {Promise<string>} All text lines joined with newlines
 */
async function extractRawTextSync(fileBuffer) {
  console.log(`[Textract/TEXT] Extrayendo texto (sync), ${fileBuffer.length} bytes...`)

  const client = createClient()
  const command = new DetectDocumentTextCommand({
    Document: { Bytes: fileBuffer },
  })

  const response = await client.send(command)
  const lines = (response.Blocks || [])
    .filter(b => b.BlockType === 'LINE')
    .map(b => b.Text || '')

  const text = lines.join('\n')
  console.log(`[Textract/TEXT] ✅ Extraídas ${lines.length} líneas`)
  return text
}

/**
 * Extracts plain text from a multi-page PDF already stored in S3.
 * Uses async job polling (same pattern as analyzeDocumentFormsAsync).
 *
 * @param {string} s3Bucket - S3 bucket name
 * @param {string} s3Key    - S3 object key
 * @returns {Promise<string>} All text lines joined with newlines
 */
async function extractRawTextAsync(s3Bucket, s3Key) {
  console.log(`[Textract/TEXT-ASYNC] Iniciando extracción de texto multi-página...`)
  console.log(`[Textract/TEXT-ASYNC] Bucket: ${s3Bucket}, Key: ${s3Key}`)

  const client = createClient()

  // ── 1. Start text detection job ──
  const startCommand = new StartDocumentTextDetectionCommand({
    DocumentLocation: {
      S3Object: { Bucket: s3Bucket, Name: s3Key },
    },
  })

  const startResponse = await client.send(startCommand)
  const jobId = startResponse.JobId
  console.log(`[Textract/TEXT-ASYNC] ✓ Job iniciado: ${jobId}`)

  // ── 2. Poll until complete ──
  let status = 'IN_PROGRESS'
  let allBlocks = []
  const maxAttempts = 60
  let attempts = 0

  while (status === 'IN_PROGRESS' && attempts < maxAttempts) {
    attempts++
    console.log(`[Textract/TEXT-ASYNC] ⏳ Esperando... (intento ${attempts}/${maxAttempts})`)
    await new Promise(resolve => setTimeout(resolve, 2000))

    const getCommand = new GetDocumentTextDetectionCommand({ JobId: jobId })
    const getResponse = await client.send(getCommand)
    status = getResponse.JobStatus

    if (status === 'SUCCEEDED') {
      allBlocks.push(...(getResponse.Blocks || []))

      let nextToken = getResponse.NextToken
      while (nextToken) {
        const nextCmd = new GetDocumentTextDetectionCommand({ JobId: jobId, NextToken: nextToken })
        const nextRes = await client.send(nextCmd)
        allBlocks.push(...(nextRes.Blocks || []))
        nextToken = nextRes.NextToken
      }
      break
    } else if (status === 'FAILED') {
      throw new Error(`Textract text detection failed: ${getResponse.StatusMessage}`)
    }
  }

  if (status === 'IN_PROGRESS') {
    throw new Error('Textract text detection timeout')
  }

  const lines = allBlocks
    .filter(b => b.BlockType === 'LINE')
    .map(b => b.Text || '')

  const text = lines.join('\n')
  console.log(`[Textract/TEXT-ASYNC] ✅ ${lines.length} líneas extraídas de ${s3Bucket}/${s3Key}`)
  return text
}

module.exports = {
  analyzeDocumentForms,
  analyzeDocumentFormsAsync,
  analyzeDocumentQueries,
  parseFormsResponse,
  parseTextractQueriesResponse,
  extractRawTextSync,
  extractRawTextAsync,
}
