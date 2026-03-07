const express = require('express')
const prisma = require('../prisma.cjs')

const router = express.Router()

// GET /clientes — lista con búsqueda y paginación
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

// GET /clientes/:id — detalle
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

// POST /clientes — crear
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

// PUT /clientes/:id — actualizar
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

module.exports = router
