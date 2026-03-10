#!/usr/bin/env node
'use strict'

/**
 * Script de prueba para verificar el cálculo del score de buró de crédito
 * 
 * Uso:
 *   node scripts/test-buro.cjs [solicitudId]
 * 
 * Si no se proporciona solicitudId, se usa una solicitud de ejemplo del seed
 */

const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

async function testScoreBuro() {
  try {
    // 1. Buscar una solicitud existente o usar el ID proporcionado
    const solicitudId = process.argv[2]
    
    let solicitud
    if (solicitudId) {
      solicitud = await prisma.solicitud.findUnique({
        where: { id: solicitudId },
        include: { cliente: true }
      })
      if (!solicitud) {
        console.error(`❌ Solicitud ${solicitudId} no encontrada`)
        process.exit(1)
      }
    } else {
      // Buscar la primera solicitud con nivel de buró
      solicitud = await prisma.solicitud.findFirst({
        where: { nivel_buro_credito: { not: null } },
        include: { cliente: true }
      })
      
      if (!solicitud) {
        console.log('📝 No hay solicitudes con nivel de buró. Creando una de prueba...')
        
        // Crear un cliente de prueba
        const cliente = await prisma.cliente.create({
          data: {
            razon_social: 'Empresa Test Buró',
            nombre_comercial: 'Test Buró',
            rfc: 'TST123456789',
          }
        })
        
        // Crear solicitud de prueba con nivel B1
        solicitud = await prisma.solicitud.create({
          data: {
            cliente_id: cliente.id,
            monto: 500000,
            divisa: 'MXN',
            destino: 'Prueba de score de buró',
            nivel_buro_credito: 'B1',
          },
          include: { cliente: true }
        })
        
        console.log(`✅ Solicitud de prueba creada: ${solicitud.id}`)
      }
    }
    
    console.log('\n=== PRUEBA DE SCORE DE BURÓ ===\n')
    console.log(`Solicitud ID: ${solicitud.id}`)
    console.log(`Cliente: ${solicitud.cliente.razon_social}`)
    console.log(`Nivel buró actual: ${solicitud.nivel_buro_credito || 'Sin especificar'}`)
    console.log('')
    
    // 2. Probar diferentes niveles de buró
    const nivelesTest = ['A1', 'A2', 'B1', 'B2', 'C1', 'C2', 'D1', 'D2', 'E']
    const scoresEsperados = {
      'A1': 100, 'A2': 100,
      'B1': 90, 'B2': 90,
      'C1': 80, 'C2': 80,
      'D1': 70, 'D2': 70,
      'E': 0
    }
    
    console.log('📊 Probando cálculo de score para cada nivel:\n')
    
    for (const nivel of nivelesTest) {
      // Actualizar el nivel de buró
      await prisma.solicitud.update({
        where: { id: solicitud.id },
        data: { nivel_buro_credito: nivel }
      })
      
      // Calcular el score usando la API (simular)
      const { guardarScoreBuro } = require('../server/services/indicadoresService.cjs')
      await guardarScoreBuro(solicitud.id)
      
      // Leer el indicador guardado
      const indicador = await prisma.indicador.findFirst({
        where: {
          solicitud_id: solicitud.id,
          nombre: 'Score Buró de Crédito'
        },
        orderBy: { created_at: 'desc' }
      })
      
      const scoreObtenido = indicador ? Number(indicador.valor) : null
      const scoreEsperado = scoresEsperados[nivel]
      const estado = indicador ? indicador.estado : 'N/A'
      
      const check = scoreObtenido === scoreEsperado ? '✅' : '❌'
      console.log(`${check} Nivel ${nivel.padEnd(2)}: Score esperado = ${scoreEsperado}, obtenido = ${scoreObtenido}, estado = ${estado}`)
    }
    
    console.log('\n=== VERIFICACIÓN FINAL ===\n')
    
    // Restaurar nivel original
    await prisma.solicitud.update({
      where: { id: solicitud.id },
      data: { nivel_buro_credito: solicitud.nivel_buro_credito }
    })
    
    // Verificar todos los indicadores
    const indicadores = await prisma.indicador.findMany({
      where: {
        solicitud_id: solicitud.id,
        nombre: 'Score Buró de Crédito'
      },
      orderBy: { created_at: 'desc' }
    })
    
    console.log(`Total de indicadores de buró creados: ${indicadores.length}`)
    if (indicadores.length > 0) {
      console.log(`Último score registrado: ${indicadores[0].valor}`)
      console.log(`Estado: ${indicadores[0].estado}`)
      console.log(`Benchmark: ${indicadores[0].benchmark}`)
    }
    
    console.log('\n✅ Prueba completada exitosamente\n')
    
  } catch (error) {
    console.error('❌ Error en la prueba:', error.message)
    console.error(error)
    process.exit(1)
  } finally {
    await prisma.$disconnect()
  }
}

testScoreBuro()
