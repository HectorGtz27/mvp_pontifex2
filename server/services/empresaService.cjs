const prisma = require('../prisma.cjs')

/**
 * Enriches a Cliente record with OCR data extracted from the CSF.
 *
 * @param {string} clienteId - UUID of the existing Cliente
 * @param {Object} data - Extracted fields from Textract
 * @returns {Promise<Object>} The updated Cliente record
 */
async function enrichClienteFromCSF(clienteId, data) {
  console.log(`\n[EmpresaService] ▶ INICIANDO enrichClienteFromCSF()`)
  console.log(`[EmpresaService] clienteId: ${clienteId}`)
  console.log(`[EmpresaService] Datos recibidos:`, JSON.stringify(data, null, 2))

  if (!data) {
    console.error(`[EmpresaService] ✗ data es null/undefined`)
    throw new Error('Data is null or undefined')
  }

  const cliente = await prisma.cliente.update({
    where: { id: clienteId },
    data: {
      razon_social:     data.razon_social     || undefined,
      nombre_comercial: data.nombre_comercial || undefined,
      rfc:              data.rfc              || undefined,
      domicilio_fiscal: data.domicilio_fiscal || undefined,
      ciudad:           data.ciudad           || undefined,
      estado:           data.estado           || undefined,
      pagina_web:       data.pagina_web       || undefined,
    },
  })

  console.log(`[EmpresaService] ✓ Cliente enriquecido con datos CSF`)
  console.log(`[EmpresaService] ID: ${cliente.id}`)
  console.log(`[EmpresaService] Razón Social: ${cliente.razon_social}`)
  console.log(`[EmpresaService] RFC: ${cliente.rfc}`)

  return cliente
}

module.exports = { enrichClienteFromCSF }
