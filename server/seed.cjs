/**
 * Seed script — populates the Pontifex database with the mock data.
 * Run:  node server/seed.cjs
 */
const pool = require('./db.cjs')
const fs = require('fs')
const path = require('path')

async function seed() {
  const client = await pool.connect()
  try {
    // 1. Run schema
    const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8')
    await client.query(schema)
    console.log('✓ Schema created')

    // 2. Document types
    const docTypes = [
      ['curriculum', 'Curriculum de la empresa', true],
      ['cv_directivos', 'CV de Principales Directivos y Socios', true],
      ['acta', 'Acta Constitutiva', true],
      ['poderes', 'Poderes y Asambleas', true],
      ['estados_financieros', 'Estados Financieros (últimos 3 años)', true],
      ['declaraciones', 'Declaraciones (últimos 3 años)', true],
      ['estados_cuenta', 'Estados de Cuenta Bancarios (12 meses)', true],
      ['proyecciones', 'Proyecciones financieras del proyecto', true],
      ['situacion_fiscal', 'Constancia de Situación Fiscal', true],
    ]
    for (const [id, label, req] of docTypes) {
      await client.query(
        `INSERT INTO document_types (id, label, required) VALUES ($1, $2, $3) ON CONFLICT (id) DO NOTHING`,
        [id, label, req]
      )
    }
    console.log('✓ Document types seeded')

    // 3. Application
    await client.query(
      `INSERT INTO applications (id, applicant, requested_amount, term_months, purpose, submitted_at,
        documents_total, documents_uploaded, documents_validated, documents_pending_review)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
       ON CONFLICT (id) DO NOTHING`,
      ['SOL-2026-0042', 'OSC Desarrollo Verde A.C.', 850000, 24, 'Capital de trabajo y equipo', '2026-02-20', 9, 9, 8, 1]
    )
    console.log('✓ Application seeded')

    // 4. Extracted fields
    const fields = [
      ['SOL-2026-0042', 'estados_financieros', 'Estados_Financieros_2024.pdf', 'Total Activo', '4,250,000 MXN', 'Balance', true, 0.92, 'validated'],
      ['SOL-2026-0042', 'estados_financieros', 'Estados_Financieros_2024.pdf', 'Total Activo Circulante', '1,800,000 MXN', 'Balance', true, 0.92, 'validated'],
      ['SOL-2026-0042', 'estados_financieros', 'Estados_Financieros_2024.pdf', 'Total Pasivo', '1,200,000 MXN', 'Balance', true, 0.92, 'validated'],
      ['SOL-2026-0042', 'estados_financieros', 'Estados_Financieros_2024.pdf', 'Capital Contable', '3,050,000 MXN', 'Balance', true, 0.92, 'validated'],
      ['SOL-2026-0042', 'estados_financieros', 'Estados_Financieros_2024.pdf', 'Venta Neta', '2,100,000 MXN', 'Estado de Resultados', true, 0.92, 'validated'],
      ['SOL-2026-0042', 'estados_financieros', 'Estados_Financieros_2024.pdf', 'Utilidad Neta', '185,000 MXN', 'Estado de Resultados', true, 0.92, 'validated'],
      ['SOL-2026-0042', 'estados_financieros', 'Estados_Financieros_2024.pdf', 'EBIT', '220,000 MXN', 'Estado de Resultados', true, 0.92, 'validated'],
    ]
    for (const f of fields) {
      await client.query(
        `INSERT INTO extracted_fields (application_id, document_type, file_name, field_name, field_value, source, valid, confidence, status)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
        f
      )
    }
    console.log('✓ Extracted fields seeded')

    // 5. Extracted spreadsheet
    const spreadsheet = [
      ['SOL-2026-0042', 'Estados Financieros (últimos 3 años)', 'Total Activo', '4,250,000 MXN', 'Balance'],
      ['SOL-2026-0042', 'Estados Financieros (últimos 3 años)', 'Total Activo Circulante', '1,800,000 MXN', 'Balance'],
      ['SOL-2026-0042', 'Estados Financieros (últimos 3 años)', 'Total Pasivo', '1,200,000 MXN', 'Balance'],
      ['SOL-2026-0042', 'Estados Financieros (últimos 3 años)', 'Capital Contable', '3,050,000 MXN', 'Balance'],
      ['SOL-2026-0042', 'Estados Financieros (últimos 3 años)', 'Venta Neta', '2,100,000 MXN', 'Estado de Resultados'],
      ['SOL-2026-0042', 'Estados Financieros (últimos 3 años)', 'Utilidad Neta', '185,000 MXN', 'Estado de Resultados'],
      ['SOL-2026-0042', 'Estados Financieros (últimos 3 años)', 'EBIT', '220,000 MXN', 'Estado de Resultados'],
      ['SOL-2026-0042', 'Acta Constitutiva', 'Razón social', 'OSC Desarrollo Verde A.C.', 'OCR'],
      ['SOL-2026-0042', 'Acta Constitutiva', 'RFC', 'ODE123456ABC', 'OCR'],
      ['SOL-2026-0042', 'Acta Constitutiva', 'Domicilio Fiscal', 'Av. Ejemplo 123, Col. Centro', 'OCR'],
      ['SOL-2026-0042', 'Constancia de Situación Fiscal', 'Situación fiscal', 'Al corriente', 'OCR'],
      ['SOL-2026-0042', 'Declaraciones (últimos 3 años)', 'Ejercicio 2024', 'Presentada', 'OCR'],
      ['SOL-2026-0042', 'Declaraciones (últimos 3 años)', 'Ejercicio 2023', 'Presentada', 'OCR'],
    ]
    for (const s of spreadsheet) {
      await client.query(
        `INSERT INTO extracted_spreadsheet (application_id, documento, campo, valor, fuente)
         VALUES ($1,$2,$3,$4,$5)`,
        s
      )
    }
    console.log('✓ Extracted spreadsheet seeded')

    // 6. Credit score
    const { rows: [scoreRow] } = await client.query(
      `INSERT INTO credit_scores (application_id, grade, grade_label, composite, bureau_score, bureau_band)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      ['SOL-2026-0042', 'B', 'Riesgo Medio', 70, 645, 'Naranja (587-667)']
    )
    const scoreId = scoreRow.id
    const breakdown = [
      ['Liquidez', 45, 72, 100, 'ok'],
      ['Rentabilidad', 35, 68, 100, 'ok'],
      ['Buró de Crédito', 15, 65, 100, 'warning'],
      ['ESG', 5, 80, 100, 'ok'],
    ]
    for (const b of breakdown) {
      await client.query(
        `INSERT INTO score_breakdown (credit_score_id, name, weight, score, max_score, status)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        [scoreId, ...b]
      )
    }
    console.log('✓ Credit score seeded')

    // 7. KPIs
    const kpis = [
      ['SOL-2026-0042', 'Razón Circulante', 1.85, null, '> 1.2', 'ok'],
      ['SOL-2026-0042', 'DSCR', 1.35, null, '> 1.2', 'ok'],
      ['SOL-2026-0042', 'Deuda/EBIT', 3.2, null, '< 4', 'ok'],
      ['SOL-2026-0042', 'ROE', 0.062, 'percent', '> 5%', 'ok'],
      ['SOL-2026-0042', 'Margen Neto', 0.088, 'percent', '> 5%', 'ok'],
    ]
    for (const k of kpis) {
      await client.query(
        `INSERT INTO kpis (application_id, name, value, format, benchmark, status)
         VALUES ($1,$2,$3,$4,$5,$6)`,
        k
      )
    }
    console.log('✓ KPIs seeded')

    // 8. Recommendation
    const { rows: [recRow] } = await client.query(
      `INSERT INTO recommendations (application_id, action, suggested_amount, suggested_term_months, suggested_rate, analyst_notes)
       VALUES ($1,$2,$3,$4,$5,$6) RETURNING id`,
      ['SOL-2026-0042', 'approve_conditional', 800000, 24, '18% anual',
       'Rentabilidad y liquidez sólidas. Buró en rango naranja; recomiendo aprobación con monitoreo trimestral.']
    )
    const conditions = [
      'Mantener DSCR mínimo 1.2 durante la vida del crédito.',
      'Presentar estados financieros trimestrales.',
      'Garantía: hipoteca sobre activo valorado en 1.2M.',
    ]
    for (const c of conditions) {
      await client.query(
        `INSERT INTO recommendation_conditions (recommendation_id, condition_text) VALUES ($1, $2)`,
        [recRow.id, c]
      )
    }
    console.log('✓ Recommendation seeded')

    // 9. Credits + covenants + alerts
    const credits = [
      {
        id: 'CR-001', applicant: 'OSC Desarrollo Verde A.C.', amount: 800000,
        disbursed_at: '2025-11-15', term_months: 24, balance: 620000, grade: 'B',
        covenants: [
          ['DSCR', 1.28, 1.2, 'yellow', 'DSCR < 1.2 → alerta'],
          ['Deuda/EBIT', 3.8, 4, 'green', '> 4 → alerta roja'],
          ['Capital de trabajo', 120000, null, 'green', 'Negativo → bloqueo'],
          ['Mora Buró', 0, null, 'green', '> 30 días → revisión'],
        ],
        alerts: [['yellow', 'DSCR cercano al mínimo (1.28). Revisar en próximo trimestre.']],
      },
      {
        id: 'CR-002', applicant: 'Fundación Comunidad Sostenible', amount: 500000,
        disbursed_at: '2025-09-01', term_months: 18, balance: 380000, grade: 'A',
        covenants: [
          ['DSCR', 1.52, 1.2, 'green', 'DSCR < 1.2 → alerta'],
          ['Deuda/EBIT', 2.1, 4, 'green', '> 4 → alerta roja'],
          ['Capital de trabajo', 95000, null, 'green', 'Negativo → bloqueo'],
          ['Mora Buró', 0, null, 'green', '> 30 días → revisión'],
        ],
        alerts: [],
      },
      {
        id: 'CR-003', applicant: 'Asociación Emprendedores Locales', amount: 350000,
        disbursed_at: '2025-06-10', term_months: 12, balance: 140000, grade: 'B',
        covenants: [
          ['DSCR', 1.05, 1.2, 'red', 'DSCR < 1.2 → alerta'],
          ['Deuda/EBIT', 4.2, 4, 'red', '> 4 → alerta roja'],
          ['Capital de trabajo', -15000, null, 'red', 'Negativo → bloqueo'],
          ['Mora Buró', 0, null, 'green', '> 30 días → revisión'],
        ],
        alerts: [
          ['red', 'DSCR por debajo del covenant (1.05). Trigger de revisión manual.'],
          ['red', 'Deuda/EBIT > 4. Bloqueo automático de desembolsos pendientes.'],
          ['red', 'Capital de trabajo negativo. Requiere plan de corrección.'],
        ],
      },
    ]

    for (const cr of credits) {
      await client.query(
        `INSERT INTO credits (id, applicant, amount, disbursed_at, term_months, balance, grade_at_disbursement)
         VALUES ($1,$2,$3,$4,$5,$6,$7) ON CONFLICT (id) DO NOTHING`,
        [cr.id, cr.applicant, cr.amount, cr.disbursed_at, cr.term_months, cr.balance, cr.grade]
      )
      for (const c of cr.covenants) {
        await client.query(
          `INSERT INTO covenants (credit_id, name, current_value, threshold, status, trigger_rule)
           VALUES ($1,$2,$3,$4,$5,$6)`,
          [cr.id, ...c]
        )
      }
      for (const a of cr.alerts) {
        await client.query(
          `INSERT INTO credit_alerts (credit_id, alert_type, alert_text) VALUES ($1,$2,$3)`,
          [cr.id, ...a]
        )
      }
    }
    console.log('✓ Credits, covenants & alerts seeded')

    console.log('\n✅ Database seeded successfully!')
  } catch (err) {
    console.error('Seed error:', err)
    process.exit(1)
  } finally {
    client.release()
    await pool.end()
  }
}

seed()
