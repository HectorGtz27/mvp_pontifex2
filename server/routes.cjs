/**
 * Aggregator: mounts all domain sub-routers.
 * Each sub-router defines its own paths (e.g. /clientes, /solicitudes, etc.)
 */
const express = require('express')

const documentTypesRoutes = require('./routes/documentTypes.cjs')
const clientesRoutes      = require('./routes/clientes.cjs')
const solicitudesRoutes   = require('./routes/solicitudes.cjs')
const bancosRoutes        = require('./routes/bancos.cjs')
const creditsRoutes       = require('./routes/credits.cjs')

const router = express.Router()

router.use(documentTypesRoutes)
router.use(clientesRoutes)
router.use(solicitudesRoutes)
router.use(bancosRoutes)
router.use(creditsRoutes)

module.exports = router
