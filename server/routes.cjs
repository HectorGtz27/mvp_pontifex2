const express = require('express')
const prisma = require('./prisma.cjs')

const router = express.Router()

// ═══════════════════════════════════════════════════════════════
// Document types (with categories)
// ═══════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════
// Clientes (empresas)
// ═══════════════════════════════════════════════════════════════

router.get('/clientes', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500)
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0)
    const q = (req.query.q || '').toString().trim()

    const where = q
      ? { OR: [
          { razon_social: { contains: q, mode: 'insensitive' } },
          { nombre_comercial: { contains: q, mode: 'insensitive' } },
          { rfc: { contains: q, mode: 'insensitive' } },
        ]}
      : {}

    const rows = await prisma.cliente.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
      include: {
        solicitudes: {
          select: { id: true, monto: true, estatus: true, created_at: true },
          orderBy: { created_at: 'desc' },
        },
      },
    })

    res.json(rows.map(r => ({
      id: r.id,
      razonSocial: r.razon_social,
      nombreComercial: r.nombre_comercial,
      rfc: r.rfc,
      ciudad: r.ciudad,
      estado: r.estado,
      correoElectronico: r.correo_electronico,
      telefono: r.telefono,
      createdAt: r.created_at,
      solicitudes: r.solicitudes.map(s => ({
        id: s.id,
        monto: Number(s.monto),
        estatus: s.estatus,
        createdAt: s.created_at,
      })),
    })))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/clientes/:id', async (req, res) => {
  try {
    const c = await prisma.cliente.findUnique({
      where: { id: req.params.id },
      include: {
        solicitudes: {
          orderBy: { created_at: 'desc' },
        },
      },
    })
    if (!c) return res.status(404).json({ error: 'Cliente no encontrado' })
    res.json({
      id: c.id,
      razonSocial: c.razon_social,
      nombreComercial: c.nombre_comercial,
      rfc: c.rfc,
      domicilioFiscal: c.domicilio_fiscal,
      ciudad: c.ciudad,
      estado: c.estado,
      contactoNombre: c.contacto_nombre,
      telefono: c.telefono,
      celular: c.celular,
      correoElectronico: c.correo_electronico,
      paginaWeb: c.pagina_web,
      numEmpleadosPermanentes: c.num_empleados_permanentes,
      numEmpleadosEventuales: c.num_empleados_eventuales,
      createdAt: c.created_at,
      solicitudes: c.solicitudes.map(s => ({
        id: s.id,
        monto: Number(s.monto),
        divisa: s.divisa,
        plazoDeseado: s.plazo_deseado,
        estatus: s.estatus,
        docsTotal: s.docs_total,
        docsSubidos: s.docs_subidos,
        createdAt: s.created_at,
      })),
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/clientes', async (req, res) => {
  try {
    const b = req.body
    const c = await prisma.cliente.create({
      data: {
        razon_social: b.razonSocial,
        nombre_comercial: b.nombreComercial || null,
        rfc: b.rfc || null,
        domicilio_fiscal: b.domicilioFiscal || null,
        ciudad: b.ciudad || null,
        estado: b.estado || null,
        contacto_nombre: b.contactoNombre || null,
        telefono: b.telefono || null,
        celular: b.celular || null,
        correo_electronico: b.correoElectronico || null,
        pagina_web: b.paginaWeb || null,
        num_empleados_permanentes: b.numEmpleadosPermanentes ? parseInt(b.numEmpleadosPermanentes) : null,
        num_empleados_eventuales: b.numEmpleadosEventuales ? parseInt(b.numEmpleadosEventuales) : null,
      },
    })
    res.status(201).json({ id: c.id, razonSocial: c.razon_social })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

router.put('/clientes/:id', async (req, res) => {
  try {
    const b = req.body
    const data = {}
    if (b.razonSocial !== undefined)           data.razon_social = b.razonSocial
    if (b.nombreComercial !== undefined)        data.nombre_comercial = b.nombreComercial
    if (b.rfc !== undefined)                    data.rfc = b.rfc
    if (b.domicilioFiscal !== undefined)        data.domicilio_fiscal = b.domicilioFiscal
    if (b.ciudad !== undefined)                 data.ciudad = b.ciudad
    if (b.estado !== undefined)                 data.estado = b.estado
    if (b.contactoNombre !== undefined)         data.contacto_nombre = b.contactoNombre
    if (b.telefono !== undefined)               data.telefono = b.telefono
    if (b.celular !== undefined)                data.celular = b.celular
    if (b.correoElectronico !== undefined)      data.correo_electronico = b.correoElectronico
    if (b.paginaWeb !== undefined)              data.pagina_web = b.paginaWeb
    if (b.numEmpleadosPermanentes !== undefined) data.num_empleados_permanentes = parseInt(b.numEmpleadosPermanentes) || null
    if (b.numEmpleadosEventuales !== undefined)  data.num_empleados_eventuales = parseInt(b.numEmpleadosEventuales) || null

    const c = await prisma.cliente.update({
      where: { id: req.params.id },
      data,
    })
    res.json({ id: c.id, razonSocial: c.razon_social })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// ═══════════════════════════════════════════════════════════════
// Solicitudes (aplicaciones de crédito)
// ═══════════════════════════════════════════════════════════════

router.get('/solicitudes', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500)
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0)
    const q = (req.query.q || '').toString().trim()

    const where = q
      ? { cliente: { OR: [
          { razon_social: { contains: q, mode: 'insensitive' } },
          { nombre_comercial: { contains: q, mode: 'insensitive' } },
        ]}}
      : {}

    const rows = await prisma.solicitud.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
      include: {
        cliente: {
          select: { razon_social: true, nombre_comercial: true, rfc: true },
        },
      },
    })

    res.json(rows.map(r => ({
      id: r.id,
      clienteId: r.cliente_id,
      razonSocial: r.cliente.razon_social,
      nombreComercial: r.cliente.nombre_comercial,
      rfc: r.cliente.rfc,
      monto: Number(r.monto),
      divisa: r.divisa,
      plazoDeseado: r.plazo_deseado,
      estatus: r.estatus,
      docsTotal: r.docs_total,
      docsSubidos: r.docs_subidos,
      createdAt: r.created_at,
    })))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.get('/solicitudes/:id', async (req, res) => {
  try {
    const s = await prisma.solicitud.findUnique({
      where: { id: req.params.id },
      include: {
        cliente: true,
      },
    })
    if (!s) return res.status(404).json({ error: 'Solicitud no encontrada' })
    res.json({
      id: s.id,
      clienteId: s.cliente_id,
      monto: Number(s.monto),
      divisa: s.divisa,
      plazoDeseado: s.plazo_deseado,
      destino: s.destino,
      tasaObjetivo: s.tasa_objetivo,
      tipoColateral: s.tipo_colateral,
      nivelVentasAnuales: s.nivel_ventas_anuales ? Number(s.nivel_ventas_anuales) : null,
      margenRealUtilidad: s.margen_real_utilidad ? Number(s.margen_real_utilidad) : null,
      situacionBuroCredito: s.situacion_buro_credito,
      estatus: s.estatus,
      docsTotal: s.docs_total,
      docsSubidos: s.docs_subidos,
      notas: s.notas,
      createdAt: s.created_at,
      cliente: {
        id: s.cliente.id,
        razonSocial: s.cliente.razon_social,
        nombreComercial: s.cliente.nombre_comercial,
        rfc: s.cliente.rfc,
        domicilioFiscal: s.cliente.domicilio_fiscal,
        ciudad: s.cliente.ciudad,
        estado: s.cliente.estado,
        contactoNombre: s.cliente.contacto_nombre,
        telefono: s.cliente.telefono,
        celular: s.cliente.celular,
        correoElectronico: s.cliente.correo_electronico,
        paginaWeb: s.cliente.pagina_web,
        numEmpleadosPermanentes: s.cliente.num_empleados_permanentes,
        numEmpleadosEventuales: s.cliente.num_empleados_eventuales,
      },
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

router.post('/solicitudes', async (req, res) => {
  try {
    const b = req.body
    // Get doc types count for docs_total
    const docCount = await prisma.tipoDocumento.count()

    const s = await prisma.solicitud.create({
      data: {
        cliente_id: b.clienteId,
        monto: b.monto,
        divisa: b.divisa || 'MXN',
        plazo_deseado: b.plazoDeseado || null,
        destino: b.destino || null,
        tasa_objetivo: b.tasaObjetivo || null,
        tipo_colateral: b.tipoColateral || null,
        nivel_ventas_anuales: b.nivelVentasAnuales || null,
        margen_real_utilidad: b.margenRealUtilidad || null,
        situacion_buro_credito: b.situacionBuroCredito || null,
        docs_total: docCount,
        notas: b.notas || null,
      },
      include: { cliente: { select: { razon_social: true } } },
    })
    res.status(201).json({
      id: s.id,
      clienteId: s.cliente_id,
      razonSocial: s.cliente.razon_social,
      monto: Number(s.monto),
      divisa: s.divisa,
    })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// ═══════════════════════════════════════════════════════════════
// Documentos de una solicitud
// ═══════════════════════════════════════════════════════════════

router.get('/solicitudes/:id/documents', async (req, res) => {
  try {
    const docs = await prisma.documento.findMany({
      where: { solicitud_id: req.params.id },
      orderBy: { created_at: 'desc' },
      include: { tipo_documento: { select: { label: true, categoria_id: true } } },
    })
    res.json(docs.map(d => ({
      id: d.id,
      tipoDocumentoId: d.tipo_documento_id,
      tipoDocumentoLabel: d.tipo_documento.label,
      categoriaId: d.tipo_documento.categoria_id,
      fileName: d.nombre_archivo,
      s3Url: d.s3_url,
      mimeType: d.mime_type,
      fileSize: d.tamano_archivo,
      extractedData: d.extracted_data,
      estado: d.estado,
      confianza: d.confianza ? Number(d.confianza) : null,
      createdAt: d.created_at,
    })))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ═══════════════════════════════════════════════════════════════
// Campos extraídos (datos OCR normalizados)
// ═══════════════════════════════════════════════════════════════

router.get('/solicitudes/:id/extracted-fields', async (req, res) => {
  try {
    const rows = await prisma.campoExtraido.findMany({
      where: { solicitud_id: req.params.id },
      orderBy: [{ seccion: 'asc' }, { periodo: 'asc' }, { campo: 'asc' }],
    })
    res.json(rows.map(r => ({
      id: r.id,
      seccion: r.seccion,
      campo: r.campo,
      valor: r.valor,
      periodo: r.periodo,
      fuente: r.fuente,
      confianza: Number(r.confianza),
      estado: r.estado,
    })))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// Spreadsheet view (grouped by section+period)
router.get('/solicitudes/:id/spreadsheet', async (req, res) => {
  try {
    const rows = await prisma.campoExtraido.findMany({
      where: { solicitud_id: req.params.id },
      orderBy: [{ seccion: 'asc' }, { periodo: 'asc' }, { campo: 'asc' }],
    })
    res.json(rows.map(r => ({
      seccion: r.seccion,
      campo: r.campo,
      valor: r.valor,
      periodo: r.periodo,
      fuente: r.fuente,
    })))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ═══════════════════════════════════════════════════════════════
// Score crediticio
// ═══════════════════════════════════════════════════════════════

router.get('/solicitudes/:id/score', async (req, res) => {
  try {
    const score = await prisma.scoreCrediticio.findUnique({
      where: { solicitud_id: req.params.id },
      include: { desglose: true },
    })
    if (!score) return res.status(404).json({ error: 'No score found' })
    res.json({
      grade: score.grado,
      gradeLabel: score.grado_label,
      scoreBreakdown: score.desglose.map(b => ({
        name: b.nombre,
        weight: b.peso,
        score: b.puntaje,
        max: b.maximo,
        status: b.estado,
      })),
      composite: score.compuesto,
      bureauScore: score.score_buro,
      bureauBand: score.banda_buro,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ═══════════════════════════════════════════════════════════════
// KPIs (indicadores financieros)
// ═══════════════════════════════════════════════════════════════

router.get('/solicitudes/:id/kpis', async (req, res) => {
  try {
    const rows = await prisma.indicador.findMany({
      where: { solicitud_id: req.params.id },
    })
    res.json(rows.map(r => ({
      name: r.nombre,
      value: r.valor !== null ? Number(r.valor) : null,
      format: r.formato,
      benchmark: r.benchmark,
      status: r.estado,
    })))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ═══════════════════════════════════════════════════════════════
// Recomendación
// ═══════════════════════════════════════════════════════════════

router.get('/solicitudes/:id/recommendation', async (req, res) => {
  try {
    const rec = await prisma.recomendacion.findUnique({
      where: { solicitud_id: req.params.id },
      include: { condiciones: true },
    })
    if (!rec) return res.status(404).json({ error: 'No recommendation' })
    res.json({
      action: rec.accion,
      suggestedAmount: Number(rec.monto_sugerido),
      suggestedTermMonths: rec.plazo_sugerido_meses,
      suggestedRate: rec.tasa_sugerida,
      conditions: rec.condiciones.map(c => c.texto_condicion),
      analystNotes: rec.notas_analista,
    })
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

// ═══════════════════════════════════════════════════════════════
// Decisión del analista
// ═══════════════════════════════════════════════════════════════

router.post('/solicitudes/:id/decision', async (req, res) => {
  try {
    const { type, reason } = req.body
    const decision = await prisma.decision.upsert({
      where: { solicitud_id: req.params.id },
      update: { tipo: type, motivo: reason || null },
      create: { solicitud_id: req.params.id, tipo: type, motivo: reason || null },
    })
    res.json({ id: decision.id, type: decision.tipo, reason: decision.motivo })
  } catch (err) {
    res.status(400).json({ error: err.message })
  }
})

// ═══════════════════════════════════════════════════════════════
// Créditos + covenants (post-desembolso)
// ═══════════════════════════════════════════════════════════════

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

// ═══════════════════════════════════════════════════════════════
// Backward-compatible aliases (old /applications → /solicitudes)
// ═══════════════════════════════════════════════════════════════

router.get('/applications', async (req, res) => {
  // Redirect to solicitudes endpoint logic
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 100, 500)
    const offset = Math.max(parseInt(req.query.offset, 10) || 0, 0)
    const q = (req.query.q || '').toString().trim()

    const where = q
      ? { cliente: { OR: [
          { razon_social: { contains: q, mode: 'insensitive' } },
          { nombre_comercial: { contains: q, mode: 'insensitive' } },
        ]}}
      : {}

    const rows = await prisma.solicitud.findMany({
      where,
      orderBy: { created_at: 'desc' },
      take: limit,
      skip: offset,
      include: {
        cliente: { select: { razon_social: true } },
      },
    })

    res.json(rows.map(r => ({
      id: r.id,
      applicant: r.cliente.razon_social,
      requestedAmount: Number(r.monto),
      termMonths: null,
      purpose: r.destino,
      submittedAt: r.created_at,
      documentsStatus: {
        total: r.docs_total,
        uploaded: r.docs_subidos,
        validated: 0,
        pendingReview: 0,
      },
    })))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
