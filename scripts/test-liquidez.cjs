#!/usr/bin/env node
'use strict'

/**
 * Script de prueba para calcular indicadores de liquidez
 */

const prisma = require('../server/prisma.cjs')
const { calcularIndicadoresLiquidez, guardarIndicadoresLiquidez, obtenerValorCampo } = require('../server/services/indicadoresService.cjs')

async function main() {
  console.log('🧪 Test: Cálculo de Indicadores de Liquidez\n')

  // Buscar una solicitud que tenga campos extraídos de balance general
  const solicitud = await prisma.solicitud.findFirst({
    where: {
      campos_extraidos: {
        some: {
          seccion: 'balance_general'
        }
      }
    },
    include: {
      cliente: { select: { razon_social: true } },
      campos_extraidos: {
        where: {
          seccion: 'balance_general',
          campo: {
            in: ['Total Activo Circulante', 'Total Pasivo Circulante', 'Inventarios']
          }
        }
      }
    }
  })

  if (!solicitud) {
    console.log('❌ No se encontró ninguna solicitud con datos de Balance General')
    console.log('💡 Sube primero un estado financiero desde el frontend')
    return
  }

  console.log(`📋 Solicitud: ${solicitud.cliente.razon_social}`)
  console.log(`   ID: ${solicitud.id}`)
  console.log(`   Monto: $${Number(solicitud.monto).toLocaleString()} ${solicitud.divisa}\n`)

  console.log('📊 Campos extraídos disponibles:')
  for (const campo of solicitud.campos_extraidos) {
    console.log(`   • ${campo.campo}: ${campo.valor}`)
  }
  console.log()

  // Calcular indicadores
  console.log('⚙️  Calculando indicadores de liquidez...\n')
  const indicadores = await calcularIndicadoresLiquidez(solicitud.id)

  if (indicadores.error) {
    console.log('❌ Error:', indicadores.error)
    return
  }

  console.log('✅ Resultados:')
  console.log('─────────────────────────────────────────────')
  console.log(`   Razón Circulante:       ${indicadores.razonCirculante?.toFixed(2) ?? 'N/A'}`)
  console.log(`   Scoring RC:             ${indicadores.scoringRC}%`)
  console.log()
  console.log(`   Prueba Ácida:           ${indicadores.pruebaAcida?.toFixed(2) ?? 'N/A'}`)
  console.log(`   Scoring PA:             ${indicadores.scoringPA}%`)
  console.log()
  console.log(`   📈 SCORING DE LIQUIDEZ:  ${indicadores.scoringLiquidez}%`)
  console.log(`   💧 LIQUIDEZ (45%):       ${indicadores.liquidez}%`)
  console.log('─────────────────────────────────────────────\n')

  // Guardar en base de datos
  console.log('💾 Guardando indicadores en la base de datos...')
  const count = await guardarIndicadoresLiquidez(solicitud.id)
  console.log(`✅ ${count} indicadores guardados\n`)

  // Verificar que se guardaron correctamente
  const indicadoresGuardados = await prisma.indicador.findMany({
    where: {
      solicitud_id: solicitud.id,
      nombre: {
        in: ['Razón Circulante', 'Scoring RC', 'Prueba Ácida', 'Scoring PA', 'Scoring Liquidez', 'Liquidez']
      }
    },
    orderBy: { nombre: 'asc' }
  })

  console.log('📋 Indicadores en base de datos:')
  for (const ind of indicadoresGuardados) {
    const valor = ind.formato === 'percent' 
      ? `${Number(ind.valor)}%` 
      : Number(ind.valor).toFixed(2)
    console.log(`   • ${ind.nombre}: ${valor} [${ind.estado}] (${ind.benchmark})`)
  }

  console.log('\n✅ Test completado exitosamente')
}

main()
  .catch(err => {
    console.error('❌ Error:', err)
    process.exit(1)
  })
  .finally(() => {
    prisma.$disconnect()
  })
