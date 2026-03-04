require('dotenv').config()
const fs = require('fs')
const path = require('path')
const os = require('os')
const { TextractClient, AnalyzeDocumentCommand } = require('@aws-sdk/client-textract')

const buf = fs.readFileSync(path.join(os.homedir(), 'Desktop', 'ScreenShots📸', 'CSF_MOM.pdf'))

const c = new TextractClient({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
})

async function test(label, queries) {
  try {
    const cmd = new AnalyzeDocumentCommand({
      Document: { Bytes: buf },
      FeatureTypes: ['QUERIES'],
      QueriesConfig: { Queries: queries },
    })
    await c.send(cmd)
    console.log(`✅ ${label}`)
  } catch (e) {
    console.log(`❌ ${label} — ${e.__type}: ${e.message}`)
  }
}

;(async () => {
  await test('T1: English query', [{ Text: 'What is the RFC?', Alias: 'rfc' }])
  await test('T2: ASCII Spanish (no accents)', [{ Text: 'Cual es la razon social?', Alias: 'rs' }])
  await test('T3: Spanish with accents', [{ Text: 'Cuál es la razón social?', Alias: 'rs2' }])
  await test('T4: Inverted ? only', [{ Text: '¿Cual es el RFC?', Alias: 'rfc2' }])
  await test('T5: Full unicode query', [{ Text: '¿Cuál es la razón social?', Alias: 'rs3' }])
  await test('T6: 10 English queries', [
    { Text: 'What is the company name?', Alias: 'q1' },
    { Text: 'What is the trade name?', Alias: 'q2' },
    { Text: 'What is the RFC?', Alias: 'q3' },
    { Text: 'What is the fiscal address?', Alias: 'q4' },
    { Text: 'What is the city?', Alias: 'q5' },
    { Text: 'What is the state?', Alias: 'q6' },
    { Text: 'What is the phone number?', Alias: 'q7' },
    { Text: 'What is the email?', Alias: 'q8' },
    { Text: 'What is the website?', Alias: 'q9' },
    { Text: 'How many employees?', Alias: 'q10' },
  ])
  console.log('\nDone.')
})()
