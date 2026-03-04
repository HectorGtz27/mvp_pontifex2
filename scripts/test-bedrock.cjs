'use strict'
require('dotenv').config()
const { extractBankStatementData } = require('../server/services/bedrockService.cjs')

// Santander usa "Abonos del Período" y "Cargos del Período"
const mockSantander = `
Santander
Cuenta Débito
Titular: EMPRESA XYZ SA DE CV
RFC: EXY900101AAA
Del 01 de febrero al 28 de febrero de 2026

                    RESUMEN
Saldo Anterior:              120,500.00
Abonos del Período:           65,830.00
Cargos del Período:           41,200.00
Saldo Actual:                145,130.00

DETALLE DE MOVIMIENTOS
02-Feb  Abono SPEI                  30,000.00
08-Feb  Cargo pago nómina           25,000.00
14-Feb  Abono transferencia         35,830.00
22-Feb  Cargo proveedor             16,200.00
`

async function run() {
  console.log('=== Test 1: Santander (sin hint de banco) ===')
  const r1 = await extractBankStatementData(mockSantander)
  console.log('Resultado:', { mes: r1.mes, abonos: r1.abonos, retiros: r1.retiros, banco: r1.banco_detectado, confianza: r1.confianza })
  console.log('')
}

run().catch(console.error)
