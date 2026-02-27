const express = require('express')
const cors = require('cors')
require('dotenv').config()

const routes = require('./routes.cjs')
const uploadRoutes = require('./routes/upload.cjs')

const app = express()
const PORT = process.env.API_PORT || 3001

app.use(cors())

// ⚠️ IMPORTANTE: Primero las rutas de upload (que usan FormData/multipart)
// ANTES de aplicar express.json() que interferiría con FormData
app.use('/api/upload', uploadRoutes)

// ✅ Luego express.json() para el resto de rutas
app.use(express.json())

// API routes
app.use('/api', routes)

// Health check
app.get('/api/health', async (_req, res) => {
  const pool = require('./db.cjs')
  try {
    await pool.query('SELECT 1')
    res.json({ status: 'ok', database: 'connected' })
  } catch (err) {
    res.status(500).json({ status: 'error', database: 'disconnected', message: err.message })
  }
})

app.listen(PORT, () => {
  console.log(`🚀 Pontifex API running on http://localhost:${PORT}`)
})
