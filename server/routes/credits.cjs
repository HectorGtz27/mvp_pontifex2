const express = require('express')
const prisma = require('../prisma.cjs')

const router = express.Router()

// GET /credits — créditos con covenants y alertas
router.get('/credits', async (_req, res) => {
  try {
    const credits = await prisma.credito.findMany({
      include: {
        covenants: true,
        alertas: true,
      },
      orderBy: { created_at: 'asc' },
    })

    res.json(credits.map(cr => ({
      id: cr.id,
      applicant: cr.solicitante,
      amount: Number(cr.monto),
      disbursedAt: cr.fecha_desembolso,
      termMonths: cr.plazo_meses,
      balance: cr.saldo !== null ? Number(cr.saldo) : null,
      gradeAtDisbursement: cr.grado_al_desembolso,
      covenants: cr.covenants.map(c => ({
        name: c.nombre,
        current: c.valor_actual !== null ? Number(c.valor_actual) : null,
        threshold: c.umbral !== null ? Number(c.umbral) : undefined,
        status: c.estado,
        trigger: c.regla_trigger,
      })),
      alerts: cr.alertas.map(a => ({
        type: a.tipo_alerta,
        text: a.texto_alerta,
      })),
    })))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
