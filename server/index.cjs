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
  const prisma = require('./prisma.cjs')
  try {
    await prisma.$queryRaw`SELECT 1`
    res.json({ status: 'ok', database: 'connected' })
  } catch (err) {
    res.status(500).json({ status: 'error', database: 'disconnected', message: err.message })
  }
})

// Error handler global
app.use((err, req, res, next) => {
  console.error('❌ Error no manejado:', err)
  res.status(500).json({ error: 'Error interno del servidor', message: err.message })
})

// Manejo de errores no capturados
process.on('uncaughtException', (err) => {
  console.error('❌ Excepción no capturada:', err)
  process.exit(1)
})

process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Promise rechazada no manejada:', reason)
})

const server = app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Pontifex API running on http://10.41.48.5:${PORT}`)
  console.log(`📊 Health check: http://10.41.48.5:${PORT}/api/health`)
  console.log(`📁 Upload endpoint: http://10.41.48.5:${PORT}/api/upload`)
})

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error(`❌ El puerto ${PORT} ya está en uso. Ejecuta: lsof -ti:${PORT} | xargs kill -9`)
  } else {
    console.error('❌ Error del servidor:', err)
  }
})
