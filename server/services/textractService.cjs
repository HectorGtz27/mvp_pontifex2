const {
  TextractClient,
  AnalyzeDocumentCommand,
  StartDocumentAnalysisCommand,
  GetDocumentAnalysisCommand,
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
 * Routes to async API for PDFs (supports multiple pages),
 * or sync API for images (single page only).
 *
 * @param {Buffer} fileBuffer - File bytes from multer
 * @param {string} mimeType  - MIME type
 * @param {string} s3Key     - S3 object key (required for PDFs)
 * @returns {Promise<Object>} Mapped fields
 */
async function analyzeDocumentForms(fileBuffer, mimeType, s3Key) {
  console.log(`\n[Textract/FORMS] ▶ INICIANDO analyzeDocumentForms()`)
  console.log(`[Textract/FORMS] Buffer: ${fileBuffer.length} bytes, MIME: ${mimeType}, S3Key: ${s3Key}`)

  if (!fileBuffer || fileBuffer.length === 0) {
    console.error(`[Textract/FORMS] ✗ Buffer está vacío`)
    throw new Error('[Textract] Buffer is empty')
  }

  if (mimeType === 'application/pdf') {
    if (!s3Key) {
      console.error(`[Textract/FORMS] ✗ s3Key requerido para PDF pero no fue proporcionado`)
      throw new Error('[Textract] s3Key is required for PDF documents')
    }
    console.log(`[Textract/FORMS] 📄 Detectado PDF - Usando API asíncrona con polling`)
    return analyzeDocumentFormsAsync(s3Key, process.env.S3_BUCKET_NAME)
  }

  // Images — use synchronous API (single page only)
  console.log(`[Textract/FORMS] 🖼️  Detectada imagen - Usando API síncrona`)
  const client = createClient()

  const command = new AnalyzeDocumentCommand({
    Document: { Bytes: fileBuffer },
    FeatureTypes: ['FORMS'],
  })

  console.log(`[Textract/FORMS] ▶ Enviando AnalyzeDocument al API de AWS...`)
  const response = await client.send(command)

  const blocks = response.Blocks || []
  console.log(`[Textract/FORMS] ✓ Respuesta recibida - ${blocks.length} bloques`)

  const parsed = parseFormsResponse(blocks)
  console.log(`[Textract/FORMS] ✓ Parseado exitosamente`)
  return parsed
}

/**
 * Async Textract FORMS analysis for PDFs (single- or multi-page).
 * Uses StartDocumentAnalysis + polling with GetDocumentAnalysis.
 * Handles paginated results via NextToken.
 *
 * @param {string} s3Key    - S3 object key
 * @param {string} s3Bucket - S3 bucket name
 * @returns {Promise<Object>} Mapped fields
 */
async function analyzeDocumentFormsAsync(s3Key, s3Bucket) {
  const client = createClient()
  const POLL_INTERVAL_MS = 2000
  const MAX_ATTEMPTS = 30

  console.log(`\n[Textract/FORMS-Async] ▶ INICIANDO procesamiento asíncrono`)
  console.log(`[Textract/FORMS-Async] S3Bucket: ${s3Bucket}, S3Key: ${s3Key}`)

  // Start the async job
  const startCommand = new StartDocumentAnalysisCommand({
    DocumentLocation: { S3Object: { Bucket: s3Bucket, Name: s3Key } },
    FeatureTypes: ['FORMS'],
  })

  console.log(`[Textract/FORMS-Async] ▶ Iniciando job de análisis asíncrono en AWS...`)
  let startResponse
  try {
    startResponse = await client.send(startCommand)
    console.log(`[Textract/FORMS-Async] ✓ Job iniciado`)
  } catch (err) {
    console.error(`[Textract/FORMS-Async] ✗ Error al iniciar job:`, err.message)
    throw err
  }

  const jobId = startResponse.JobId
  console.log(`[Textract/FORMS-Async] JobId: ${jobId}`)

  // Poll until SUCCEEDED or FAILED
  let attempts = 0
  let jobStatus = 'IN_PROGRESS'
  const allBlocks = []

  while (jobStatus === 'IN_PROGRESS' && attempts < MAX_ATTEMPTS) {
    await new Promise(resolve => setTimeout(resolve, POLL_INTERVAL_MS))
    attempts++

    console.log(`[Textract/FORMS-Async] ▶ Poll intento ${attempts}/${MAX_ATTEMPTS}...`)

    let nextToken = undefined
    let firstPage = true
    let pageCount = 0

    // Fetch all pages of results for this polling attempt
    while (firstPage || nextToken) {
      firstPage = false
      pageCount++
      const getCommand = new GetDocumentAnalysisCommand({
        JobId: jobId,
        MaxResults: 1000,
        ...(nextToken ? { NextToken: nextToken } : {}),
      })

      let getResponse
      try {
        getResponse = await client.send(getCommand)
      } catch (err) {
        console.error(`[Textract/FORMS-Async] ✗ Error en GetDocumentAnalysis:`, err.message)
        throw err
      }

      jobStatus = getResponse.JobStatus
      console.log(`[Textract/FORMS-Async]   Página ${pageCount}: Status=${jobStatus}`)

      if (jobStatus === 'FAILED') {
        const errMsg = getResponse.StatusMessage || 'Unknown error'
        console.error(`[Textract/FORMS-Async] ✗ AWS reportó fallo: ${errMsg}`)
        throw new Error(`[Textract] Async job failed: ${errMsg}`)
      }

      if (jobStatus === 'SUCCEEDED') {
        const blocksInPage = getResponse.Blocks || []
        console.log(`[Textract/FORMS-Async]   Página ${pageCount}: ${blocksInPage.length} bloques`)
        allBlocks.push(...blocksInPage)
        nextToken = getResponse.NextToken
        if (!nextToken) {
          console.log(`[Textract/FORMS-Async]   ✓ Fin de paginas (NextToken = undefined)`)
        }
      } else {
        // Still in progress — stop paginating this round and wait
        console.log(`[Textract/FORMS-Async]   Estado aún "IN_PROGRESS", esperando siguiente poll...`)
        nextToken = undefined
      }
    }

    console.log(`[Textract/FORMS-Async] Poll ${attempts}: ${jobStatus} (${allBlocks.length} bloques acumulados)`)
  }

  if (jobStatus !== 'SUCCEEDED') {
    console.error(`[Textract/FORMS-Async] ✗ Job no completó después de ${MAX_ATTEMPTS} intentos. Último status: ${jobStatus}`)
    throw new Error(`[Textract] Async job timed out after ${MAX_ATTEMPTS} attempts`)
  }

  console.log(`[Textract/FORMS-Async] ✓ Job COMPLETADO - ${allBlocks.length} bloques totales`)

  if (allBlocks.length === 0) {
    console.warn(`[Textract/FORMS-Async] ⚠ Advertencia: No se extrajeron bloques del documento`)
  }

  const parsed = parseFormsResponse(allBlocks)
  console.log(`[Textract/FORMS-Async] ✓ Parseado exitosamente`)
  return parsed
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
  console.log(`\n[Textract/Parse] ▶ INICIANDO parseFormsResponse()`)
  console.log(`[Textract/Parse] Bloques totales a procesar: ${blocks.length}`)

  const blockMap = {}
  for (const b of blocks) blockMap[b.Id] = b

  // Extract raw key-value pairs
  const rawPairs = {}
  const unmappedKeys = []

  let keyValueCount = 0
  for (const b of blocks) {
    if (b.BlockType !== 'KEY_VALUE_SET') continue
    if (!b.EntityTypes || b.EntityTypes[0] !== 'KEY') continue

    keyValueCount++

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
    const valueTrimmed = valueText.trim()

    if (fieldName && valueTrimmed) {
      rawPairs[fieldName] = valueTrimmed
      console.log(`[Textract/Parse]   ✓ Mapeado: "${normKey}" → "${fieldName}" = "${valueTrimmed}"`)
    } else if (!fieldName) {
      unmappedKeys.push({ raw: normKey, value: valueTrimmed })
      console.log(`[Textract/Parse]   ⚠ No mapeado: "${normKey}" = "${valueTrimmed}"`)
    } else {
      console.log(`[Textract/Parse]   ⚠ Vacío: "${normKey}" (no tiene valor)`)
    }
  }

  console.log(`[Textract/Parse] ✓ Procesados ${keyValueCount} pares KEY_VALUE_SET`)
  console.log(`[Textract/Parse] ✓ ${Object.keys(rawPairs).length} campos mapeados, ${unmappedKeys.length} sin mapear`)

  if (unmappedKeys.length > 0) {
    console.log(`[Textract/Parse] Claves NO MAPEADAS:`)
    unmappedKeys.forEach(item => {
      console.log(`[Textract/Parse]   - "${item.raw}" = "${item.value}"`)
    })
  }

  console.log(`[Textract/Parse] Pares mapeados:`, JSON.stringify(rawPairs, null, 2))

  // ── Build empresa-compatible object ──
  // Persona moral: uses "Denominación/Razón Social" directly
  // Persona física: combines nombre + apellidos
  let razonSocial = rawPairs.razon_social || null
  if (!razonSocial) {
    const nombreParts = [rawPairs.nombre, rawPairs.primer_apellido, rawPairs.segundo_apellido]
      .filter(Boolean)
    razonSocial = nombreParts.length > 0 ? nombreParts.join(' ') : null
    if (razonSocial) {
      console.log(`[Textract/Parse] Razón social construida desde nombre/apellidos: "${razonSocial}"`)
    }
  }

  // Build domicilio fiscal from address parts
  const domicilioParts = [
    rawPairs.tipo_vialidad,
    rawPairs.vialidad,
    rawPairs.numero_exterior ? `#${rawPairs.numero_exterior}` : null,
    rawPairs.numero_interior ? `Int. ${rawPairs.numero_interior}` : null,
    rawPairs.colonia ? `Col. ${rawPairs.colonia}` : null,
  ].filter(Boolean)
  const domicilioFiscal = domicilioParts.length > 0 ? domicilioParts.join(' ') : null
  if (domicilioFiscal) {
    console.log(`[Textract/Parse] Domicilio fiscal construido: "${domicilioFiscal}"`)
  }

  const result = {
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

  console.log(`[Textract/Parse] ✓ Objeto final construido:`, JSON.stringify(result, null, 2))
  return result
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

module.exports = {
  analyzeDocumentForms,
  analyzeDocumentQueries,
  parseFormsResponse,
  parseTextractQueriesResponse,
}
