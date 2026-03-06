'use strict'
require('dotenv').config()
const { extractCSFData } = require('../server/services/bedrockService.cjs')

// ── Mock 1: Persona Moral (Company) ──
const mockPersonaMoral = `
Constancia de Situación Fiscal
Servicio de Administración Tributaria
México

RFC:                                    ABC980101AAA
Denominación/Razón Social:              ABASTECIMIENTOS Y CONSTRUCCIONES SA DE CV
Nombre Comercial:                       ABACONS
Régimen de Capital:                     Sociedad Anónima

DOMICILIO FISCAL
Tipo de Vialidad:                       AVENIDA
Nombre de Vialidad:                     PASEO DE LA REFORMA
Número Exterior:                        250
Número Interior:                        PISO 8
Nombre de la Colonia:                   JUAREZ
Código Postal:                          06600
Nombre de la Localidad:                 MEXICO
Nombre del Municipio o Demarcación:     CUAUHTEMOC
Nombre de la Entidad Federativa:        CIUDAD DE MEXICO
Entre Calle:                            RIO LERMA Y RIO VOLGA

SITUACIÓN DEL CONTRIBUYENTE
Estatus en el Padrón:                   ACTIVO
Fecha de Inicio de Operaciones:         01/01/1998

Lugar y Fecha de Emisión:               MEXICO, D.F. a 28 de febrero de 2026
IDCIF:                                  98765432-A1B2-C3D4-E5F6-1234567890AB
`

// ── Mock 2: Persona Física (Individual) ──
const mockPersonaFisica = `
Constancia de Situación Fiscal
Servicio de Administración Tributaria
México

RFC:                                    GOPE850612AB8
CURP:                                   GOPE850612HDFLRL03
Nombre(s):                              PEDRO
Primer Apellido:                        GONZALEZ
Segundo Apellido:                       PEREZ
Fecha de Nacimiento:                    12/06/1985

DOMICILIO FISCAL
Tipo de Vialidad:                       CALLE
Nombre de Vialidad:                     INSURGENTES SUR
Número Exterior:                        1234
Número Interior:                        
Nombre de la Colonia:                   DEL VALLE
Código Postal:                          03100
Nombre de la Localidad:                 
Nombre del Municipio o Demarcación:     BENITO JUAREZ
Nombre de la Entidad Federativa:        CIUDAD DE MEXICO

SITUACIÓN DEL CONTRIBUYENTE
Estatus en el Padrón:                   ACTIVO
Fecha de Inicio de Operaciones:         15/03/2010

Lugar y Fecha de Emisión:               México, CDMX a 06 de marzo de 2026
IDCIF:                                  10293847-ABCD-1234-EFGH-5678901234AB
`

function check(label, result, expected) {
  const pass = (v, e) => e === null ? v === null : v === e
  const fields = ['razon_social', 'rfc', 'nombre_comercial', 'estado', 'ciudad']
  let allOk = true
  console.log(`\n${label}:`)
  for (const f of fields) {
    if (expected[f] !== undefined) {
      const ok = pass(result[f], expected[f])
      const icon = ok ? '✅' : '❌'
      if (!ok) allOk = false
      console.log(`  ${icon} ${f}: ${JSON.stringify(result[f])}${!ok ? ` (esperado: ${JSON.stringify(expected[f])})` : ''}`)
    } else {
      console.log(`  ℹ️  ${f}: ${JSON.stringify(result[f])}`)
    }
  }
  
  // Check _extra fields
  if (result._extra) {
    console.log(`  ℹ️  curp: ${result._extra.curp}`)
    console.log(`  ℹ️  estatus_padron: ${result._extra.estatus_padron}`)
    console.log(`  ℹ️  fecha_inicio_operaciones: ${result._extra.fecha_inicio_operaciones}`)
    console.log(`  ℹ️  confianza: ${result._extra.confianza}`)
  }
  
  console.log(allOk ? `  → ${label}: PASS\n` : `  → ${label}: FAIL\n`)
}

async function run() {
  console.log('╔═══════════════════════════════════════════════════════╗')
  console.log('║  Test: extractCSFData() con Claude Haiku 4.5         ║')
  console.log('║  Costo: ~$0.0035 USD por CSF (vs $0.05 con FORMS)    ║')
  console.log('╚═══════════════════════════════════════════════════════╝\n')

  console.log('=== Test 1: Persona Moral (Empresa) ===')
  const r1 = await extractCSFData(mockPersonaMoral)
  check('Persona Moral', r1, {
    razon_social: 'ABASTECIMIENTOS Y CONSTRUCCIONES SA DE CV',
    rfc: 'ABC980101AAA',
    nombre_comercial: 'ABACONS',
    estado: 'CIUDAD DE MEXICO',
    ciudad: 'MEXICO',
  })

  console.log('=== Test 2: Persona Física (Individual) ===')
  const r2 = await extractCSFData(mockPersonaFisica)
  check('Persona Física', r2, {
    razon_social: 'PEDRO GONZALEZ PEREZ',
    rfc: 'GOPE850612AB8',
    nombre_comercial: null,
    estado: 'CIUDAD DE MEXICO',
    ciudad: 'BENITO JUAREZ',
  })

  console.log('\n✅ Tests completados. Revisa los resultados arriba.')
  console.log('💡 Si los campos principales coinciden, la migración es exitosa.')
}

run().catch(console.error)
