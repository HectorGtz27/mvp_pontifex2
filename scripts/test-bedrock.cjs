'use strict'
require('dotenv').config()
const { extractBankStatementData } = require('../server/services/bedrockService.cjs')

// ── Mock 1: Santander MXN — usa "Abonos/Cargos del Período" y "Saldo Promedio" ──
const mockSantander = `
Santander
Cuenta Débito — Pesos Mexicanos (MXN)
Titular: EMPRESA XYZ SA DE CV
RFC: EXY900101AAA
Del 01 de febrero al 28 de febrero de 2026

                    RESUMEN DEL PERÍODO
Saldo Anterior:              120,500.00
Abonos del Período:          450,830.00
Cargos del Período:          380,200.00
Saldo Final:                 191,130.00
Saldo Promedio del Mes:      155,000.00

DETALLE DE MOVIMIENTOS
02-Feb  Abono SPEI                 200,000.00
08-Feb  Cargo pago nómina          150,000.00
14-Feb  Abono transferencia        250,830.00
22-Feb  Cargo proveedor            230,200.00
`

// ── Mock 2: BBVA USD — cuenta en dólares ──
const mockBBVAUSD = `
BBVA México
Estado de Cuenta
Cuenta en Dólares Americanos (USD)
Número de cuenta: 012-3456789
Titular: CONSTRUCTORA MENDOZA S.A. DE C.V.

Período: Enero 2025 (01-Ene-2025 al 31-Ene-2025)

RESUMEN DE CUENTA
Saldo Inicial USD:            18,200.00
Total Depósitos USD:          32,500.00
Total Retiros USD:            27,100.00
Saldo Final USD:              23,600.00
Saldo Promedio Mensual USD:   20,900.00

MOVIMIENTOS
05-Ene  Wire Transfer recibido       20,000.00 USD
12-Ene  Pago proveedor EUA          -15,000.00 USD
20-Ene  Depósito efectivo            12,500.00 USD
28-Ene  Transferencia al exterior   -12,100.00 USD
`

function check(label, result, expected) {
  const pass = (v, e) => e === null ? v === null : v === e
  const fields = ['mes', 'abonos', 'retiros', 'saldo_promedio', 'divisa', 'banco_detectado']
  let allOk = true
  for (const f of fields) {
    const ok = expected[f] !== undefined ? pass(result[f], expected[f]) : true
    const icon = ok ? '✅' : '❌'
    if (!ok) allOk = false
    console.log(`  ${icon} ${f}: ${JSON.stringify(result[f])}${!ok ? ` (esperado: ${JSON.stringify(expected[f])})` : ''}`)
  }
  console.log(`  confianza: ${result.confianza}`)
  console.log(allOk ? `  → ${label}: PASS\n` : `  → ${label}: FAIL\n`)
}

async function run() {
  console.log('=== Test 1: Santander MXN ===')
  const r1 = await extractBankStatementData(mockSantander)
  check('Santander MXN', r1, {
    mes: '2026-02',
    abonos: 450830,
    retiros: 380200,
    saldo_promedio: 155000,
    divisa: 'MXN',
  })

  console.log('=== Test 2: BBVA USD ===')
  const r2 = await extractBankStatementData(mockBBVAUSD)
  check('BBVA USD', r2, {
    mes: '2025-01',
    abonos: 32500,
    retiros: 27100,
    saldo_promedio: 20900,
    divisa: 'USD',
  })
}

run().catch(console.error)
