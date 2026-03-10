#!/usr/bin/env node
'use strict'

/**
 * Script de prueba para calcular indicadores de rentabilidad
 * 
 * Uso:
 *   node scripts/test-rentabilidad.cjs <solicitud_id>
 * 
 * Ejemplo:
 *   node scripts/test-rentabilidad.cjs 7ca034b9-c0cf-4681-ac14-5c4cf7d44663
 */

const { PrismaClient } = require('@prisma/client')
const { calcularIndicadoresRentabilidad, guardarIndicadoresRentabilidad } = require('../server/services/indicadoresService.cjs')

const prisma = new PrismaClient()

async function main() {
  const solicitudId = process.argv[2]

  if (!solicitudId) {
    console.error('❌ Debes proporcionar un ID de solicitud')
    console.log('Uso: node scripts/test-rentabilidad.cjs <solicitud_id>')
    process.exit(1)
  }

  console.log(`\n═══════════════════════════════════════════════════════════`)
  console.log(`  Test de Indicadores de Rentabilidad`)
  console.log(`═══════════════════════════════════════════════════════════\n`)
  console.log(`Solicitud ID: ${solicitudId}\n`)

  // Verificar que la solicitud existe
  const solicitud = await prisma.solicitud.findUnique({
    where: { id: solicitudId },
    include: { cliente: true }
  })

  if (!solicitud) {
    console.error(`❌ Solicitud no encontrada: ${solicitudId}`)
    process.exit(1)
  }

  console.log(`✅ Solicitud encontrada: ${solicitud.cliente.razon_social}\n`)

  // Mostrar campos extraídos relevantes
  console.log(`─── Campos Extraídos Relevantes ───\n`)
  
  const camposRelevantes = await prisma.campoExtraido.findMany({
    where: {
      solicitud_id: solicitudId,
      campo: {
        in: [
          'Resultado del Ejercicio',
          'Ventas',
          'Total Activo Circulante',
          'Total Activo Fijo',
          'Suma Capital Contable'
        ]
      }
    },
    orderBy: { campo: 'asc' }
  })

  if (camposRelevantes.length === 0) {
    console.log('⚠️  No se encontraron campos extraídos relevantes para calcular rentabilidad\n')
  } else {
    camposRelevantes.forEach(campo => {
      const valor = campo.valor ? parseFloat(campo.valor).toLocaleString('es-MX') : 'null'
      console.log(`  ${campo.campo}: ${valor} (${campo.seccion})`)
    })
    console.log('')
  }

  // Calcular indicadores
  console.log(`─── Calculando Indicadores ───\n`)
  const indicadores = await calcularIndicadoresRentabilidad(solicitudId)

  if (indicadores.error) {
    console.error(`\n❌ Error: ${indicadores.error}\n`)
    process.exit(1)
  }

  console.log(`\n─── Resultados ───\n`)
  
  console.log(`1. Margen de Utilidad (MU):`)
  console.log(`   Valor: ${indicadores.margenUtilidad !== null ? indicadores.margenUtilidad.toFixed(2) + '%' : 'N/A'}`)
  console.log(`   SMU (Scoring): ${indicadores.scoringSMU !== null ? indicadores.scoringSMU + '%' : 'N/A'}`)
  console.log(`   Fórmula: (Resultado Ejercicio / Ventas) × 100\n`)

  console.log(`2. ROA (Return on Assets):`)
  console.log(`   Valor: ${indicadores.roa !== null ? indicadores.roa.toFixed(2) + '%' : 'N/A'}`)
  console.log(`   SROA (Scoring): ${indicadores.scoringSROA !== null ? indicadores.scoringSROA + '%' : 'N/A'}`)
  console.log(`   Fórmula: (Resultado Ejercicio / Total Activo) × 100\n`)

  console.log(`3. ROE (Return on Equity):`)
  console.log(`   Valor: ${indicadores.roe !== null ? indicadores.roe.toFixed(2) + '%' : 'N/A'}`)
  console.log(`   SROE (Scoring): ${indicadores.scoringSROE !== null ? indicadores.scoringSROE + '%' : 'N/A'}`)
  console.log(`   Fórmula: (Resultado Ejercicio / Suma Capital Contable) × 100\n`)

  console.log(`4. Scoring de Rentabilidad:`)
  console.log(`   ${indicadores.scoringRentabilidad !== null ? indicadores.scoringRentabilidad.toFixed(2) + '%' : 'N/A'}`)
  console.log(`   Fórmula: (SMU + SROA + SROE) / 3\n`)

  // Guardar en base de datos
  console.log(`─── Guardando en Base de Datos ───\n`)
  const count = await guardarIndicadoresRentabilidad(solicitudId)
  console.log(`✅ ${count} indicadores guardados en la tabla 'indicadores'\n`)

  // Mostrar indicadores guardados
  const indicadoresGuardados = await prisma.indicador.findMany({
    where: {
      solicitud_id: solicitudId,
      nombre: {
        in: ['Margen de Utilidad', 'SMU', 'ROA', 'SROA', 'ROE', 'SROE', 'Scoring Rentabilidad']
      }
    },
    orderBy: { nombre: 'asc' }
  })

  console.log(`─── Indicadores en BD ───\n`)
  indicadoresGuardados.forEach(ind => {
    const valorDisplay = ind.formato === 'percent' 
      ? (ind.valor * 100).toFixed(2) + '%' 
      : ind.valor.toFixed(4)
    console.log(`  ${ind.nombre}: ${valorDisplay} [${ind.estado}]`)
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
