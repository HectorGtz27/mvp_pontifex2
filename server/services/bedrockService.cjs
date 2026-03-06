'use strict'

const { BedrockRuntimeClient, ConverseCommand } = require('@aws-sdk/client-bedrock-runtime')

// Model used: Claude Haiku 4.5 via Bedrock cross-region inference
// Update this if you switch to a different model
const MODEL_ID = 'us.anthropic.claude-haiku-4-5-20251001-v1:0'

/**
 * Creates a fresh BedrockRuntimeClient using IAM credentials.
 */
function createClient() {
  return new BedrockRuntimeClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  })
}

/**
 * Analyzes raw text from a bank statement and extracts:
 *   - mes:             statement month as "YYYY-MM"
 *   - abonos:          total deposits/credits for the month (number)
 *   - retiros:         total withdrawals/debits for the month (number)
 *   - saldo_promedio:  average monthly balance (number)
 *   - divisa:          currency "MXN" or "USD"
 *   - banco_detectado: bank name (string)
 *
 * This works regardless of the bank (BBVA, Santander, Banamex,
 * Banorte, HSBC, Scotiabank, etc.) because Claude identifies the
 * semantics regardless of the exact label used.
 *
 * @param {string} rawText - Plain text extracted by Textract from the PDF/image
 * @param {string} [banco]  - Optional bank name hint (e.g. "BBVA"), helps accuracy
 * @returns {Promise<{ mes, abonos, retiros, saldo_promedio, divisa, banco_detectado, confianza, rawResponse }>}
 */
async function extractBankStatementData(rawText, banco = null) {
  console.log(`[Bedrock] Analizando estado de cuenta${banco ? ` (${banco})` : ''}...`)
  console.log(`[Bedrock] Texto recibido: ${rawText.length} caracteres`)

  const bancoHint = banco
    ? `El documento fue emitido por ${banco}.`
    : 'El banco emisor es desconocido; determínalo del texto si es posible.'

  const prompt = `Eres un experto en análisis de estados de cuenta bancarios mexicanos e internacionales.
${bancoHint}

Analiza el siguiente texto extraído de la PRIMERA PÁGINA de un estado de cuenta bancario y extrae EXACTAMENTE:
1. El mes y año del estado de cuenta (formato YYYY-MM)
2. El total de ABONOS o DEPÓSITOS del mes (suma de todos los ingresos/créditos)
3. El total de RETIROS o CARGOS del mes (suma de todos los egresos/débitos)
4. El SALDO PROMEDIO mensual (puede llamarse "saldo promedio", "saldo medio", "average balance", "saldo promedio mensual")
5. La DIVISA de la cuenta ("MXN" para pesos mexicanos, "USD" para dólares, etc.)
6. El nombre del BANCO emisor

INSTRUCCIONES IMPORTANTES:
- Los bancos usan vocabulario diferente: "abonos/cargos", "depósitos/retiros", "créditos/débitos"
- Busca los TOTALES del periodo, no transacciones individuales
- Si el documento tiene múltiples meses, usa el mes principal del estado de cuenta
- Para la divisa: busca símbolos ($, USD, MXN), o el tipo de cuenta ("cuenta en dólares" = USD)
- Si ves montos con "USD" o "Dlls" o "Dólares" → divisa es "USD"
- Si ves montos con "MXN" o "Pesos" o sólo "$" en banco mexicano → divisa es "MXN"
- Si no puedes determinar un valor con certeza, usa null

Responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional, sin markdown:
{
  "mes": "YYYY-MM or null",
  "abonos": number or null,
  "retiros": number or null,
  "saldo_promedio": number or null,
  "divisa": "MXN" or "USD" or null,
  "banco_detectado": "string or null",
  "confianza": "alta|media|baja"
}

TEXTO DEL ESTADO DE CUENTA:
---
${rawText.substring(0, 15000)}
---`

  const client = createClient()

  const command = new ConverseCommand({
    modelId: MODEL_ID,
    messages: [
      {
        role: 'user',
        content: [{ text: prompt }],
      },
    ],
    inferenceConfig: {
      maxTokens: 512,
      temperature: 0,  // deterministic — we want consistent extractions
    },
  })

  console.log('[Bedrock] Enviando a Claude via Converse API...')
  const response = await client.send(command)

  const rawResponse = response.output?.message?.content?.[0]?.text || ''
  console.log(`[Bedrock] Respuesta raw: ${rawResponse}`)

  // Parse the JSON response
  let parsed
  try {
    // Claude sometimes wraps in ```json ... ``` even with instructions — strip it
    const cleaned = rawResponse.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()
    parsed = JSON.parse(cleaned)
  } catch (parseErr) {
    console.error('[Bedrock] Error parseando JSON de Claude:', parseErr.message)
    console.error('[Bedrock] Respuesta recibida:', rawResponse)
    return {
      mes: null,
      abonos: null,
      retiros: null,      saldo_promedio: null,
      divisa: null,      banco_detectado: null,
      confianza: null,
      rawResponse,
      parseError: `No se pudo parsear la respuesta de Claude: ${parseErr.message}`,
    }
  }

  // Normalize values
  const result = {
    mes:             parsed.mes !== 'null' ? (parsed.mes || null) : null,
    abonos:          typeof parsed.abonos === 'number' ? parsed.abonos : null,
    retiros:         typeof parsed.retiros === 'number' ? parsed.retiros : null,
    saldo_promedio:  typeof parsed.saldo_promedio === 'number' ? parsed.saldo_promedio : null,
    divisa:          parsed.divisa || null,
    banco_detectado: parsed.banco_detectado || null,
    confianza:       parsed.confianza || null,
    rawResponse,
  }

  console.log(`[Bedrock] ✅ Extracción exitosa:`, {
    mes: result.mes,
    abonos: result.abonos,
    retiros: result.retiros,
    saldo_promedio: result.saldo_promedio,
    divisa: result.divisa,
    banco: result.banco_detectado,
    confianza: result.confianza,
  })

  return result
}

/**
 * Extracts structured data from a Constancia de Situación Fiscal (CSF).
 * This is a cost-effective alternative to Textract's FORMS analysis:
 *   - Textract FORMS:          ~$0.05 USD per page
 *   - DetectDocumentText:      ~$0.0015 USD per page
 *   - Claude Haiku 4.5:        ~$0.002 USD per extraction
 *   - Total savings:           ~14x cheaper (~$0.0035 vs $0.05)
 *
 * The CSF can be for either:
 *   - Persona Moral (company): Has "Denominación/Razón Social"
 *   - Persona Física (individual): Has "Nombre(s)", "Primer Apellido", "Segundo Apellido"
 *
 * @param {string} rawText - Plain text extracted by Textract from the CSF PDF
 * @returns {Promise<Object>} Empresa-compatible object with CSF fields
 */
async function extractCSFData(rawText) {
  console.log(`[Bedrock/CSF] Analizando Constancia de Situación Fiscal...`)
  console.log(`[Bedrock/CSF] Texto recibido: ${rawText.length} caracteres`)

  const prompt = `Eres un experto en análisis de documentos fiscales mexicanos del SAT.

Analiza el siguiente texto extraído de una Constancia de Situación Fiscal (CSF) emitida por el SAT y extrae EXACTAMENTE los siguientes campos:

**IDENTIFICACIÓN:**
- RFC (13 caracteres para personas morales, 13 para físicas con actividad empresarial)
- CURP (18 caracteres, solo para personas físicas)
- Denominación/Razón Social (para persona moral) O Nombre completo (para persona física)
- Nombre Comercial (si existe)

**DOMICILIO FISCAL:**
- Tipo de Vialidad (ej: "CALLE", "AVENIDA", "BOULEVARD")
- Nombre de Vialidad (nombre de la calle)
- Número Exterior
- Número Interior (si existe)
- Nombre de la Colonia
- Nombre de la Localidad
- Nombre del Municipio o Demarcación Territorial
- Nombre de la Entidad Federativa (estado)
- Entre Calle (si existe)

**INFORMACIÓN ADICIONAL:**
- Fecha de Inicio de Operaciones (formato DD/MM/AAAA)
- Estatus en el Padrón (ej: "ACTIVO")
- Lugar y Fecha de Emisión
- IDCIF (identificador del documento)

INSTRUCCIONES IMPORTANTES:
- Si es persona MORAL: usa "Denominación/Razón Social" para razon_social
- Si es persona FÍSICA: combina "Nombre(s)" + "Primer Apellido" + "Segundo Apellido" para razon_social
- Para domicilio_fiscal: concatena en orden: Localidad, Estado, Colonia, Tipo Vialidad, Vialidad, Número Exterior (separados por comas)
- Para ciudad: usa "Nombre de la Localidad" o "Nombre del Municipio"
- Los campos pueden tener variaciones de etiquetas (ej: "Denominación o Razón Social", "Denominación / Razón Social")
- Si un campo no existe o no puedes determinarlo con certeza, usa null

Responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional, sin markdown:
{
  "razon_social": "string or null",
  "nombre_comercial": "string or null",
  "rfc": "string or null",
  "domicilio_fiscal": "string or null",
  "ciudad": "string or null",
  "estado": "string or null",
  "curp": "string or null",
  "estatus_padron": "string or null",
  "fecha_inicio_operaciones": "string or null",
  "lugar_fecha_emision": "string or null",
  "id_cif": "string or null",
  "entre_calle": "string or null",
  "tipo_vialidad": "string or null",
  "vialidad": "string or null",
  "numero_exterior": "string or null",
  "numero_interior": "string or null",
  "colonia": "string or null",
  "localidad": "string or null",
  "municipio": "string or null",
  "confianza": "alta|media|baja"
}

TEXTO DE LA CONSTANCIA DE SITUACIÓN FISCAL:
---
${rawText.substring(0, 15000)}
---`

  const client = createClient()

  const command = new ConverseCommand({
    modelId: MODEL_ID,
    messages: [
      {
        role: 'user',
        content: [{ text: prompt }],
      },
    ],
    inferenceConfig: {
      maxTokens: 1024,
      temperature: 0,  // deterministic extraction
    },
  })

  console.log('[Bedrock/CSF] Enviando a Claude via Converse API...')
  const response = await client.send(command)

  const rawResponse = response.output?.message?.content?.[0]?.text || ''
  console.log(`[Bedrock/CSF] Respuesta raw: ${rawResponse.substring(0, 500)}...`)

  // Parse the JSON response
  let parsed
  try {
    const cleaned = rawResponse.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()
    parsed = JSON.parse(cleaned)
  } catch (parseErr) {
    console.error('[Bedrock/CSF] Error parseando JSON de Claude:', parseErr.message)
    console.error('[Bedrock/CSF] Respuesta recibida:', rawResponse)
    return {
      razon_social: null,
      nombre_comercial: null,
      rfc: null,
      domicilio_fiscal: null,
      ciudad: null,
      estado: null,
      _extra: {
        curp: null,
        estatus_padron: null,
        fecha_inicio_operaciones: null,
        lugar_fecha_emision: null,
        id_cif: null,
        entre_calle: null,
      },
      parseError: `No se pudo parsear la respuesta de Claude: ${parseErr.message}`,
      rawResponse,
    }
  }

  // Build empresa-compatible object with same structure as parseFormsResponse
  const result = {
    razon_social:       parsed.razon_social || null,
    nombre_comercial:   parsed.nombre_comercial || null,
    rfc:                parsed.rfc || null,
    domicilio_fiscal:   parsed.domicilio_fiscal || null,
    ciudad:             parsed.ciudad || parsed.localidad || parsed.municipio || null,
    estado:             parsed.estado || null,
    telefono:           null,  // CSF doesn't include phone
    correo_electronico: null,  // CSF doesn't include email
    pagina_web:         null,  // CSF doesn't include website
    numero_empleados:   null,  // CSF doesn't include employees
    // Extra CSF fields (not in empresa table but useful for debugging/audit)
    _extra: {
      curp:                     parsed.curp || null,
      estatus_padron:           parsed.estatus_padron || null,
      fecha_inicio_operaciones: parsed.fecha_inicio_operaciones || null,
      lugar_fecha_emision:      parsed.lugar_fecha_emision || null,
      id_cif:                   parsed.id_cif || null,
      entre_calle:              parsed.entre_calle || null,
      tipo_vialidad:            parsed.tipo_vialidad || null,
      vialidad:                 parsed.vialidad || null,
      numero_exterior:          parsed.numero_exterior || null,
      numero_interior:          parsed.numero_interior || null,
      colonia:                  parsed.colonia || null,
      localidad:                parsed.localidad || null,
      municipio:                parsed.municipio || null,
      confianza:                parsed.confianza || null,
    },
    rawResponse,
  }

  console.log(`[Bedrock/CSF] ✅ Extracción exitosa:`, {
    razon_social: result.razon_social,
    rfc: result.rfc,
    estado: result.estado,
    confianza: result._extra.confianza,
  })

  return result
}

module.exports = { extractBankStatementData, extractCSFData }
