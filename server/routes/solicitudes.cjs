const express = require('express')
const prisma = require('../prisma.cjs')

const router = express.Router()

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
      include: {
        tipo_documento: { select: { label: true, categoria_id: true } },
        estado_cuenta: true,
        cuenta_bancaria: { select: { banco: true, divisa: true } },
      },
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
      // Datos bancarios (solo para estados de cuenta)
      estadoCuenta: d.estado_cuenta ? {
        periodo: d.estado_cuenta.periodo,
        abonos: d.estado_cuenta.abonos ? Number(d.estado_cuenta.abonos) : null,
        retiros: d.estado_cuenta.retiros ? Number(d.estado_cuenta.retiros) : null,
        saldoPromedio: d.estado_cuenta.saldo_promedio ? Number(d.estado_cuenta.saldo_promedio) : null,
      } : null,
      banco: d.cuenta_bancaria?.banco ?? null,
      divisa: d.cuenta_bancaria?.divisa ?? null,
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
// Cuentas Bancarias (por solicitud)
// ═══════════════════════════════════════════════════════════════

router.get('/solicitudes/:id/cuentas-bancarias', async (req, res) => {
  try {
    const cuentas = await prisma.cuentaBancaria.findMany({
      where: { solicitud_id: req.params.id },
      orderBy: [{ banco: 'asc' }, { divisa: 'asc' }],
      include: {
        documentos: {
          where: { tipo_documento_id: { in: ['edos_cuenta_bancarios', 'estado_cuenta_bancario'] } },
          select: {
            id: true,
            confianza: true,
            estado: true,
            nombre_archivo: true,
            created_at: true,
            estado_cuenta: true,
          },
          orderBy: { created_at: 'asc' },
        },
      },
    })

    res.json(cuentas.map(c => ({
      id: c.id,
      solicitudId: c.solicitud_id,
      banco: c.banco,
      divisa: c.divisa,
      alias: c.alias,
      createdAt: c.created_at,
      documentos: c.documentos.map(d => ({
        id: d.id,
        periodo: d.estado_cuenta?.periodo ?? null,
        divisa: c.divisa,
        banco: c.banco,
        abonos: d.estado_cuenta?.abonos != null ? Number(d.estado_cuenta.abonos) : null,
        retiros: d.estado_cuenta?.retiros != null ? Number(d.estado_cuenta.retiros) : null,
        saldoPromedio: d.estado_cuenta?.saldo_promedio != null ? Number(d.estado_cuenta.saldo_promedio) : null,
        confianza: d.confianza != null ? Number(d.confianza) : null,
        estado: d.estado,
        nombreArchivo: d.nombre_archivo,
        createdAt: d.created_at,
      })),
      mesesCubiertos: c.documentos
        .map(d => d.estado_cuenta?.periodo)
        .filter(Boolean)
        .sort(),
    })))
  } catch (err) {
    res.status(500).json({ error: err.message })
  }
})

module.exports = router
