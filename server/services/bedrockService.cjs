'use strict'

const { BedrockRuntimeClient, ConverseCommand } = require('@aws-sdk/client-bedrock-runtime')
const { awsCredentials } = require('../config/aws.cjs')

// Model used: Claude Haiku 4.5 via Bedrock cross-region inference
// Update this if you switch to a different model
const MODEL_ID = 'us.anthropic.claude-haiku-4-5-20251001-v1:0'

// Cached singleton — avoid re-creating the client on every request
let _client = null
function getClient() {
  if (!_client) {
    _client = new BedrockRuntimeClient(awsCredentials)
  }
  return _client
}

/**
 * Sleep helper for retry logic
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

/**
 * Strips markdown JSON fences (```json ... ```) that Claude sometimes adds.
 */
function cleanJsonFence(raw) {
  return raw.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim()
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

  const client = getClient()

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
  
  const maxRetries = 3
  let lastError = null
  let response = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      response = await client.send(command)
      break // Success, exit retry loop
    } catch (err) {
      lastError = err
      const isThrottling = err.name === 'ThrottlingException' || 
                          err.name === 'TooManyRequestsException' ||
                          err.message?.includes('Too many requests')
      
      if (isThrottling && attempt < maxRetries) {
        const delayMs = Math.min(1000 * Math.pow(2, attempt), 8000) // 1s, 2s, 4s
        console.log(`[Bedrock] ⚠️  Throttled (intento ${attempt + 1}/${maxRetries + 1}), reintentando en ${delayMs}ms...`)
        await sleep(delayMs)
        continue
      }
      
      throw err
    }
  }

  if (!response) throw lastError

  const rawResponse = response.output?.message?.content?.[0]?.text || ''
  console.log(`[Bedrock] Respuesta raw: ${rawResponse}`)

  // Parse the JSON response
  let parsed
  try {
    const cleaned = cleanJsonFence(rawResponse)
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

  const client = getClient()

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
  
  const maxRetries = 3
  let lastError = null
  let response = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      response = await client.send(command)
      break
    } catch (err) {
      lastError = err
      const isThrottling = err.name === 'ThrottlingException' || 
                          err.name === 'TooManyRequestsException' ||
                          err.message?.includes('Too many requests')
      
      if (isThrottling && attempt < maxRetries) {
        const delayMs = Math.min(1000 * Math.pow(2, attempt), 8000)
        console.log(`[Bedrock/CSF] ⚠️  Throttled (intento ${attempt + 1}/${maxRetries + 1}), reintentando en ${delayMs}ms...`)
        await sleep(delayMs)
        continue
      }
      
      throw err
    }
  }

  if (!response) throw lastError

  const rawResponse = response.output?.message?.content?.[0]?.text || ''
  console.log(`[Bedrock/CSF] Respuesta raw: ${rawResponse.substring(0, 500)}...`)

  // Parse the JSON response
  let parsed
  try {
    const cleaned = cleanJsonFence(rawResponse)
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

/**
 * Extracts Balance General + Estado de Resultados for up to 3 fiscal years
 * from a single DOCX/PDF document (~12 pages: 4 pages × 3 years).
 *
 * Returns an object:
 * {
 *   years: [
 *     {
 *       periodo: 'YYYY' | 'YYYY-MM',   // fiscal period label
 *       inventarios, clientes, deudores_diversos, total_activo_circulante,
 *       terrenos_edificios, maquinaria_equipo, equipo_transporte, intangibles, total_activo_fijo,
 *       proveedores, acreedores_diversos, docs_pagar_cp, total_pasivo_circulante,
 *       docs_pagar_lp, otros_pasivos, suma_pasivo_fijo,
 *       capital_social, utilidades_ejercicios_anteriores, suma_capital_contable,
 *       ventas, costos_venta, utilidad_operacion, gastos_operacion, gastos_financieros,
 *       otros_productos, otros_gastos, impuestos, depreciacion
 *     }, ...
 *   ],
 *   confianza: 'alta|media|baja'
 * }
 *
 * @param {string} rawText - Plain text extracted by Textract from the full document
 * @returns {Promise<Object>}
 */
async function extractFinancialStatementsData(rawText) {
  console.log(`[Bedrock/EF] Analizando estados financieros (${rawText.length} caracteres)...`)

  const prompt = `Eres un experto contable mexicano especializado en análisis de estados financieros de empresas.

Se te proporcionará el texto completo de un documento que contiene los Estados Financieros de una empresa. El documento incluye:
1. Balance General (Activo Circulante, Activo Fijo, Otros Activos, Pasivo Circulante, Pasivo Largo Plazo, Capital Contable)
2. Estado de Resultados (Ventas, Costos, Gastos, Utilidades)

TAREA: Extrae los siguientes conceptos numéricos del período más reciente (en la divisa del documento, sin símbolo, solo número o null):

Balance General — Activo:
- inventarios
- clientes (cuentas por cobrar a clientes)
- deudores_diversos
- total_activo_circulante (Total Activo Circulante / Suma del Activo Circulante)
- terrenos_edificios (Terrenos y Edificios)
- maquinaria_equipo (Maquinaria y Equipo)
- equipo_transporte (Equipo de Transporte)
- intangibles (Intangibles / registro de marca)
- total_activo_fijo (Total Activo Fijo / Suma del Activo Fijo)
- suma_activo (Suma del Activo / Total Activo / Activo Total)

Balance General — Pasivo:
- proveedores
- acreedores_diversos (Acreedores Div.)
- docs_pagar_cp (Documentos por pagar a corto plazo, CP)
- total_pasivo_circulante (Total Pasivo Circulante / Suma del Pasivo Circulante / Pasivo Circulante)
- docs_pagar_lp (Documentos por pagar a largo plazo, LP)
- otros_pasivos
- suma_pasivo_fijo (Suma del Pasivo Fijo / Total Pasivo Fijo / Pasivo a Largo Plazo)

Balance General — Capital:
- capital_social
- utilidades_ejercicios_anteriores (Utilidades de Ejercicios Anteriores / Ut. Ejercicios anteriores)
- suma_capital_contable (Suma del Capital Contable / Total Capital Contable / Total Capital)

Estado de Resultados:
- ventas (ingresos totales / ventas netas)
- costos_venta (Costos de Venta / Costo de lo Vendido)
- utilidad_operacion (Utilidad de Operación / Utilidad Operativa / Resultado de Operación. Es la ganancia antes de gastos financieros e impuestos)
- gastos_operacion (Gastos de Operación / Gastos Operativos)
- gastos_financieros (Gastos Financieros / Gastos Fin.)
- otros_productos (Otros Productos / Otros ingresos)
- otros_gastos (Otros Gastos)
- impuestos (ISR / Impuestos / Impuesto sobre la renta)
- depreciacion (Depreciación / Amortización)
- resultado_ejercicio (VALOR ABSOLUTO de la Utilidad Neta / Resultado del Ejercicio en pesos/dólares. Extraer DIRECTAMENTE el MONTO en $, NO el porcentaje. Si ves columnas con "%" ignóralas y usa la columna de SALDOS/VALORES ABSOLUTOS)
- resultado_ejercicio_pct (PORCENTAJE de margen neto / % del Resultado del Ejercicio sobre ventas. Si muestra "14.2%" extraer 14.2, si muestra "0.142" o decimal pequeño multiplicar por 100. Si hay columna separada de "%" usa ese valor)

INSTRUCCIONES CRÍTICAS:
- resultado_ejercicio: Debe ser el MONTO EN DINERO (miles o millones de pesos/dólares), NO el porcentaje. Busca la columna de valores absolutos, NO la de %
- resultado_ejercicio_pct: Debe ser el PORCENTAJE como número decimal (ej: si dice "12.9%" guarda 12.9)
- Si el documento muestra múltiples años, usa el más reciente
- Identifica el período por el encabezado de columna (ej: "31/12/2019", "2020", "Dic 2021", etc.)
- Para el campo "periodo": usa el año en formato "YYYY" o "YYYY-MM" si incluye mes/año
- Los montos deben ser números sin comas, sin signos, sin texto (solo el valor numérico)
- Si el concepto no aparece o no puedes determinarlo, usa null

Responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional, sin markdown:
{
  "tipo": "estados_financieros",
  "periodo": "YYYY o YYYY-MM",
  "confianza": "alta|media|baja",
  "balance_general": {
    "inventarios": number_or_null,
    "clientes": number_or_null,
    "deudores_diversos": number_or_null,
    "total_activo_circulante": number_or_null,
    "terrenos_edificios": number_or_null,
    "maquinaria_equipo": number_or_null,
    "equipo_transporte": number_or_null,
    "intangibles": number_or_null,
    "total_activo_fijo": number_or_null,
    "suma_activo": number_or_null,
    "proveedores": number_or_null,
    "acreedores_diversos": number_or_null,
    "docs_pagar_cp": number_or_null,
    "total_pasivo_circulante": number_or_null,
    "docs_pagar_lp": number_or_null,
    "otros_pasivos": number_or_null,
    "suma_pasivo_fijo": number_or_null,
    "capital_social": number_or_null,
    "utilidades_ejercicios_anteriores": number_or_null,
    "suma_capital_contable": number_or_null
  },
  "estado_resultados": {
    "ventas": number_or_null,
    "costos_venta": number_or_null,
    "utilidad_operacion": number_or_null,
    "gastos_operacion": number_or_null,
    "gastos_financieros": number_or_null,
    "otros_productos": number_or_null,
    "otros_gastos": number_or_null,
    "impuestos": number_or_null,
    "depreciacion": number_or_null,
    "resultado_ejercicio": number_or_null,
    "resultado_ejercicio_pct": number_or_null
  }
}

TEXTO DEL DOCUMENTO DE ESTADOS FINANCIEROS:
---
${rawText.substring(0, 50000)}
---`

  const client = getClient()

  const command = new ConverseCommand({
    modelId: MODEL_ID,
    messages: [
      {
        role: 'user',
        content: [{ text: prompt }],
      },
    ],
    inferenceConfig: {
      maxTokens: 2048,
      temperature: 0,
    },
  })

  console.log('[Bedrock/EF] Enviando a Claude via Converse API...')
  
  const maxRetries = 3
  let lastError = null
  let response = null

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      response = await client.send(command)
      break
    } catch (err) {
      lastError = err
      const isThrottling = err.name === 'ThrottlingException' || 
                          err.name === 'TooManyRequestsException' ||
                          err.message?.includes('Too many requests')
      
      if (isThrottling && attempt < maxRetries) {
        const delayMs = Math.min(1000 * Math.pow(2, attempt), 8000)
        console.log(`[Bedrock/EF] ⚠️  Throttled (intento ${attempt + 1}/${maxRetries + 1}), reintentando en ${delayMs}ms...`)
        await sleep(delayMs)
        continue
      }
      
      throw err
    }
  }

  if (!response) throw lastError

  const rawResponse = response.output?.message?.content?.[0]?.text || ''
  console.log(`[Bedrock/EF] Respuesta raw (primeros 800 chars): ${rawResponse.substring(0, 800)}`)

  let parsed
  try {
    const cleaned = cleanJsonFence(rawResponse)
    parsed = JSON.parse(cleaned)
  } catch (parseErr) {
    console.error('[Bedrock/EF] Error parseando JSON de Claude:', parseErr.message)
    return {
      tipo: null,
      periodo: null,
      balance_general: null,
      estado_resultados: null,
      confianza: null,
      parseError: `No se pudo parsear la respuesta: ${parseErr.message}`,
      rawResponse,
    }
  }

  console.log(`[Bedrock/EF] ✅ Extraído periodo: ${parsed.periodo}`)

  return {
    tipo: parsed.tipo || 'estados_financieros',
    periodo: parsed.periodo || null,
    balance_general: parsed.balance_general || {},
    estado_resultados: parsed.estado_resultados || {},
    confianza: parsed.confianza || null,
    rawResponse,
  }
}

// AGREGAR al final de bedrockService.cjs, antes del module.exports

/**
 * Interpreta la pregunta del usuario y devuelve intención estructurada
 */
async function interpretQuestion(question) {
  const client = getClient()
  const command = new ConverseCommand({
    modelId: MODEL_ID,
    messages: [{
      role: 'user',
      content: [{ text: `Clasifica esta pregunta de un analista de crédito en JSON.
      
Pregunta: "${question}"

Reglas de clasificación:
- Si pregunta por movimientos bancarios, abonos, retiros, saldo, BBVA, Banamex, Citibanamex, estados de cuenta, ingresos bancarios → entity: "estados_cuenta"
- Si pregunta por activo, pasivo, capital, balance, inventarios, ventas, costos, utilidad, EBITDA, estado de resultados → entity: "estados_financieros"
- Si pregunta por DSCR, ROE, liquidez, rentabilidad, scoring, KPIs, indicadores → entity: "kpis"
- Si pregunta por solicitudes, créditos, montos, plazos → entity: "solicitudes"
- Si pregunta por clientes, empresas, RFC → entity: "clientes"
- Si pregunta por instituciones bancarias disponibles → entity: "bancos"
- Si pregunta por archivos, documentos, PDFs → entity: "documentos"
- Si es general → entity: "general"

Responde SOLO con JSON válido:
{
  "entity": "clientes|solicitudes|bancos|documentos|kpis|creditos|estados_financieros|estados_cuenta|general",
  "action": "listar|buscar|detalle|calcular|general",
  "needsChart": true or false,
  "chartType": "bar|pie|line|null",
  "filters": {}
}` }]
    }],
    inferenceConfig: { maxTokens: 200, temperature: 0 }
  })

  const response = await client.send(command)
  const raw = response.output?.message?.content?.[0]?.text || ''
  return JSON.parse(cleanJsonFence(raw))
}

/**
 * Genera respuesta conversacional con contexto de datos
 */
async function generateChatResponse(question, context, history = [], needsChart = false) {
  const client = getClient()

  const systemPrompt = `Eres un asistente especializado en análisis crediticio y financiero.
Tienes acceso a datos reales de la plataforma. Responde siempre en español, 
de forma clara y profesional. No inventes datos financieros ni scores.

${needsChart ? `
IMPORTANTE: El usuario pidió una gráfica. Responde ÚNICAMENTE con un JSON válido:
{
  "text": "explicación breve en texto plano",
  "chart": {
    "type": "bar|pie|line",
    "title": "título de la gráfica",
    "data": [
      { "name": "etiqueta", "value": número },
      ...
    ]
  }
}
Los datos del chart deben venir de los datos disponibles proporcionados.
` : 'Responde en texto plano y conversacional, sin markdown, sin asteriscos, sin símbolos #.'}`

  const messages = [
    ...history.slice(-6),
    {
      role: 'user',
      content: [{ text: context 
        ? `Datos disponibles:\n${JSON.stringify(context, null, 2)}\n\nPregunta: ${question}`
        : `Pregunta: ${question}`
      }]
    }
  ]

  const command = new ConverseCommand({
    modelId: MODEL_ID,
    system: [{ text: systemPrompt }],
    messages,
    inferenceConfig: { maxTokens: 1024, temperature: 0.3 }
  })

  const response = await client.send(command)
  const raw = response.output?.message?.content?.[0]?.text || ''

  // Si esperamos gráfica, intentar parsear JSON
  if (needsChart) {
    try {
      return JSON.parse(cleanJsonFence(raw))
    } catch {
      return { text: raw, chart: null }
    }
  }

  return raw
}


module.exports = { 
  extractBankStatementData, 
  extractCSFData, 
  extractFinancialStatementsData,
  interpretQuestion,
  generateChatResponse
}