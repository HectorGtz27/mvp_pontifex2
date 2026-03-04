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
 *   - mes:     statement month as "YYYY-MM"
 *   - abonos:  total deposits/credits for the month (number)
 *   - retiros: total withdrawals/debits for the month (number)
 *
 * This works regardless of the bank (BBVA, Santander, Banamex,
 * Banorte, HSBC, Scotiabank, etc.) because Claude identifies the
 * semantics regardless of the exact label used.
 *
 * @param {string} rawText - Plain text extracted by Textract from the PDF/image
 * @param {string} [banco]  - Optional bank name hint (e.g. "BBVA"), helps accuracy
 * @returns {Promise<{ mes: string|null, abonos: number|null, retiros: number|null, rawResponse: string }>}
 */
async function extractBankStatementData(rawText, banco = null) {
  console.log(`[Bedrock] Analizando estado de cuenta${banco ? ` (${banco})` : ''}...`)
  console.log(`[Bedrock] Texto recibido: ${rawText.length} caracteres`)

  const bancoHint = banco
    ? `El documento fue emitido por ${banco}.`
    : 'El banco emisor es desconocido; determínalo del texto si es posible.'

  const prompt = `Eres un experto en análisis de estados de cuenta bancarios mexicanos.
${bancoHint}

Analiza el siguiente texto extraído de un estado de cuenta bancario y extrae EXACTAMENTE:
1. El mes y año del estado de cuenta (formato YYYY-MM)
2. El total de ABONOS o DEPÓSITOS del mes (suma de todos los ingresos/créditos)
3. El total de RETIROS o CARGOS del mes (suma de todos los egresos/débitos)

INSTRUCCIONES IMPORTANTES:
- Los bancos usan vocabulario diferente: "abonos/cargos", "depósitos/retiros", "créditos/débitos"
- Busca los TOTALES del periodo, no transacciones individuales
- Si el documento tiene múltiples meses, usa el mes principal del estado de cuenta
- Los montos son en pesos mexicanos (MXN)
- Ignora comisiones, intereses y saldo si no son parte de los totales solicitados
- Si no puedes determinar un valor con certeza, usa null

Responde ÚNICAMENTE con un objeto JSON válido, sin texto adicional, sin markdown:
{
  "mes": "YYYY-MM or null",
  "abonos": number or null,
  "retiros": number or null,
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
      retiros: null,
      banco_detectado: null,
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
    banco_detectado: parsed.banco_detectado || null,
    confianza:       parsed.confianza || null,
    rawResponse,
  }

  console.log(`[Bedrock] ✅ Extracción exitosa:`, {
    mes: result.mes,
    abonos: result.abonos,
    retiros: result.retiros,
    banco: result.banco_detectado,
    confianza: result.confianza,
  })

  return result
}

module.exports = { extractBankStatementData }
