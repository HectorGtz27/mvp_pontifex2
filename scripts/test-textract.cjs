/**
 * Diagnostic script – tries multiple Textract configurations
 * to pinpoint which parameter causes InvalidParameterException.
 *
 * Usage:  node scripts/test-textract.cjs <path-to-pdf>
 */

require('dotenv').config()
const fs = require('fs')
const { TextractClient, AnalyzeDocumentCommand } = require('@aws-sdk/client-textract')

const filePath = process.argv[2]
if (!filePath) {
  console.error('Usage: node scripts/test-textract.cjs <path-to-file>')
  process.exit(1)
}

const fileBuffer = fs.readFileSync(filePath)
console.log(`File: ${filePath}`)
console.log(`Size: ${fileBuffer.length} bytes`)
console.log(`Magic: ${fileBuffer.slice(0, 4).toString('hex')}`)
console.log(`Region: ${process.env.AWS_REGION}`)
console.log('---')

const textract = new TextractClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
})

async function tryCall(label, params) {
  console.log(`\n[TEST] ${label}...`)
  try {
    const cmd = new AnalyzeDocumentCommand(params)
    const res = await textract.send(cmd)
    console.log(`  ✅ SUCCESS — ${(res.Blocks || []).length} blocks`)
    return true
  } catch (err) {
    console.log(`  ❌ FAIL — ${err.__type || err.name}: ${err.message}`)
    return false
  }
}

;(async () => {
  const doc = { Bytes: fileBuffer }          // Buffer directly (not Uint8Array)

  // Test 1: FORMS only
  await tryCall('FORMS only (Buffer)', {
    Document: doc,
    FeatureTypes: ['FORMS'],
  })

  // Test 2: TABLES only
  await tryCall('TABLES only (Buffer)', {
    Document: doc,
    FeatureTypes: ['TABLES'],
  })

  // Test 3: FORMS + 1 simple English query
  await tryCall('FORMS + 1 English query', {
    Document: doc,
    FeatureTypes: ['FORMS', 'QUERIES'],
    QueriesConfig: {
      Queries: [{ Text: 'What is the company name?', Alias: 'company' }],
    },
  })

  // Test 4: FORMS + 1 Spanish query
  await tryCall('FORMS + 1 Spanish query', {
    Document: doc,
    FeatureTypes: ['FORMS', 'QUERIES'],
    QueriesConfig: {
      Queries: [{ Text: '¿Cuál es la razón social?', Alias: 'razon_social' }],
    },
  })

  // Test 5: FORMS + all 10 Spanish queries (current config)
  await tryCall('FORMS + 10 Spanish queries', {
    Document: doc,
    FeatureTypes: ['FORMS', 'QUERIES'],
    QueriesConfig: {
      Queries: [
        { Text: '¿Cuál es la razón social?', Alias: 'razon_social' },
        { Text: '¿Cuál es el nombre comercial?', Alias: 'nombre_comercial' },
        { Text: '¿Cuál es el RFC?', Alias: 'rfc' },
        { Text: '¿Cuál es el domicilio fiscal?', Alias: 'domicilio_fiscal' },
        { Text: '¿Cuál es la ciudad?', Alias: 'ciudad' },
        { Text: '¿Cuál es el estado?', Alias: 'estado' },
        { Text: '¿Cuál es el teléfono?', Alias: 'telefono' },
        { Text: '¿Cuál es el correo electrónico?', Alias: 'correo_electronico' },
        { Text: '¿Cuál es la página web?', Alias: 'pagina_web' },
        { Text: '¿Cuántos empleados tiene?', Alias: 'numero_empleados' },
      ],
    },
  })

  // Test 6: Uint8Array instead of Buffer
  await tryCall('FORMS only (Uint8Array)', {
    Document: { Bytes: new Uint8Array(fileBuffer) },
    FeatureTypes: ['FORMS'],
  })

  console.log('\n--- Done ---')
})()
