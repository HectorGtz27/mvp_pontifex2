#!/usr/bin/env node
'use strict'

/**
 * Script para reprocesar un documento y regenerar sus campos extraídos
 * 
 * Uso:
 *   node scripts/reprocesar-documento.cjs <documento_id>
 */

const { PrismaClient } = require('@prisma/client')
const { processDocumentoCampos } = require('../server/services/campoExtraidoService.cjs')

const prisma = new PrismaClient()

async function main() {
  const documentoId = process.argv[2]

  if (!documentoId) {
    console.error('❌ Debes proporcionar un ID de documento')
    console.log('Uso: node scripts/reprocesar-documento.cjs <documento_id>')
    process.exit(1)
  }

  console.log(`\n═══════════════════════════════════════════════════════════`)
  console.log(`  Reprocesar Documento`)
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

  if (!documento.extracted_data) {
    console.error(`❌ El documento no tiene extracted_data. Primero debe procesarse con Textract/Bedrock.`)
    process.exit(1)
  }

  // Eliminar campos extraídos previos
  const deleted = await prisma.campoExtraido.deleteMany({
    where: { documento_id: documentoId }
  })
  console.log(`🗑️  ${deleted.count} campos extraídos previos eliminados\n`)

  // Reprocesar el documento
  console.log(`⚙️  Reprocesando campos extraídos...\n`)
  const count = await processDocumentoCampos(documento)

  console.log(`\n✅ ${count} campos extraídos regenerados\n`)

  // Mostrar algunos campos extraídos
  const campos = await prisma.campoExtraido.findMany({
    where: { documento_id: documentoId },
    select: { campo: true, valor: true, seccion: true },
    take: 10
  })

  console.log(`─── Primeros 10 campos extraídos ───\n`)
  campos.forEach(c => {
    const valor = c.valor ? (c.valor.length > 30 ? c.valor.slice(0, 30) + '...' : c.valor) : 'null'
    console.log(`  ${c.campo}: ${valor}`)
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
