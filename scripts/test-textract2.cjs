require('dotenv').config()
const fs = require('fs')
const { TextractClient, AnalyzeDocumentCommand } = require('@aws-sdk/client-textract')

const filePath = process.argv[2]
const fileBuffer = fs.readFileSync(filePath)

console.log('File:', filePath, '| Size:', fileBuffer.length)

const textract = new TextractClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
})

async function test(label, params) {
  try {
    console.log('\n' + label + '...')
    const res = await textract.send(new AnalyzeDocumentCommand(params))
    console.log('  OK -', (res.Blocks || []).length, 'blocks')
  } catch (e) {
    console.log('  FAIL -', e.__type || e.name, '-', e.message)
  }
}

;(async () => {
  // A: Uint8Array + QUERIES only
  await test('A: Uint8Array + QUERIES only', {
    Document: { Bytes: new Uint8Array(fileBuffer) },
    FeatureTypes: ['QUERIES'],
    QueriesConfig: { Queries: [{ Text: 'What is the RFC?', Alias: 'rfc' }] },
  })

  // B: Buffer + FORMS + QUERIES
  await test('B: Buffer + FORMS + QUERIES', {
    Document: { Bytes: fileBuffer },
    FeatureTypes: ['FORMS', 'QUERIES'],
    QueriesConfig: { Queries: [{ Text: 'What is the RFC?', Alias: 'rfc' }] },
  })

  // C: Uint8Array + FORMS + QUERIES
  await test('C: Uint8Array + FORMS + QUERIES', {
    Document: { Bytes: new Uint8Array(fileBuffer) },
    FeatureTypes: ['FORMS', 'QUERIES'],
    QueriesConfig: { Queries: [{ Text: 'What is the RFC?', Alias: 'rfc' }] },
  })

  // D: Buffer + QUERIES only (all 10 spanish)
  await test('D: Buffer + QUERIES only (10 spanish)', {
    Document: { Bytes: fileBuffer },
    FeatureTypes: ['QUERIES'],
    QueriesConfig: {
      Queries: [
        { Text: 'Cual es la razon social?', Alias: 'razon_social' },
        { Text: 'Cual es el nombre comercial?', Alias: 'nombre_comercial' },
        { Text: 'Cual es el RFC?', Alias: 'rfc' },
        { Text: 'Cual es el domicilio fiscal?', Alias: 'domicilio_fiscal' },
        { Text: 'Cual es la ciudad?', Alias: 'ciudad' },
        { Text: 'Cual es el estado?', Alias: 'estado' },
        { Text: 'Cual es el telefono?', Alias: 'telefono' },
        { Text: 'Cual es el correo electronico?', Alias: 'correo_electronico' },
        { Text: 'Cual es la pagina web?', Alias: 'pagina_web' },
        { Text: 'Cuantos empleados tiene?', Alias: 'numero_empleados' },
      ],
    },
  })

  console.log('\nDone.')
})()
