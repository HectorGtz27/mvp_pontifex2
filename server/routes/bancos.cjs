const express = require('express')
const prisma = require('../prisma.cjs')

const router = express.Router()

// ═══════════════════════════════════════════════════════════════
// Bancos con convenio
// ═══════════════════════════════════════════════════════════════

// GET /bancos — lista todos los bancos activos
router.get('/bancos', async (_req, res) => {
  try {
    const bancos = await prisma.banco.findMany({
      where: { activo: true },
      orderBy: { nombre: 'asc' },
    })
    res.json(bancos)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /bancos/:id — detalle de un banco
router.get('/bancos/:id', async (req, res) => {
  try {
    const banco = await prisma.banco.findUnique({ where: { id: req.params.id } })
    if (!banco) return res.status(404).json({ error: 'Banco no encontrado' })
    res.json(banco)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// GET /bancos/match/filtros — bancos que cumplan criterios del cliente
router.get('/bancos/match/filtros', async (req, res) => {
  try {
    const {
      cobertura, producto, experiencia, sector, buro, garantia, solvencia,
    } = req.query

    const where = { activo: true }

    if (cobertura) {
      const map = {
        local: 'cob_local', estatal: 'cob_estatal',
        regional: 'cob_regional', nacional: 'cob_nacional',
      }
      const col = map[cobertura]
      if (col) where[col] = true
    }
    if (producto) {
      const map = {
        credito_simple: 'prod_credito_simple', credito_revolvente: 'prod_credito_revolvente',
        factoraje: 'prod_factoraje', arrendamiento: 'prod_arrendamiento',
      }
      const col = map[producto]
      if (col) where[col] = true
    }
    if (experiencia) {
      const map = {
        menor_1_anio: 'exp_menor_1_anio', '1_anio': 'exp_1_anio', '2_mas_anios': 'exp_2_mas_anios',
      }
      const col = map[experiencia]
      if (col) where[col] = true
    }
    if (sector) {
      const map = {
        comercio: 'sec_comercio', industria: 'sec_industria',
        servicio: 'sec_servicio', primario: 'sec_primario',
      }
      const col = map[sector]
      if (col) where[col] = true
    }
    if (buro) {
      const map = {
        excelente: 'buro_excelente', bueno: 'buro_bueno',
        regular: 'buro_regular', malo: 'buro_malo',
      }
      const col = map[buro]
      if (col) where[col] = true
    }
    if (garantia) {
      const map = {
        aval: 'gar_aval', relacion_patrimonial: 'gar_relacion_patrimonial',
        hipotecaria: 'gar_hipotecaria', prendaria: 'gar_prendaria',
        liquidez: 'gar_liquidez', contrato: 'gar_contrato',
      }
      const col = map[garantia]
      if (col) where[col] = true
    }
    if (solvencia) {
      const map = {
        utilidad: 'solv_utilidad', perdida: 'solv_perdida',
        quiebra_tecnica: 'solv_quiebra_tecnica',
      }
      const col = map[solvencia]
      if (col) where[col] = true
    }

    const bancos = await prisma.banco.findMany({ where, orderBy: { nombre: 'asc' } })
    res.json({ total: bancos.length, bancos })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// POST /bancos — crear banco (admin)
router.post('/bancos', async (req, res) => {
  try {
    const banco = await prisma.banco.create({ data: req.body })
    res.status(201).json(banco)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// PATCH /bancos/:id — actualizar banco (admin)
router.patch('/bancos/:id', async (req, res) => {
  try {
    const banco = await prisma.banco.update({
      where: { id: req.params.id },
      data: { ...req.body, updated_at: new Date() },
    })
    res.json(banco)
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// ═══════════════════════════════════════════════════════════════
// Cuentas Bancarias (top-level create/delete)
// ═══════════════════════════════════════════════════════════════

// POST /cuentas-bancarias — crear cuenta
router.post('/cuentas-bancarias', async (req, res) => {
  try {
    const { solicitudId, banco, divisa, alias } = req.body
    if (!solicitudId || !banco) {
      return res.status(400).json({ error: 'solicitudId y banco son requeridos' })
    }

    const existing = await prisma.cuentaBancaria.findFirst({
      where: { solicitud_id: solicitudId, banco },
    })
    if (existing) {
      return res.status(409).json({
        error: `Ya existe una cuenta ${banco} para esta solicitud`,
        id: existing.id,
      })
    }
    const cuenta = await prisma.cuentaBancaria.create({
      data: {
        solicitud_id: solicitudId,
        banco,
        divisa: divisa || null,
        alias: alias || null,
      },
    })
    res.status(201).json({
      id: cuenta.id,
      solicitudId: cuenta.solicitud_id,
      banco: cuenta.banco,
      divisa: cuenta.divisa,
      alias: cuenta.alias,
      createdAt: cuenta.created_at,
      documentos: [],
      mesesCubiertos: [],
    })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// DELETE /cuentas-bancarias/:id — eliminar cuenta (CASCADE en BD)
router.delete('/cuentas-bancarias/:id', async (req, res) => {
  try {
    await prisma.cuentaBancaria.delete({ where: { id: req.params.id } })
    res.json({ success: true })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

module.exports = router
