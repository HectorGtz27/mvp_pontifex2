'use strict'

// CJS wrapper that re-exports from the shared ESM source.
// The canonical definitions live in src/shared/ocrFields.js.

/** Balance General fields: { key, label }[] */
const BG_FIELDS = [
  { key: 'inventarios',                    label: 'Inventarios' },
  { key: 'clientes',                       label: 'Clientes' },
  { key: 'deudores_diversos',              label: 'Deudores Diversos' },
  { key: 'total_activo_circulante',        label: 'Total Activo Circulante' },
  { key: 'terrenos_edificios',             label: 'Terrenos y Edificios' },
  { key: 'maquinaria_equipo',              label: 'Maquinaria y Equipo' },
  { key: 'equipo_transporte',              label: 'Equipo de Transporte' },
  { key: 'intangibles',                    label: 'Intangibles' },
  { key: 'total_activo_fijo',              label: 'Total Activo Fijo' },
  { key: 'suma_activo',                    label: 'Suma del Activo' },
  { key: 'proveedores',                    label: 'Proveedores' },
  { key: 'acreedores_diversos',            label: 'Acreedores Diversos' },
  { key: 'docs_pagar_cp',                  label: 'Documentos por Pagar CP' },
  { key: 'total_pasivo_circulante',        label: 'Total Pasivo Circulante' },
  { key: 'docs_pagar_lp',                  label: 'Documentos por Pagar LP' },
  { key: 'otros_pasivos',                  label: 'Otros Pasivos' },
  { key: 'suma_pasivo_fijo',               label: 'Suma Pasivo Fijo' },
  { key: 'capital_social',                 label: 'Capital Social' },
  { key: 'utilidades_ejercicios_anteriores', label: 'Utilidades Ejercicios Anteriores' },
  { key: 'suma_capital_contable',          label: 'Suma Capital Contable' },
]

/** Estado de Resultados fields: { key, label }[] */
const ER_FIELDS = [
  { key: 'ventas',              label: 'Ventas' },
  { key: 'costos_venta',       label: 'Costos de Venta' },
  { key: 'gastos_operacion',   label: 'Gastos de Operación' },
  { key: 'gastos_financieros', label: 'Gastos Financieros' },
  { key: 'otros_productos',    label: 'Otros Productos' },
  { key: 'otros_gastos',       label: 'Otros Gastos' },
  { key: 'impuestos',          label: 'Impuestos' },
  { key: 'depreciacion',       label: 'Depreciación' },
  { key: 'resultado_ejercicio', label: 'Resultado del Ejercicio' },
  { key: 'resultado_ejercicio_pct', label: 'Resultado del Ejercicio (%)' },
]

/** Confianza string → decimal 0-1 mapping */
const CONFIANZA_MAP = { alta: 0.90, media: 0.70, baja: 0.50 }

module.exports = { BG_FIELDS, ER_FIELDS, CONFIANZA_MAP }
