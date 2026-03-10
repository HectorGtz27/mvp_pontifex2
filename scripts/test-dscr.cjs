#!/usr/bin/env node
'use strict'

/**
 * Script para probar el cálculo de DSCR (Debt Service Coverage Ratio)
 * DSCR = Utilidad de Operación / Gastos Financieros
 */

const { calcularIndicadoresDSCR, guardarIndicadoresDSCR } = require('../server/services/indicadoresService.cjs')
const prisma = require('../server/prisma.cjs')

async function main() {
  console.log('═══════════════════════════════════════════════════════')
  console.log('  Prueba de cálculo de DSCR')
  console.log('═══════════════════════════════════════════════════════\n')

  // Buscar una solicitud con estados financieros
  const solicitud = await prisma.solicitud.findFirst({
    where: {
      documentos: {
        some: {
          tipo_documento_id: 'estados_financieros'
        }
      }
    },
    include: {
      cliente: true,
      documentos: {
        where: {
          tipo_documento_id: 'estados_financieros'
        }
      }
    }
  })

  if (!solicitud) {
    console.error('❌ No se encontró ninguna solicitud con estados financieros')
    process.exit(1)
  }

  console.log(`✅ Solicitud encontrada: ${solicitud.id}`)
  console.log(`   Cliente: ${solicitud.cliente.razon_social}`)
  console.log(`   Documentos EF: ${solicitud.documentos.length}\n`)

  // Verificar que existan los campos necesarios
  const camposExtraidos = await prisma.campoExtraido.findMany({
    where: {
      solicitud_id: solicitud.id,
      seccion: 'estado_resultados'
    }
  })

  console.log('📊 Campos extraídos del Estado de Resultados:')
  camposExtraidos.forEach(campo => {
    console.log(`   - ${campo.campo}: ${campo.valor}`)
  })
  console.log('')

  // Calcular DSCR
  console.log('🔢 Calculando DSCR...\n')
  const indicadores = await calcularIndicadoresDSCR(solicitud.id)

  if (indicadores.error) {
    console.error(`❌ Error: ${indicadores.error}`)
    process.exit(1)
  }

  console.log('✅ Resultado del cálculo:')
  console.log(`   Utilidad de Operación: $${indicadores.utilidadOperacion?.toLocaleString('es-MX')}`)
  console.log(`   Gastos Financieros: $${indicadores.gastosFinancieros?.toLocaleString('es-MX')}`)
  console.log(`   DSCR: ${indicadores.dscr}`)
  console.log(`   Scoring DSCR: ${indicadores.scoringDSCR}%`)
  console.log('')

  // Guardar en base de datos
  console.log('💾 Guardando en base de datos...\n')
  const count = await guardarIndicadoresDSCR(solicitud.id)
  console.log(`✅ ${count} indicadores guardados\n`)

  // Verificar indicadores guardados
  const indicadoresGuardados = await prisma.indicador.findMany({
    where: {
      solicitud_id: solicitud.id,
      nombre: { in: ['DSCR', 'Scoring DSCR'] }
    }
  })

  console.log('📋 Indicadores guardados en BD:')
  indicadoresGuardados.forEach(ind => {
    console.log(`   ${ind.nombre}: ${ind.valor} (${ind.formato || 'sin formato'})`)
    console.log(`     Estado: ${ind.estado}`)
    console.log(`     Benchmark: ${ind.benchmark}`)
    console.log('')
  })

  console.log('═══════════════════════════════════════════════════════')
  console.log('✅ Prueba completada exitosamente')
  console.log('═══════════════════════════════════════════════════════')

  await prisma.$disconnect()
}

main().catch(err => {
  console.error('❌ Error:', err.message)
  console.error(err.stack)
  process.exit(1)
})
