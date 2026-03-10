#!/usr/bin/env node
'use strict'

/**
 * Script para re-extraer datos de un documento usando Bedrock
 * (llama a Bedrock de nuevo, no solo regenera campos)
 * 
 * Uso:
 *   node scripts/reextraer-documento.cjs <documento_id>
 */

const { PrismaClient } = require('@prisma/client')
const { extractFinancialStatementsData } = require('../server/services/bedrockService.cjs')
const { processDocumentoCampos } = require('../server/services/campoExtraidoService.cjs')

const prisma = new PrismaClient()

async function main() {
  const documentoId = process.argv[2]

  if (!documentoId) {
    console.error('❌ Debes proporcionar un ID de documento')
    console.log('Uso: node scripts/reextraer-documento.cjs <documento_id>')
    process.exit(1)
  }

  console.log(`\n═══════════════════════════════════════════════════════════`)
  console.log(`  Re-extraer Documento con Bedrock`)
  console.log(`═══════════════════════════════════════════════════════════\n`)
  console.log(`Documento ID: ${documentoId}\n`)

  // Obtener el documento
  const documento = await prisma.documento.findUnique({
    where: { id: documentoId },
    include: { solicitud: { include: { cliente: true } } }
  })

  if (!documento) {
    console.error(`❌ Documento no encontrado: ${documentoId}`)
    process.exit(1)
  }

  console.log(`✅ Documento encontrado:`)
  console.log(`   Archivo: ${documento.nombre_archivo}`)
  console.log(`   Tipo: ${documento.tipo_documento_id}`)
  console.log(`   Solicitud: ${documento.solicitud.cliente.razon_social}`)
  console.log(`   Estado actual: ${documento.estado}\n`)

  if (!documento.raw_text) {
    console.error(`❌ El documento no tiene raw_text. No se puede re-extraer.`)
    process.exit(1)
  }

  // Llamar a Bedrock para re-extraer datos
  console.log(`⚙️  Llamando a Bedrock para extraer datos financieros...\n`)
  const bedrockResult = await extractFinancialStatementsData(documento.raw_text)

  if (bedrockResult.parseError) {
    console.error(`❌ Error parseando respuesta de Bedrock: ${bedrockResult.parseError}`)
    process.exit(1)
  }

  // Actualizar extracted_data en el documento
  await prisma.documento.update({
    where: { id: documentoId },
    data: {
      extracted_data: bedrockResult,
      estado: 'pendiente' // Para que processDocumentoCampos lo marque como procesado
    }
  })

  console.log(`✅ extracted_data actualizado en documento\n`)

  // Eliminar campos extraídos previos
  const deleted = await prisma.campoExtraido.deleteMany({
    where: { documento_id: documentoId }
  })
  console.log(`🗑️  ${deleted.count} campos extraídos previos eliminados\n`)

  // Re-obtener documento con nuevo extracted_data
  const documentoActualizado = await prisma.documento.findUnique({
    where: { id: documentoId }
  })

  // Regenerar campos extraídos
  console.log(`⚙️  Regenerando campos extraídos...\n`)
  const count = await processDocumentoCampos(documentoActualizado)

  console.log(`\n✅ ${count} campos extraídos regenerados\n`)

  // Mostrar campos relevantes
  const campos = await prisma.campoExtraido.findMany({
    where: {
      documento_id: documentoId,
      OR: [
        { campo: { contains: 'Resultado' } },
        { campo: { contains: 'Capital Contable' } }
      ]
    },
    select: { campo: true, valor: true, seccion: true }
  })

  console.log(`─── Campos de Resultado y Capital Contable ───\n`)
  campos.forEach(c => {
    console.log(`  ${c.campo}: ${c.valor} (${c.seccion})`)
  })

  console.log(`\n═══════════════════════════════════════════════════════════\n`)
}

main()
  .catch(err => {
    console.error('\n❌ Error:', err.message)
    console.error(err)
    process.exit(1)
  })
  .finally(() => {
    prisma.$disconnect()
  })
