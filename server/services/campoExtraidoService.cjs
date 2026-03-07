'use strict'

const prisma = require('../prisma.cjs')
const { BG_FIELDS, ER_FIELDS, CONFIANZA_MAP } = require('../config/ocrFields.cjs')

// ═════════════════════════════════════════════════════════════
//  campoExtraidoService
//  Parsea el JSON crudo de extracted_data de un Documento y crea
//  filas normalizadas en la tabla campos_extraidos.
//
//  Tipos soportados:
//    · constancia_situacion_fiscal  → Textract FORMS
//    · edos_cuenta_bancarios        → Textract TEXT + Bedrock Claude
//    · estado_cuenta_bancario       → alias del anterior
// ═════════════════════════════════════════════════════════════

/**
 * Normaliza el valor de confianza a escala 0-1.
 * Admite:
 *   - string: "alta" | "media" | "baja"  → 0.90 / 0.70 / 0.50
 *   - number 0-100 (Textract)            → dividido por 100
 *   - number 0-1                         → directo
 */
function normalizeConfianza(raw) {
  if (typeof raw === 'string') return CONFIANZA_MAP[raw] ?? 0.70
  if (typeof raw === 'number') return raw > 1 ? raw / 100 : raw
  return 0.70
}

// ─── Parser: Constancia de Situación Fiscal ──────────────────
/**
 * extracted_data viene de parseFormsResponse (textractService):
 * {
 *   razon_social, nombre_comercial, rfc,
 *   domicilio_fiscal, ciudad, estado,
 *   _extra: { curp, estatus_padron, fecha_inicio_operaciones,
 *             lugar_fecha_emision, id_cif, entre_calle }
 * }
 */
function parseCSF(data) {
  if (!data || typeof data !== 'object') return []

  const campos = []
  const seccion = 'datos_fiscales'
  const fuente  = 'textract_forms'

  // Campos principales
  const mainFields = [
    ['Razón Social',              'razon_social'],
    ['Nombre Comercial',          'nombre_comercial'],
    ['RFC',                       'rfc'],
    ['Domicilio Fiscal',          'domicilio_fiscal'],
    ['Ciudad',                    'ciudad'],
    ['Estado',                    'estado'],
  ]
  for (const [label, key] of mainFields) {
    const valor = data[key]
    if (valor) {
      campos.push({
        seccion,
        campo:     label,
        valor:     String(valor),
        periodo:   null,
        fuente,
        confianza: 0.90,
        estado:    'procesado',
      })
    }
  }

  // Campos extra del CSF
  const extra = data._extra || {}
  const extraFields = [
    ['CURP',                     'curp'],
    ['Estatus en el Padrón',     'estatus_padron'],
    ['Fecha Inicio Operaciones', 'fecha_inicio_operaciones'],
    ['Lugar y Fecha de Emisión', 'lugar_fecha_emision'],
    ['ID CIF',                   'id_cif'],
    ['Entre Calle',              'entre_calle'],
  ]
  for (const [label, key] of extraFields) {
    const valor = extra[key]
    if (valor) {
      campos.push({
        seccion,
        campo:     label,
        valor:     String(valor),
        periodo:   null,
        fuente,
        confianza: 0.88,
        estado:    'procesado',
      })
    }
  }

  return campos
}

// ─── Parser: Estado de Cuenta Bancario ───────────────────────
/**
 * extracted_data viene de extractBankStatementData (bedrockService):
 * {
 *   tipo: 'estado_cuenta_bancario',
 *   mes,          // "YYYY-MM" | null
 *   abonos,       // number | null
 *   retiros,      // number | null
 *   banco_detectado,
 *   confianza,    // "alta" | "media" | "baja"
 * }
 */
function parseBankStatement(data) {
  if (!data || typeof data !== 'object') return []

  const campos    = []
  const seccion   = 'estado_cuenta'
  const fuente    = 'bedrock_claude'
  const confianza = normalizeConfianza(data.confianza)
  const periodo   = data.mes || null

  if (data.banco_detectado) {
    campos.push({ seccion, campo: 'Banco',         valor: String(data.banco_detectado), periodo, fuente, confianza, estado: 'procesado' })
  }
  if (data.mes) {
    campos.push({ seccion, campo: 'Período',       valor: String(data.mes),     periodo, fuente, confianza, estado: 'procesado' })
  }
  if (data.abonos !== null && data.abonos !== undefined) {
    campos.push({ seccion, campo: 'Total Abonos',  valor: String(data.abonos),  periodo, fuente, confianza, estado: 'procesado' })
  }
  if (data.retiros !== null && data.retiros !== undefined) {
    campos.push({ seccion, campo: 'Total Retiros', valor: String(data.retiros), periodo, fuente, confianza, estado: 'procesado' })
  }

  return campos
}

// ─── Parser: Estados Financieros (Balance General + Estado de Resultados) ────
/**
 * extracted_data viene de extractFinancialStatementsData (bedrockService):
 * {
 *   tipo: 'estados_financieros',
 *   periodo: 'YYYY' | 'YYYY-MM',
 *   confianza: 'alta|media|baja',
 *   balance_general: { inventarios, clientes, ... },
 *   estado_resultados: { ventas, costos_venta, ... }
 * }
 */
function parseEstadosFinancieros(data) {
  if (!data || typeof data !== 'object') return []

  const campos    = []
  const confianza = normalizeConfianza(data.confianza || 'media')
  const periodo   = data.periodo || null
  const fuente    = 'bedrock_claude'

  const bg = data.balance_general || {}
  for (const { key, label } of BG_FIELDS) {
    const val = bg[key]
    if (val !== null && val !== undefined) {
      campos.push({ seccion: 'balance_general', campo: label, valor: String(val), periodo, fuente, confianza, estado: 'procesado' })
    }
  }

  const er = data.estado_resultados || {}
  for (const { key, label } of ER_FIELDS) {
    const val = er[key]
    if (val !== null && val !== undefined) {
      campos.push({ seccion: 'estado_resultados', campo: label, valor: String(val), periodo, fuente, confianza, estado: 'procesado' })
    }
  }

  return campos
}

// ─── Dispatcher central ──────────────────────────────────────
const PARSERS = {
  constancia_situacion_fiscal: parseCSF,
  edos_cuenta_bancarios:       parseBankStatement,
  estado_cuenta_bancario:      parseBankStatement,
  edos_financieros_anio1:      parseEstadosFinancieros,
  edos_financieros_anio2:      parseEstadosFinancieros,
  edo_financiero_parcial:      parseEstadosFinancieros,
}

/**
 * Parsea el extracted_data de un documento y crea/reemplaza sus
 * filas en campos_extraidos.
 *
 * Es idempotente: si se llama dos veces para el mismo documento,
 * primero borra los campos anteriores y luego inserta los nuevos.
 *
 * @param {Object} documento - Registro Prisma del Documento (incluye extracted_data)
 * @returns {Promise<number>} Número de filas insertadas
 */
async function processDocumentoCampos(documento) {
  const {
    id:               documentoId,
    solicitud_id:     solicitudId,
    tipo_documento_id: tipo,
    extracted_data:   data,
  } = documento

  if (!data || !solicitudId) {
    console.log(`[CampoExtraido] Sin datos o sin solicitud_id — doc: ${documentoId}`)
    return 0
  }

  const parser = PARSERS[tipo]
  if (!parser) {
    console.log(`[CampoExtraido] Tipo "${tipo}" sin parser configurado — doc: ${documentoId}`)
    return 0
  }

  const filas = parser(data)

  if (filas.length === 0) {
    console.log(`[CampoExtraido] Parser no generó campos — doc: ${documentoId}`)
    return 0
  }

  // Eliminar campos previos del mismo documento (re-procesamiento idempotente)
  await prisma.campoExtraido.deleteMany({ where: { documento_id: documentoId } })

  // Insertar todos los campos en una sola operación
  await prisma.campoExtraido.createMany({
    data: filas.map(fila => ({
      solicitud_id: solicitudId,
      documento_id: documentoId,
      ...fila,
    })),
  })

  // Marcar el documento como procesado
  await prisma.documento.update({
    where: { id: documentoId },
    data:  { estado: 'procesado' },
  })

  console.log(`[CampoExtraido] ✅ ${filas.length} campos insertados — doc: ${documentoId} (${tipo})`)
  return filas.length
}

module.exports = { processDocumentoCampos }
