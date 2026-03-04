const express = require('express')
const pool = require('./db.cjs')
const prisma = require('./prisma.cjs')

const router = express.Router()

// ─── Document types ────────────────────────────────────────
router.get('/document-types', async (_req, res) => {
  const { rows } = await pool.query('SELECT id, label, required FROM document_types ORDER BY id')
  res.json(rows)
})

// ─── Application ───────────────────────────────────────────
router.get('/applications', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500)
  const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0)
  const q = (req.query.q || '').toString().trim()

  const params = []
  let where = ''
  if (q) {
    params.push(`%${q}%`)
    where = `WHERE applicant ILIKE $${params.length} OR id ILIKE $${params.length}`
  }

  params.push(limit)
  params.push(offset)

  const { rows } = await pool.query(
    `SELECT id, applicant, requested_amount, term_months, purpose, submitted_at,
            documents_total, documents_uploaded, documents_validated, documents_pending_review
     FROM applications
     ${where}
     ORDER BY submitted_at DESC, id DESC
     LIMIT $${params.length - 1} OFFSET $${params.length}`,
    params
  )

  res.json(rows.map((r) => ({
    id: r.id,
    applicant: r.applicant,
    requestedAmount: Number(r.requested_amount),
    termMonths: r.term_months,
    purpose: r.purpose,
    submittedAt: r.submitted_at,
    documentsStatus: {
      total: r.documents_total,
      uploaded: r.documents_uploaded,
      validated: r.documents_validated,
      pendingReview: r.documents_pending_review,
    },
  })))
})

router.get('/applications/:id', async (req, res) => {
  const { rows } = await pool.query('SELECT * FROM applications WHERE id = $1', [req.params.id])
  if (!rows.length) return res.status(404).json({ error: 'Not found' })
  const app = rows[0]
  res.json({
    id: app.id,
    applicant: app.applicant,
    requestedAmount: Number(app.requested_amount),
    termMonths: app.term_months,
    purpose: app.purpose,
    contactEmail: app.contact_email,
    contactPhone: app.contact_phone,
    organizationType: app.organization_type,
    notes: app.notes,
    submittedAt: app.submitted_at,
    documentsStatus: {
      total: app.documents_total,
      uploaded: app.documents_uploaded,
      validated: app.documents_validated,
      pendingReview: app.documents_pending_review,
    },
  })
})

router.post('/applications', async (req, res) => {
  const { id, applicant, requestedAmount, termMonths, purpose, contactEmail, contactPhone, organizationType, notes } = req.body
  const { rows } = await pool.query(
    `INSERT INTO applications (id, applicant, requested_amount, term_months, purpose, contact_email, contact_phone, organization_type, notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9) RETURNING *`,
    [id, applicant, requestedAmount, termMonths, purpose, contactEmail, contactPhone, organizationType, notes]
  )
  res.status(201).json(rows[0])
})

// ─── Extracted fields ──────────────────────────────────────
router.get('/applications/:id/extracted-fields', async (req, res) => {
  const { rows } = await pool.query(
    `SELECT document_type AS "documentType", file_name AS "fileName",
            field_name AS name, field_value AS value, source, valid,
            confidence, status
     FROM extracted_fields WHERE application_id = $1`,
    [req.params.id]
  )
  res.json(rows)
})

// ─── Extracted spreadsheet ─────────────────────────────────
router.get('/applications/:id/spreadsheet', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT documento, campo, valor, fuente FROM extracted_spreadsheet WHERE application_id = $1',
    [req.params.id]
  )
  res.json(rows)
})

// ─── Credit score ──────────────────────────────────────────
router.get('/applications/:id/score', async (req, res) => {
  const { rows: scoreRows } = await pool.query(
    'SELECT * FROM credit_scores WHERE application_id = $1', [req.params.id]
  )
  if (!scoreRows.length) return res.status(404).json({ error: 'No score found' })
  const s = scoreRows[0]
  const { rows: breakdown } = await pool.query(
    'SELECT name, weight, score, max_score AS max, status FROM score_breakdown WHERE credit_score_id = $1',
    [s.id]
  )
  res.json({
    grade: s.grade,
    gradeLabel: s.grade_label,
    scoreBreakdown: breakdown,
    composite: s.composite,
    bureauScore: s.bureau_score,
    bureauBand: s.bureau_band,
  })
})

// ─── KPIs ──────────────────────────────────────────────────
router.get('/applications/:id/kpis', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT name, value::float, format, benchmark, status FROM kpis WHERE application_id = $1',
    [req.params.id]
  )
  res.json(rows)
})

// ─── Recommendation ────────────────────────────────────────
router.get('/applications/:id/recommendation', async (req, res) => {
  const { rows } = await pool.query(
    'SELECT * FROM recommendations WHERE application_id = $1', [req.params.id]
  )
  if (!rows.length) return res.status(404).json({ error: 'No recommendation' })
  const r = rows[0]
  const { rows: conditions } = await pool.query(
    'SELECT condition_text FROM recommendation_conditions WHERE recommendation_id = $1',
    [r.id]
  )
  res.json({
    action: r.action,
    suggestedAmount: Number(r.suggested_amount),
    suggestedTermMonths: r.suggested_term_months,
    suggestedRate: r.suggested_rate,
    conditions: conditions.map(c => c.condition_text),
    analystNotes: r.analyst_notes,
  })
})

// ─── Credits + covenants ───────────────────────────────────
router.get('/credits', async (_req, res) => {
  const { rows: credits } = await pool.query('SELECT * FROM credits ORDER BY id')
  const result = []
  for (const cr of credits) {
    const { rows: covenants } = await pool.query(
      `SELECT name, current_value AS current, threshold, status, trigger_rule AS trigger
       FROM covenants WHERE credit_id = $1`,
      [cr.id]
    )
    const { rows: alerts } = await pool.query(
      'SELECT alert_type AS type, alert_text AS text FROM credit_alerts WHERE credit_id = $1',
      [cr.id]
    )
    result.push({
      id: cr.id,
      applicant: cr.applicant,
      amount: Number(cr.amount),
      disbursedAt: cr.disbursed_at,
      termMonths: cr.term_months,
      balance: Number(cr.balance),
      gradeAtDisbursement: cr.grade_at_disbursement,
      covenants: covenants.map(c => ({
        ...c,
        current: c.current !== null ? Number(c.current) : c.current,
        threshold: c.threshold !== null ? Number(c.threshold) : undefined,
      })),
      alerts,
    })
  }
  res.json(result)
})

// ─── Empresas (Prisma) ────────────────────────────────────

// GET all empresas
router.get('/empresas', async (_req, res) => {
  try {
    const empresas = await prisma.empresa.findMany({ orderBy: { created_at: 'desc' } })
    res.json(empresas)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET empresa by id
router.get('/empresas/:id', async (req, res) => {
  try {
    const empresa = await prisma.empresa.findUnique({ where: { id: req.params.id } })
    if (!empresa) return res.status(404).json({ error: 'Empresa no encontrada' })
    res.json(empresa)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST create empresa
router.post('/empresas', async (req, res) => {
  try {
    const empresa = await prisma.empresa.create({ data: req.body })
    res.status(201).json(empresa)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// PUT update empresa
router.put('/empresas/:id', async (req, res) => {
  try {
    const empresa = await prisma.empresa.update({
      where: { id: req.params.id },
      data: req.body,
    })
    res.json(empresa)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// DELETE empresa
router.delete('/empresas/:id', async (req, res) => {
  try {
    await prisma.empresa.delete({ where: { id: req.params.id } })
    res.json({ message: 'Empresa eliminada' })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

module.exports = router
