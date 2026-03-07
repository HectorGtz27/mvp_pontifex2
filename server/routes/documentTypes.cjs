const express = require('express')
const prisma = require('../prisma.cjs')

const router = express.Router()

// GET /document-types — lista categorías con sus tipos
router.get('/document-types', async (_req, res) => {
  try {
    const categorias = await prisma.categoriaDocumento.findMany({
      orderBy: { orden: 'asc' },
      include: {
        tipos: { orderBy: { orden: 'asc' } },
      },
    })
    res.json(categorias)
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
