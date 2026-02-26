// Mock data for Pontifex mockup

export const DOCUMENT_TYPES = [
  { id: 'curriculum', label: 'Curriculum de la empresa', required: true },
  { id: 'cv_directivos', label: 'CV de Principales Directivos y Socios', required: true },
  { id: 'acta', label: 'Acta Constitutiva', required: true },
  { id: 'poderes', label: 'Poderes y Asambleas', required: true },
  { id: 'estados_financieros', label: 'Estados Financieros (últimos 3 años)', required: true },
  { id: 'declaraciones', label: 'Declaraciones (últimos 3 años)', required: true },
  { id: 'estados_cuenta', label: 'Estados de Cuenta Bancarios (12 meses)', required: true },
  { id: 'proyecciones', label: 'Proyecciones financieras del proyecto', required: true },
  { id: 'situacion_fiscal', label: 'Constancia de Situación Fiscal', required: true },
]

export const MOCK_EXTRACTION_RESULT = {
  documentType: 'estados_financieros',
  fileName: 'Estados_Financieros_2024.pdf',
  status: 'validated', // pending | validated | needs_review
  confidence: 0.92,
  extractedFields: [
    { name: 'Total Activo', value: '4,250,000 MXN', source: 'Balance', valid: true },
    { name: 'Total Activo Circulante', value: '1,800,000 MXN', source: 'Balance', valid: true },
    { name: 'Total Pasivo', value: '1,200,000 MXN', source: 'Balance', valid: true },
    { name: 'Capital Contable', value: '3,050,000 MXN', source: 'Balance', valid: true },
    { name: 'Venta Neta', value: '2,100,000 MXN', source: 'Estado de Resultados', valid: true },
    { name: 'Utilidad Neta', value: '185,000 MXN', source: 'Estado de Resultados', valid: true },
    { name: 'EBIT', value: '220,000 MXN', source: 'Estado de Resultados', valid: true },
  ],
  validationAlerts: [],
  suggestedType: 'estados_financieros',
}

export const MOCK_APPLICATION = {
  id: 'SOL-2026-0042',
  applicant: 'OSC Desarrollo Verde A.C.',
  requestedAmount: 850000,
  termMonths: 24,
  purpose: 'Capital de trabajo y equipo',
  submittedAt: '2026-02-20',
  documentsStatus: { total: 9, uploaded: 9, validated: 8, pendingReview: 1 },
}

export const MOCK_SCORE = {
  grade: 'B', // A | B | C | D
  gradeLabel: 'Riesgo Medio',
  scoreBreakdown: [
    { name: 'Liquidez', weight: 45, score: 72, max: 100, status: 'ok' },
    { name: 'Rentabilidad', weight: 35, score: 68, max: 100, status: 'ok' },
    { name: 'Buró de Crédito', weight: 15, score: 65, max: 100, status: 'warning' },
    { name: 'ESG', weight: 5, score: 80, max: 100, status: 'ok' },
  ],
  composite: 70,
  bureauScore: 645,
  bureauBand: 'Naranja (587-667)',
}

export const MOCK_KPIS = [
  { name: 'Razón Circulante', value: 1.85, benchmark: '> 1.2', status: 'ok' },
  { name: 'DSCR', value: 1.35, benchmark: '> 1.2', status: 'ok' },
  { name: 'Deuda/EBIT', value: 3.2, benchmark: '< 4', status: 'ok' },
  { name: 'ROE', value: 0.062, format: 'percent', benchmark: '> 5%', status: 'ok' },
  { name: 'Margen Neto', value: 0.088, format: 'percent', benchmark: '> 5%', status: 'ok' },
]

export const MOCK_RECOMMENDATION = {
  action: 'approve_conditional', // approve | approve_conditional | reject
  suggestedAmount: 800000,
  suggestedTermMonths: 24,
  suggestedRate: '18% anual',
  conditions: [
    'Mantener DSCR mínimo 1.2 durante la vida del crédito.',
    'Presentar estados financieros trimestrales.',
    'Garantía: hipoteca sobre activo valorado en 1.2M.',
  ],
  analystNotes: 'Rentabilidad y liquidez sólidas. Buró en rango naranja; recomiendo aprobación con monitoreo trimestral.',
}

export const MOCK_CREDITS = [
  {
    id: 'CR-001',
    applicant: 'OSC Desarrollo Verde A.C.',
    amount: 800000,
    disbursedAt: '2025-11-15',
    termMonths: 24,
    balance: 620000,
    gradeAtDisbursement: 'B',
    covenants: [
      { name: 'DSCR', current: 1.28, threshold: 1.2, status: 'yellow', trigger: 'DSCR < 1.2 → alerta' },
      { name: 'Deuda/EBIT', current: 3.8, threshold: 4, status: 'green', trigger: '> 4 → alerta roja' },
      { name: 'Capital de trabajo', current: 120000, status: 'green', trigger: 'Negativo → bloqueo' },
      { name: 'Mora Buró', current: 0, status: 'green', trigger: '> 30 días → revisión' },
    ],
    alerts: [{ type: 'yellow', text: 'DSCR cercano al mínimo (1.28). Revisar en próximo trimestre.' }],
  },
  {
    id: 'CR-002',
    applicant: 'Fundación Comunidad Sostenible',
    amount: 500000,
    disbursedAt: '2025-09-01',
    termMonths: 18,
    balance: 380000,
    gradeAtDisbursement: 'A',
    covenants: [
      { name: 'DSCR', current: 1.52, threshold: 1.2, status: 'green', trigger: 'DSCR < 1.2 → alerta' },
      { name: 'Deuda/EBIT', current: 2.1, threshold: 4, status: 'green', trigger: '> 4 → alerta roja' },
      { name: 'Capital de trabajo', current: 95000, status: 'green', trigger: 'Negativo → bloqueo' },
      { name: 'Mora Buró', current: 0, status: 'green', trigger: '> 30 días → revisión' },
    ],
    alerts: [],
  },
  {
    id: 'CR-003',
    applicant: 'Asociación Emprendedores Locales',
    amount: 350000,
    disbursedAt: '2025-06-10',
    termMonths: 12,
    balance: 140000,
    gradeAtDisbursement: 'B',
    covenants: [
      { name: 'DSCR', current: 1.05, threshold: 1.2, status: 'red', trigger: 'DSCR < 1.2 → alerta' },
      { name: 'Deuda/EBIT', current: 4.2, threshold: 4, status: 'red', trigger: '> 4 → alerta roja' },
      { name: 'Capital de trabajo', current: -15000, status: 'red', trigger: 'Negativo → bloqueo' },
      { name: 'Mora Buró', current: 0, status: 'green', trigger: '> 30 días → revisión' },
    ],
    alerts: [
      { type: 'red', text: 'DSCR por debajo del covenant (1.05). Trigger de revisión manual.' },
      { type: 'red', text: 'Deuda/EBIT > 4. Bloqueo automático de desembolsos pendientes.' },
      { type: 'red', text: 'Capital de trabajo negativo. Requiere plan de corrección.' },
    ],
  },
]
