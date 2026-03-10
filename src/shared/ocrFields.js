// ═══════════════════════════════════════════════════════════════
//  Shared OCR / Financial field definitions.
//
//  Single source of truth used by:
//    · server/services/campoExtraidoService.cjs  — parsing extracted data
//    · src/utils/masterClientXlsx.js             — writing Excel cells
//    · src/pages/FullFlow.jsx                    — rendering in the UI
//
//  Each entry: { key, label }
//    key   = JSON field name coming from Bedrock extraction
//    label = Human-readable label shown in UI / stored in campos_extraidos
// ═══════════════════════════════════════════════════════════════

/** Balance General fields */
export const BG_FIELDS = [
  { key: 'inventarios',                    label: 'Inventarios' },
  { key: 'clientes',                       label: 'Clientes' },
  { key: 'deudores_diversos',              label: 'Deudores Diversos' },
  { key: 'total_activo_circulante',        label: 'Total Activo Circulante' },
  { key: 'terrenos_edificios',             label: 'Terrenos y Edificios' },
  { key: 'maquinaria_equipo',              label: 'Maquinaria y Equipo' },
  { key: 'equipo_transporte',              label: 'Equipo de Transporte' },
  { key: 'intangibles',                    label: 'Intangibles' },
  { key: 'total_activo_fijo',              label: 'Total Activo Fijo' },
  { key: 'proveedores',                    label: 'Proveedores' },
  { key: 'acreedores_diversos',            label: 'Acreedores Diversos' },
  { key: 'docs_pagar_cp',                  label: 'Documentos por Pagar CP' },
  { key: 'total_pasivo_circulante',        label: 'Total Pasivo Circulante' },
  { key: 'docs_pagar_lp',                  label: 'Documentos por Pagar LP' },
  { key: 'otros_pasivos',                  label: 'Otros Pasivos' },
  { key: 'suma_pasivo_fijo',               label: 'Suma Pasivo Fijo' },
  { key: 'capital_social',                 label: 'Capital Social' },
  { key: 'utilidades_ejercicios_anteriores', label: 'Utilidades Ejercicios Anteriores' },
]

/** Estado de Resultados fields */
export const ER_FIELDS = [
  { key: 'ventas',              label: 'Ventas' },
  { key: 'costos_venta',       label: 'Costos de Venta' },
  { key: 'gastos_operacion',   label: 'Gastos de Operación' },
  { key: 'gastos_financieros', label: 'Gastos Financieros' },
  { key: 'otros_productos',    label: 'Otros Productos' },
  { key: 'otros_gastos',       label: 'Otros Gastos' },
  { key: 'impuestos',          label: 'Impuestos' },
  { key: 'depreciacion',       label: 'Depreciación' },
  { key: 'resultado_ejercicio', label: 'Resultado del Ejercicio' },
]

/**
 * Excel row mapping for masterClientXlsx.
 * key → row number in the "Estados Financieros" sheet.
 * Extends BG_FIELDS with 'suma_capital_contable' which only appears in Excel.
 */
export const BG_EXCEL_MAP = [
  ['total_activo_circulante',          10],
  ['inventarios',                      11],
  ['clientes',                         12],
  ['deudores_diversos',                13],
  ['total_activo_fijo',                14],
  ['terrenos_edificios',               15],
  ['maquinaria_equipo',                16],
  ['equipo_transporte',                17],
  ['intangibles',                      19],
  ['total_pasivo_circulante',          21],
  ['proveedores',                      22],
  ['acreedores_diversos',              23],
  ['docs_pagar_cp',                    24],
  ['suma_pasivo_fijo',                 25],
  ['docs_pagar_lp',                    26],
  ['otros_pasivos',                    27],
  ['capital_social',                   29],
  ['utilidades_ejercicios_anteriores', 30],
  ['suma_capital_contable',            31],
]

export const ER_EXCEL_MAP = [
  ['ventas',              34],
  ['costos_venta',        35],
  ['gastos_operacion',    37],
  ['gastos_financieros',  39],
  ['otros_productos',     40],
  ['otros_gastos',        41],
  ['impuestos',           43],
  ['depreciacion',        44],
]

/** Confianza string → decimal 0-1 mapping */
export const CONFIANZA_MAP = { alta: 0.90, media: 0.70, baja: 0.50 }
