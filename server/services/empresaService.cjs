const prisma = require('../prisma.cjs')

/**
 * Inserts a new empresa record from data extracted by Textract.
 *
 * - Handles null / undefined values gracefully.
 * - Parses numero_empleados to Int (Textract returns strings).
 * - created_at is set automatically by Prisma.
 *
 * @param {Object} data - Extracted fields from Textract
 * @returns {Promise<Object>} The inserted empresa record
 */
async function createEmpresa(data) {
  console.log(`\n[EmpresaService] ▶ INICIANDO createEmpresa()`)
  console.log(`[EmpresaService] Datos recibidos:`, JSON.stringify(data, null, 2))

  if (!data) {
    console.error(`[EmpresaService] ✗ data es null/undefined`)
    throw new Error('Data is null or undefined')
  }

  const numero = parseInt(data.numero_empleados, 10)
  console.log(`[EmpresaService] numero_empleados: "${data.numero_empleados}" → ${numero} (${Number.isNaN(numero) ? 'NaN' : 'válido'})`)

  const dataToInsert = {
    razon_social:       data.razon_social       ?? 'Sin razón social',
    nombre_comercial:   data.nombre_comercial   ?? null,
    rfc:                data.rfc                 ?? 'SIN_RFC',
    domicilio_fiscal:   data.domicilio_fiscal    ?? null,
    ciudad:             data.ciudad              ?? null,
    estado:             data.estado              ?? null,
    telefono:           data.telefono            ?? null,
    correo_electronico: data.correo_electronico  ?? null,
    pagina_web:         data.pagina_web          ?? null,
    numero_empleados:   Number.isNaN(numero) ? null : numero,
  }

  console.log(`[EmpresaService] Objeto a insertar en BD:`, JSON.stringify(dataToInsert, null, 2))

  const empresa = await prisma.empresa.create({
    data: dataToInsert,
  })

  console.log(`[EmpresaService] ✓ Registro creado en BD`)
  console.log(`[EmpresaService] ID: ${empresa.id}`)
  console.log(`[EmpresaService] Razón Social: ${empresa.razon_social}`)
  console.log(`[EmpresaService] RFC: ${empresa.rfc}`)

  return empresa
}

module.exports = { createEmpresa }
