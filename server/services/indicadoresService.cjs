'use strict'

const prisma = require('../prisma.cjs')

// ═══════════════════════════════════════════════════════════════
// Servicio de Indicadores Financieros
// Calcula KPIs a partir de datos en campos_extraidos
// ═══════════════════════════════════════════════════════════════

/**
 * Obtiene el valor de un campo extraído para una solicitud específica
 * @param {string} solicitudId - UUID de la solicitud
 * @param {string} campoLabel - Etiqueta del campo a buscar
 * @param {string} seccion - Sección del campo (ej: 'balance_general')
 * @returns {Promise<number|null>} Valor numérico o null si no se encuentra
 */
async function obtenerValorCampo(solicitudId, campoLabel, seccion = null) {
  const where = {
    solicitud_id: solicitudId,
    campo: campoLabel,
  }
  
  if (seccion) {
    where.seccion = seccion
  }

  const campo = await prisma.campoExtraido.findFirst({
    where,
    orderBy: { created_at: 'desc' }, // Usar el más reciente si hay duplicados
  })

  if (!campo || !campo.valor) {
    return null
  }

  // Convertir a número, limpiando comas y caracteres no numéricos
  const valor = parseFloat(String(campo.valor).replace(/,/g, ''))
  return isNaN(valor) ? null : valor
}

/**
 * Calcula el scoring basado en la razón circulante
 * RC > 1.5 = 100%
 * RC entre 1.0 y 1.5 = 80%
 * RC < 1.0 = 60%
 */
function calcularScoringRC(razonCirculante) {
  if (razonCirculante === null) return null
  if (razonCirculante > 1.5) return 100
  if (razonCirculante >= 1.0) return 80
  return 60
}

/**
 * Calcula el scoring basado en la prueba ácida
 * PA > 1.2 = 100%
 * PA entre 0.8 y 1.2 = 80%
 * PA < 0.8 = 60%
 */
function calcularScoringPA(pruebaAcida) {
  if (pruebaAcida === null) return null
  if (pruebaAcida > 1.2) return 100
  if (pruebaAcida >= 0.8) return 80
  return 60
}

/**
 * Calcula los indicadores de liquidez para una solicitud
 * @param {string} solicitudId - UUID de la solicitud
 * @returns {Promise<Object>} Objeto con los indicadores calculados
 */
async function calcularIndicadoresLiquidez(solicitudId) {
  // Obtener valores necesarios de campos_extraidos
  const totalActivoCirculante = await obtenerValorCampo(
    solicitudId, 
    'Total Activo Circulante', 
    'balance_general'
  )
  
  const totalPasivoCirculante = await obtenerValorCampo(
    solicitudId, 
    'Total Pasivo Circulante', 
    'balance_general'
  )
  
  const inventarios = await obtenerValorCampo(
    solicitudId, 
    'Inventarios', 
    'balance_general'
  )

  console.log(`[Liquidez] Valores obtenidos para solicitud ${solicitudId}:`)
  console.log(`  Total Activo Circulante: ${totalActivoCirculante}`)
  console.log(`  Total Pasivo Circulante: ${totalPasivoCirculante}`)
  console.log(`  Inventarios: ${inventarios}`)

  // Validar que tenemos los datos necesarios
  if (!totalActivoCirculante || !totalPasivoCirculante) {
    console.warn(`[Liquidez] Faltan datos para calcular indicadores de liquidez`)
    return {
      error: 'Faltan datos requeridos (Total Activo Circulante o Total Pasivo Circulante)',
      razonCirculante: null,
      scoringRC: null,
      pruebaAcida: null,
      scoringPA: null,
      scoringLiquidez: null,
    }
  }

  // Calcular Razón Circulante
  const razonCirculante = totalActivoCirculante / totalPasivoCirculante
  const scoringRC = calcularScoringRC(razonCirculante)

  // Calcular Prueba Ácida
  let pruebaAcida = null
  let scoringPA = null
  
  if (inventarios !== null) {
    pruebaAcida = (totalActivoCirculante - inventarios) / totalPasivoCirculante
    scoringPA = calcularScoringPA(pruebaAcida)
  } else {
    console.warn(`[Liquidez] No se encontraron Inventarios, no se puede calcular Prueba Ácida`)
  }

  // Calcular Scoring de Liquidez (promedio de ambos scorings)
  let scoringLiquidez = null
  let liquidez = null
  
  if (scoringRC !== null && scoringPA !== null) {
    scoringLiquidez = (scoringRC + scoringPA) / 2
    // Liquidez es el 45% del scoring de liquidez
    liquidez = scoringLiquidez * 0.45
  }

  const resultado = {
    razonCirculante: razonCirculante ? parseFloat(razonCirculante.toFixed(4)) : null,
    scoringRC,
    pruebaAcida: pruebaAcida ? parseFloat(pruebaAcida.toFixed(4)) : null,
    scoringPA,
    scoringLiquidez: scoringLiquidez ? parseFloat(scoringLiquidez.toFixed(2)) : null,
    liquidez: liquidez ? parseFloat(liquidez.toFixed(2)) : null,
  }

  console.log(`[Liquidez] ✅ Indicadores calculados:`, resultado)
  return resultado
}

/**
 * Guarda o actualiza los indicadores de liquidez en la tabla indicadores
 * @param {string} solicitudId - UUID de la solicitud
 * @returns {Promise<number>} Número de indicadores guardados
 */
async function guardarIndicadoresLiquidez(solicitudId) {
  const indicadores = await calcularIndicadoresLiquidez(solicitudId)

  if (indicadores.error) {
    console.error(`[Liquidez] No se pueden guardar indicadores: ${indicadores.error}`)
    return 0
  }

  // Eliminar indicadores de liquidez previos
  await prisma.indicador.deleteMany({
    where: {
      solicitud_id: solicitudId,
      nombre: {
        in: ['Razón Circulante', 'Scoring RC', 'Prueba Ácida', 'Scoring PA', 'Scoring Liquidez', 'Liquidez']
      }
    }
  })

  const indicadoresCreados = []

  // Guardar Razón Circulante
  if (indicadores.razonCirculante !== null) {
    indicadoresCreados.push({
      solicitud_id: solicitudId,
      nombre: 'Razón Circulante',
      valor: indicadores.razonCirculante,
      formato: null,
      benchmark: '> 1.5 óptimo, > 1.0 aceptable',
      estado: indicadores.razonCirculante >= 1.5 ? 'ok' : indicadores.razonCirculante >= 1.0 ? 'warning' : 'alert',
    })
  }

  // Guardar Scoring RC
  if (indicadores.scoringRC !== null) {
    indicadoresCreados.push({
      solicitud_id: solicitudId,
      nombre: 'Scoring RC',
      valor: indicadores.scoringRC,
      formato: 'percent',
      benchmark: '100% óptimo',
      estado: 'ok',
    })
  }

  // Guardar Prueba Ácida
  if (indicadores.pruebaAcida !== null) {
    indicadoresCreados.push({
      solicitud_id: solicitudId,
      nombre: 'Prueba Ácida',
      valor: indicadores.pruebaAcida,
      formato: null,
      benchmark: '> 1.2 óptimo, > 0.8 aceptable',
      estado: indicadores.pruebaAcida >= 1.2 ? 'ok' : indicadores.pruebaAcida >= 0.8 ? 'warning' : 'alert',
    })
  }

  // Guardar Scoring PA
  if (indicadores.scoringPA !== null) {
    indicadoresCreados.push({
      solicitud_id: solicitudId,
      nombre: 'Scoring PA',
      valor: indicadores.scoringPA,
      formato: 'percent',
      benchmark: '100% óptimo',
      estado: 'ok',
    })
  }

  // Guardar Scoring de Liquidez
  if (indicadores.scoringLiquidez !== null) {
    indicadoresCreados.push({
      solicitud_id: solicitudId,
      nombre: 'Scoring Liquidez',
      valor: indicadores.scoringLiquidez,
      formato: 'percent',
      benchmark: '100% óptimo',
      estado: indicadores.scoringLiquidez >= 90 ? 'ok' : indicadores.scoringLiquidez >= 70 ? 'warning' : 'alert',
    })
  }

  // Guardar Liquidez (45% del scoring de liquidez)
  if (indicadores.liquidez !== null) {
    indicadoresCreados.push({
      solicitud_id: solicitudId,
      nombre: 'Liquidez',
      valor: indicadores.liquidez,
      formato: 'percent',
      benchmark: '45% máximo (de 100%)',
      estado: indicadores.liquidez >= 40 ? 'ok' : indicadores.liquidez >= 30 ? 'warning' : 'alert',
    })
  }

  // Insertar todos los indicadores
  if (indicadoresCreados.length > 0) {
    await prisma.indicador.createMany({
      data: indicadoresCreados
    })
    console.log(`[Liquidez] ✅ ${indicadoresCreados.length} indicadores guardados en BD`)
  }

  return indicadoresCreados.length
}

/**
 * Calcula el scoring basado en el DSCR (Debt Service Coverage Ratio)
 * DSCR > 1.5 = 100%
 * DSCR entre 1.0 y 1.5 = 80%
 * DSCR < 1.0 = 30%
 */
function calcularScoringDSCR(dscr) {
  if (dscr === null) return null
  if (dscr > 1.5) return 100
  if (dscr >= 1.0) return 80
  return 30
}

/**
 * Calcula el scoring basado en el Margen de Utilidad
 * MU > 15% = 100%
 * MU entre 5% y 15% = 80%
 * MU < 5% = 60%
 */
function calcularScoringSMU(margenUtilidad) {
  if (margenUtilidad === null) return null
  if (margenUtilidad > 15) return 100
  if (margenUtilidad >= 5) return 80
  return 60
}

/**
 * Calcula el scoring basado en el ROA
 * ROA > 8% = 100%
 * ROA entre 4% y 8% = 80%
 * ROA < 4% = 60%
 */
function calcularScoringSROA(roa) {
  if (roa === null) return null
  if (roa > 8) return 100
  if (roa >= 4) return 80
  return 60
}

/**
 * Calcula el scoring basado en el ROE
 * ROE > 15% = 100%
 * ROE entre 8% y 15% = 80%
 * ROE < 8% = 60%
 */
function calcularScoringSROE(roe) {
  if (roe === null) return null
  if (roe > 15) return 100
  if (roe >= 8) return 80
  return 60
}

/**
 * Calcula los indicadores de rentabilidad para una solicitud
 * @param {string} solicitudId - UUID de la solicitud
 * @returns {Promise<Object>} Objeto con los indicadores calculados
 */
async function calcularIndicadoresRentabilidad(solicitudId) {
  // Obtener valores necesarios de campos_extraidos
  let resultadoEjercicioRaw = await obtenerValorCampo(
    solicitudId, 
    'Resultado del Ejercicio', 
    'estado_resultados'
  )
  
  const ventas = await obtenerValorCampo(
    solicitudId, 
    'Ventas', 
    'estado_resultados'
  )
  
  const totalActivoCirculante = await obtenerValorCampo(
    solicitudId, 
    'Total Activo Circulante', 
    'balance_general'
  )
  
  const totalActivoFijo = await obtenerValorCampo(
    solicitudId, 
    'Total Activo Fijo', 
    'balance_general'
  )
  
  const sumaCapitalContable = await obtenerValorCampo(
    solicitudId, 
    'Suma Capital Contable', 
    'balance_general'
  )

  // Si resultado_ejercicio parece ser un porcentaje (< 100), calcular monto absoluto
  let resultadoEjercicio = resultadoEjercicioRaw
  if (resultadoEjercicioRaw !== null && resultadoEjercicioRaw < 100 && ventas) {
    // Es muy probable que sea un porcentaje, calcular monto absoluto
    resultadoEjercicio = (resultadoEjercicioRaw / 100) * ventas
    console.log(`[Rentabilidad] Resultado del Ejercicio parece ser porcentaje (${resultadoEjercicioRaw}%), calculando monto absoluto: ${resultadoEjercicio}`)
  }

  console.log(`[Rentabilidad] Valores obtenidos para solicitud ${solicitudId}:`)
  console.log(`  Resultado del Ejercicio (raw): ${resultadoEjercicioRaw}`)
  console.log(`  Resultado del Ejercicio (calculado): ${resultadoEjercicio}`)
  console.log(`  Ventas: ${ventas}`)
  console.log(`  Total Activo Circulante: ${totalActivoCirculante}`)
  console.log(`  Total Activo Fijo: ${totalActivoFijo}`)
  console.log(`  Suma Capital Contable: ${sumaCapitalContable}`)

  // Validar que tenemos datos mínimos
  if (!resultadoEjercicio) {
    console.warn(`[Rentabilidad] Falta Resultado del Ejercicio`)
    return {
      error: 'Falta Resultado del Ejercicio',
      margenUtilidad: null,
      scoringSMU: null,
      roa: null,
      scoringSROA: null,
      roe: null,
      scoringSROE: null,
      scoringRentabilidad: null,
    }
  }

  // Calcular Margen de Utilidad
  let margenUtilidad = null
  let scoringSMU = null
  
  if (ventas && ventas !== 0) {
    margenUtilidad = (resultadoEjercicio / ventas) * 100
    scoringSMU = calcularScoringSMU(margenUtilidad)
  } else {
    console.warn(`[Rentabilidad] No se encontraron Ventas, no se puede calcular Margen de Utilidad`)
  }

  // Calcular ROA (Return on Assets)
  let roa = null
  let scoringSROA = null
  
  if (totalActivoCirculante !== null && totalActivoFijo !== null) {
    const totalActivo = totalActivoCirculante + totalActivoFijo
    if (totalActivo !== 0) {
      roa = (resultadoEjercicio / totalActivo) * 100
      scoringSROA = calcularScoringSROA(roa)
    }
  } else {
    console.warn(`[Rentabilidad] No se encontraron Total Activo Circulante o Total Activo Fijo, no se puede calcular ROA`)
  }

  // Calcular ROE (Return on Equity)
  let roe = null
  let scoringSROE = null
  
  if (sumaCapitalContable && sumaCapitalContable !== 0) {
    roe = (resultadoEjercicio / sumaCapitalContable) * 100
    scoringSROE = calcularScoringSROE(roe)
  } else {
    console.warn(`[Rentabilidad] No se encontró Suma Capital Contable, no se puede calcular ROE`)
  }

  // Calcular Scoring de Rentabilidad (promedio de los tres scorings)
  let scoringRentabilidad = null
  
  const scorings = [scoringSMU, scoringSROA, scoringSROE].filter(s => s !== null)
  if (scorings.length > 0) {
    scoringRentabilidad = scorings.reduce((a, b) => a + b, 0) / scorings.length
  }

  const resultado = {
    margenUtilidad: margenUtilidad !== null ? parseFloat(margenUtilidad.toFixed(2)) : null,
    scoringSMU,
    roa: roa !== null ? parseFloat(roa.toFixed(2)) : null,
    scoringSROA,
    roe: roe !== null ? parseFloat(roe.toFixed(2)) : null,
    scoringSROE,
    scoringRentabilidad: scoringRentabilidad !== null ? parseFloat(scoringRentabilidad.toFixed(2)) : null,
  }

  console.log(`[Rentabilidad] ✅ Indicadores calculados:`, resultado)
  return resultado
}

/**
 * Guarda o actualiza los indicadores de rentabilidad en la tabla indicadores
 * @param {string} solicitudId - UUID de la solicitud
 * @returns {Promise<number>} Número de indicadores guardados
 */
async function guardarIndicadoresRentabilidad(solicitudId) {
  const indicadores = await calcularIndicadoresRentabilidad(solicitudId)

  if (indicadores.error) {
    console.error(`[Rentabilidad] No se pueden guardar indicadores: ${indicadores.error}`)
    return 0
  }

  // Eliminar indicadores de rentabilidad previos
  await prisma.indicador.deleteMany({
    where: {
      solicitud_id: solicitudId,
      nombre: {
        in: ['Margen de Utilidad', 'SMU', 'ROA', 'SROA', 'ROE', 'SROE', 'Scoring Rentabilidad']
      }
    }
  })

  const indicadoresCreados = []

  // Guardar Margen de Utilidad
  if (indicadores.margenUtilidad !== null) {
    indicadoresCreados.push({
      solicitud_id: solicitudId,
      nombre: 'Margen de Utilidad',
      valor: indicadores.margenUtilidad / 100, // Guardar como decimal (0.15 = 15%)
      formato: 'percent',
      benchmark: '> 15% óptimo',
      estado: indicadores.margenUtilidad >= 15 ? 'ok' : indicadores.margenUtilidad >= 5 ? 'warning' : 'alert',
    })
  }

  // Guardar SMU (Scoring Margen de Utilidad)
  if (indicadores.scoringSMU !== null) {
    indicadoresCreados.push({
      solicitud_id: solicitudId,
      nombre: 'SMU',
      valor: indicadores.scoringSMU / 100, // Guardar como decimal
      formato: 'percent',
      benchmark: '100% óptimo',
      estado: 'ok',
    })
  }

  // Guardar ROA
  if (indicadores.roa !== null) {
    indicadoresCreados.push({
      solicitud_id: solicitudId,
      nombre: 'ROA',
      valor: indicadores.roa / 100, // Guardar como decimal
      formato: 'percent',
      benchmark: '> 8% óptimo',
      estado: indicadores.roa >= 8 ? 'ok' : indicadores.roa >= 4 ? 'warning' : 'alert',
    })
  }

  // Guardar SROA (Scoring ROA)
  if (indicadores.scoringSROA !== null) {
    indicadoresCreados.push({
      solicitud_id: solicitudId,
      nombre: 'SROA',
      valor: indicadores.scoringSROA / 100,
      formato: 'percent',
      benchmark: '100% óptimo',
      estado: 'ok',
    })
  }

  // Guardar ROE
  if (indicadores.roe !== null) {
    indicadoresCreados.push({
      solicitud_id: solicitudId,
      nombre: 'ROE',
      valor: indicadores.roe / 100,
      formato: 'percent',
      benchmark: '> 15% óptimo',
      estado: indicadores.roe >= 15 ? 'ok' : indicadores.roe >= 8 ? 'warning' : 'alert',
    })
  }

  // Guardar SROE (Scoring ROE)
  if (indicadores.scoringSROE !== null) {
    indicadoresCreados.push({
      solicitud_id: solicitudId,
      nombre: 'SROE',
      valor: indicadores.scoringSROE / 100,
      formato: 'percent',
      benchmark: '100% óptimo',
      estado: 'ok',
    })
  }

  // Guardar Scoring de Rentabilidad
  if (indicadores.scoringRentabilidad !== null) {
    indicadoresCreados.push({
      solicitud_id: solicitudId,
      nombre: 'Scoring Rentabilidad',
      valor: indicadores.scoringRentabilidad / 100,
      formato: 'percent',
      benchmark: '100% óptimo',
      estado: indicadores.scoringRentabilidad >= 90 ? 'ok' : indicadores.scoringRentabilidad >= 70 ? 'warning' : 'alert',
    })
  }

  // Insertar todos los indicadores
  if (indicadoresCreados.length > 0) {
    await prisma.indicador.createMany({
      data: indicadoresCreados
    })
    console.log(`[Rentabilidad] ✅ ${indicadoresCreados.length} indicadores guardados en BD`)
  }

  return indicadoresCreados.length
}

/**
 * Calcula el DSCR (Debt Service Coverage Ratio) para una solicitud
 * DSCR = Utilidad de Operación / Gastos Financieros
 * @param {string} solicitudId - UUID de la solicitud
 * @returns {Promise<Object>} Objeto con los indicadores calculados
 */
async function calcularIndicadoresDSCR(solicitudId) {
  // Obtener valores necesarios de campos_extraidos
  let utilidadOperacion = await obtenerValorCampo(
    solicitudId, 
    'Utilidad de Operación', 
    'estado_resultados'
  )
  
  // Si no existe Utilidad de Operación, calcularla a partir de otros campos
  if (!utilidadOperacion) {
    console.log('[DSCR] "Utilidad de Operación" no encontrada, intentando calcular...')
    
    const ventas = await obtenerValorCampo(solicitudId, 'Ventas', 'estado_resultados')
    const costosVenta = await obtenerValorCampo(solicitudId, 'Costos de Venta', 'estado_resultados')
    const gastosOperacion = await obtenerValorCampo(solicitudId, 'Gastos de Operación', 'estado_resultados')
    
    if (ventas && costosVenta && gastosOperacion) {
      utilidadOperacion = ventas - costosVenta - gastosOperacion
      console.log(`[DSCR] Utilidad de Operación calculada: ${utilidadOperacion}`)
    }
  }
  
  const gastosFinancieros = await obtenerValorCampo(
    solicitudId, 
    'Gastos Financieros', 
    'estado_resultados'
  )

  console.log(`[DSCR] Valores obtenidos para solicitud ${solicitudId}:`)
  console.log(`  Utilidad de Operación: ${utilidadOperacion}`)
  console.log(`  Gastos Financieros: ${gastosFinancieros}`)

  // Validar que tenemos los datos necesarios
  if (!utilidadOperacion || !gastosFinancieros) {
    console.warn(`[DSCR] Faltan datos para calcular DSCR`)
    return {
      dscr: null,
      scoringDSCR: null,
      error: 'Datos insuficientes para calcular DSCR'
    }
  }

  // Evitar división por cero
  if (gastosFinancieros === 0) {
    console.warn(`[DSCR] Gastos Financieros es 0, no se puede calcular DSCR`)
    return {
      dscr: null,
      scoringDSCR: null,
      error: 'Gastos Financieros = 0'
    }
  }

  // Calcular DSCR
  const dscr = utilidadOperacion / gastosFinancieros
  const scoringDSCR = calcularScoringDSCR(dscr)

  console.log(`[DSCR] Resultados:`)
  console.log(`  DSCR: ${dscr.toFixed(2)}`)
  console.log(`  Scoring DSCR: ${scoringDSCR}%`)

  return {
    dscr: Number(dscr.toFixed(2)),
    scoringDSCR,
    utilidadOperacion,
    gastosFinancieros
  }
}

/**
 * Calcula y guarda los indicadores de DSCR en la BD
 * @param {string} solicitudId - UUID de la solicitud
 * @returns {Promise<number>} Número de indicadores guardados
 */
async function guardarIndicadoresDSCR(solicitudId) {
  // Borrar indicadores previos de DSCR
  await prisma.indicador.deleteMany({
    where: {
      solicitud_id: solicitudId,
      nombre: { in: ['DSCR', 'Scoring DSCR'] }
    }
  })

  const indicadores = await calcularIndicadoresDSCR(solicitudId)

  if (indicadores.error) {
    console.warn(`[DSCR] No se pudo calcular: ${indicadores.error}`)
    return 0
  }

  const indicadoresCreados = []

  // Guardar DSCR
  if (indicadores.dscr !== null) {
    indicadoresCreados.push({
      solicitud_id: solicitudId,
      nombre: 'DSCR',
      valor: indicadores.dscr,
      formato: 'ratio',
      benchmark: '> 1.5 óptimo, > 1.0 aceptable',
      estado: indicadores.dscr >= 1.5 ? 'ok' : indicadores.dscr >= 1.0 ? 'warning' : 'alert',
    })
  }

  // Guardar Scoring DSCR
  if (indicadores.scoringDSCR !== null) {
    indicadoresCreados.push({
      solicitud_id: solicitudId,
      nombre: 'Scoring DSCR',
      valor: indicadores.scoringDSCR,
      formato: 'percent',
      benchmark: '100% óptimo',
      estado: indicadores.scoringDSCR === 100 ? 'ok' : indicadores.scoringDSCR >= 80 ? 'warning' : 'alert',
    })
  }

  // Insertar todos los indicadores
  if (indicadoresCreados.length > 0) {
    await prisma.indicador.createMany({
      data: indicadoresCreados
    })
    console.log(`[DSCR] ✅ ${indicadoresCreados.length} indicadores guardados en BD`)
  }

  return indicadoresCreados.length
}

/**
 * Calcula el score de buró de crédito basado en el nivel
 * A, A1, A2 = 100
 * B, B1, B2 = 90
 * C, C1, C2 = 80
 * D, D1, D2 = 70
 * E = 0
 */
function calcularScoreBuro(nivelBuro) {
  if (!nivelBuro) return null
  
  const nivel = nivelBuro.toUpperCase().trim()
  
  // Aceptar tanto letras simples como con sufijos
  if (nivel.startsWith('A')) return 100
  if (nivel.startsWith('B')) return 90
  if (nivel.startsWith('C')) return 80
  if (nivel.startsWith('D')) return 70
  if (nivel === 'E') return 0
  
  return null
}

/**
 * Guarda el score de buró de crédito en la tabla indicadores
 * @param {string} solicitudId - UUID de la solicitud
 * @returns {Promise<number>} Número de indicadores guardados
 */
async function guardarScoreBuro(solicitudId) {
  // Obtener la solicitud para leer el nivel de buró
  const solicitud = await prisma.solicitud.findUnique({
    where: { id: solicitudId },
    select: { nivel_buro_credito: true }
  })

  if (!solicitud || !solicitud.nivel_buro_credito) {
    console.warn(`[Buró] No se encontró nivel de buró para la solicitud ${solicitudId}`)
    return 0
  }

  const scoreBuro = calcularScoreBuro(solicitud.nivel_buro_credito)

  if (scoreBuro === null) {
    console.warn(`[Buró] Nivel de buró inválido: ${solicitud.nivel_buro_credito}`)
    return 0
  }

  console.log(`[Buró] Nivel: ${solicitud.nivel_buro_credito}, Score: ${scoreBuro}`)

  // Eliminar indicador de buró previo
  await prisma.indicador.deleteMany({
    where: {
      solicitud_id: solicitudId,
      nombre: 'Score Buró de Crédito'
    }
  })

  // Guardar nuevo indicador
  await prisma.indicador.create({
    data: {
      solicitud_id: solicitudId,
      nombre: 'Score Buró de Crédito',
      valor: scoreBuro,
      formato: 'percent',
      benchmark: 'A=100 B=90 C=80 D=70 E=0',
      estado: scoreBuro >= 90 ? 'ok' : scoreBuro >= 70 ? 'warning' : 'alert',
    }
  })

  console.log(`[Buró] ✅ Score de buró guardado: ${scoreBuro}`)
  return 1
}

// ═════════════════════════════════════════════════════════════
// Score Compuesto
// ═════════════════════════════════════════════════════════════

/**
 * Determina el grado crediticio basado en el score compuesto
 * @param {number} score - Score compuesto (0-100)
 * @returns {Object} { grade, gradeLabel }
 */
function determinarGrado(score) {
  if (score >= 90) return { grade: 'A', gradeLabel: 'Riesgo Bajo' }
  if (score >= 75) return { grade: 'B', gradeLabel: 'Riesgo Medio-Bajo' }
  if (score >= 60) return { grade: 'C', gradeLabel: 'Riesgo Medio' }
  if (score >= 40) return { grade: 'D', gradeLabel: 'Riesgo Medio-Alto' }
  return { grade: 'E', gradeLabel: 'Riesgo Alto' }
}

/**
 * Calcula el score compuesto basado en los 5 pilares
 * Pesos: Liquidez 45%, Rentabilidad 35%, DSCR 10%, ESG 5%, Buró 5%
 * @param {string} solicitudId - UUID de la solicitud
 * @returns {Promise<Object>} Objeto con el score compuesto y desglose
 */
async function calcularScoreCompuesto(solicitudId) {
  console.log(`\n[Score Compuesto] Calculando para solicitud ${solicitudId}`)

  // Obtener todos los indicadores de scoring
  const indicadores = await prisma.indicador.findMany({
    where: {
      solicitud_id: solicitudId,
      nombre: {
        in: [
          'Scoring Liquidez',
          'Scoring Rentabilidad',
          'Scoring DSCR',
          'Score Buró de Crédito'
        ]
      }
    }
  })

  console.log('[Score Compuesto] Indicadores encontrados:', indicadores.length)

  // Función helper para normalizar valores (convertir decimales 0-1 a 0-100)
  const normalizeScore = (valor) => {
    if (!valor) return 0
    const num = Number(valor)
    // Si es decimal entre 0 y 1, convertir a porcentaje
    return num > 0 && num <= 1 ? num * 100 : num
  }

  // Mapear los scores
  const scores = {
    liquidez: normalizeScore(indicadores.find(i => i.nombre === 'Scoring Liquidez')?.valor),
    rentabilidad: normalizeScore(indicadores.find(i => i.nombre === 'Scoring Rentabilidad')?.valor),
    dscr: normalizeScore(indicadores.find(i => i.nombre === 'Scoring DSCR')?.valor),
    buro: normalizeScore(indicadores.find(i => i.nombre === 'Score Buró de Crédito')?.valor),
    esg: 80, // Por ahora un valor fijo, después se puede calcular dinámicamente
  }

  console.log('[Score Compuesto] Scores individuales:')
  console.log(`  Liquidez: ${scores.liquidez}`)
  console.log(`  Rentabilidad: ${scores.rentabilidad}`)
  console.log(`  DSCR: ${scores.dscr}`)
  console.log(`  Buró: ${scores.buro}`)
  console.log(`  ESG: ${scores.esg}`)

  // Pesos
  const PESOS = {
    liquidez: 0.45,      // 45%
    rentabilidad: 0.35,  // 35%
    dscr: 0.10,          // 10%
    esg: 0.05,           // 5%
    buro: 0.05,          // 5%
  }

  // Calcular score compuesto
  const scoreCompuesto = Math.round(
    scores.liquidez * PESOS.liquidez +
    scores.rentabilidad * PESOS.rentabilidad +
    scores.dscr * PESOS.dscr +
    scores.esg * PESOS.esg +
    scores.buro * PESOS.buro
  )

  console.log(`[Score Compuesto] Score final: ${scoreCompuesto}`)

  // Determinar grado
  const { grade, gradeLabel } = determinarGrado(scoreCompuesto)
  console.log(`[Score Compuesto] Grado: ${grade} - ${gradeLabel}`)

  // Obtener info del buró para incluirla
  const solicitud = await prisma.solicitud.findUnique({
    where: { id: solicitudId },
    select: { nivel_buro_credito: true }
  })

  const nivelBuro = solicitud?.nivel_buro_credito
  let scoreBuroNum = null
  let bandaBuro = null

  if (nivelBuro) {
    // Asignar un score numérico aproximado según el nivel
    const bureauScores = {
      'A': 750,
      'B': 650,
      'C': 550,
      'D': 450,
      'E': 350
    }
    scoreBuroNum = bureauScores[nivelBuro] || null
    
    // Bandas aproximadas
    const bureauBands = {
      'A': 'Verde (700+)',
      'B': 'Naranja (600-699)',
      'C': 'Amarillo (500-599)',
      'D': 'Rojo (400-499)',
      'E': 'Crítico (<400)'
    }
    bandaBuro = bureauBands[nivelBuro] || null
  }

  return {
    scoreCompuesto,
    grade,
    gradeLabel,
    scoreBuroNum,
    bandaBuro,
    desglose: [
      { 
        nombre: 'Liquidez', 
        peso: 45, 
        puntaje: scores.liquidez, 
        maximo: 100,
        estado: scores.liquidez >= 80 ? 'ok' : scores.liquidez >= 60 ? 'warning' : 'alert'
      },
      { 
        nombre: 'Rentabilidad', 
        peso: 35, 
        puntaje: scores.rentabilidad, 
        maximo: 100,
        estado: scores.rentabilidad >= 80 ? 'ok' : scores.rentabilidad >= 60 ? 'warning' : 'alert'
      },
      { 
        nombre: 'DSCR', 
        peso: 10, 
        puntaje: scores.dscr, 
        maximo: 100,
        estado: scores.dscr >= 80 ? 'ok' : scores.dscr >= 60 ? 'warning' : 'alert'
      },
      { 
        nombre: 'ESG', 
        peso: 5, 
        puntaje: scores.esg, 
        maximo: 100,
        estado: scores.esg >= 70 ? 'ok' : 'warning'
      },
      { 
        nombre: 'Buró de Crédito', 
        peso: 5, 
        puntaje: scores.buro, 
        maximo: 100,
        estado: scores.buro >= 90 ? 'ok' : scores.buro >= 70 ? 'warning' : 'alert'
      },
    ]
  }
}

/**
 * Guarda el score compuesto en la base de datos
 * @param {string} solicitudId - UUID de la solicitud
 * @returns {Promise<Object>} Score guardado
 */
async function guardarScoreCompuesto(solicitudId) {
  const scoreData = await calcularScoreCompuesto(solicitudId)

  // Eliminar score previo si existe
  await prisma.scoreCrediticio.deleteMany({
    where: { solicitud_id: solicitudId }
  })

  // Crear nuevo score
  const score = await prisma.scoreCrediticio.create({
    data: {
      solicitud_id: solicitudId,
      grado: scoreData.grade,
      grado_label: scoreData.gradeLabel,
      compuesto: scoreData.scoreCompuesto,
      score_buro: scoreData.scoreBuroNum,
      banda_buro: scoreData.bandaBuro,
      desglose: {
        create: scoreData.desglose
      }
    },
    include: {
      desglose: true
    }
  })

  console.log(`[Score Compuesto] ✅ Score guardado en BD`)
  return score
}

module.exports = {
  calcularIndicadoresLiquidez,
  guardarIndicadoresLiquidez,
  calcularIndicadoresRentabilidad,
  guardarIndicadoresRentabilidad,
  calcularIndicadoresDSCR,
  guardarIndicadoresDSCR,
  guardarScoreBuro,
  calcularScoreCompuesto,
  guardarScoreCompuesto,
  obtenerValorCampo,
}
