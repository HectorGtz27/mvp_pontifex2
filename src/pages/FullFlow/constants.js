// FullFlow shared constants

export const GRADE_COLORS = {
  A: 'bg-emerald-100 text-emerald-800',
  B: 'bg-sky-100 text-sky-800',
  C: 'bg-amber-100 text-amber-800',
  D: 'bg-red-100 text-red-800',
}

export const BANCOS_MX = [
  'BBVA', 'Citibanamex', 'Santander', 'Banorte', 'HSBC',
  'Scotiabank', 'Bajío', 'Inbursa', 'Afirme', 'Mifel', 'Otro',
]

/** Genera los últimos 12 meses en formato YYYY-MM (del más antiguo al más reciente) */
export function getLast12Months() {
  const now = new Date()
  return Array.from({ length: 12 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })
}

export const MESES_CORTOS = ['Ene','Feb','Mar','Abr','May','Jun','Jul','Ago','Sep','Oct','Nov','Dic']

export const STEPS = [
  { id: 0, label: 'Datos de la solicitud', short: 'Datos' },
  { id: 1, label: 'Documentos', short: 'Documentos' },
  { id: 2, label: 'Evaluación y decisión', short: 'Decisión' },
]

export const INITIAL_FORM = {
  // ── Cliente (empresa) ──
  razonSocial: '',
  nombreComercial: '',
  telefono: '',
  celular: '',
  correoElectronico: '',
  paginaWeb: '',
  numEmpleadosPermanentes: '',
  numEmpleadosEventuales: '',
  // ── Solicitud ──
  monto: '',
  divisa: 'MXN',
  plazoDeseado: '',
  destino: '',
  tasaObjetivo: '',
  tipoColateral: '',
  nivelVentasAnuales: '',
  margenRealUtilidad: '',
  situacionBuroCredito: '',
  notas: '',
}

export const CHART_COLORS = ['#237a49', '#2d9d6b', '#54b57d', '#8bd1a8']

export const FS_TYPE_IDS = ['edos_financieros_anio1', 'edos_financieros_anio2', 'edo_financiero_parcial']
export const FS_LABELS   = ['Antepenúltimo ejercicio', 'Penúltimo ejercicio', 'Ejercicio en curso']
export const FS_LABELS_SHORT = ['Año 1', 'Año 2', 'Año 3']
