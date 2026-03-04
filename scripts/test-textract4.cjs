/**
 * Pinpoint which query causes InvalidParameterException.
 */
require('dotenv').config()
const fs = require('fs')
const path = require('path')
const os = require('os')
const { TextractClient, AnalyzeDocumentCommand } = require('@aws-sdk/client-textract')

const pdfPath = path.join(os.homedir(), 'Desktop', 'ScreenShots📸', 'CSF_MOM.pdf')
const fileBuffer = fs.readFileSync(pdfPath)

const QUERIES = [
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
]

;(async () => {
  const client = new TextractClient({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  })

  // Test incrementally: add one query at a time
  for (let i = 1; i <= QUERIES.length; i++) {
    const subset = QUERIES.slice(0, i)
    try {
      const cmd = new AnalyzeDocumentCommand({
        Document: { Bytes: fileBuffer },
        FeatureTypes: ['QUERIES'],
        QueriesConfig: { Queries: subset },
      })
      await client.send(cmd)
      console.log(`✅ ${i} queries OK`)
    } catch (e) {
      console.log(`❌ FAILS at ${i} queries — last added: "${QUERIES[i - 1].Text}" (${QUERIES[i - 1].Alias})`)
      console.log(`   Error: ${e.__type}: ${e.message}`)

      // Confirm it's this specific query by testing it alone
      try {
        const singleCmd = new AnalyzeDocumentCommand({
          Document: { Bytes: fileBuffer },
          FeatureTypes: ['QUERIES'],
          QueriesConfig: { Queries: [QUERIES[i - 1]] },
        })
        await client.send(singleCmd)
        console.log(`   → Query alone: ✅ OK (so it's a count/combination issue)`)
      } catch (e2) {
        console.log(`   → Query alone: ❌ FAIL (this query itself is the problem)`)
      }
      break
    }
  }

  console.log('\nDone.')
})()
