/**
 * Test: reproduce the Express environment by requiring BOTH s3 and textract
 * before calling AnalyzeDocument.
 */
require('dotenv').config()
const fs = require('fs')
const path = require('path')
const os = require('os')

// ── Simulate what the server does: load S3 client first ──
console.log('1. Loading @aws-sdk/client-s3...')
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3')
console.log('   ✓ S3Client loaded')

// ── Then load Textract ──
console.log('2. Loading @aws-sdk/client-textract...')
const { TextractClient, AnalyzeDocumentCommand } = require('@aws-sdk/client-textract')
console.log('   ✓ TextractClient loaded')

const pdfPath = path.join(os.homedir(), 'Desktop', 'ScreenShots📸', 'CSF_MOM.pdf')
const fileBuffer = fs.readFileSync(pdfPath)
console.log(`3. PDF loaded: ${fileBuffer.length} bytes`)

;(async () => {
  // Test A: Textract ONLY (should work)
  try {
    console.log('\n[Test A] Textract only (1 query)...')
    const client = new TextractClient({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    })
    const cmd = new AnalyzeDocumentCommand({
      Document: { Bytes: fileBuffer },
      FeatureTypes: ['QUERIES'],
      QueriesConfig: { Queries: [{ Text: 'What is the RFC?', Alias: 'rfc' }] },
    })
    const res = await client.send(cmd)
    console.log(`   ✅ OK — ${(res.Blocks || []).length} blocks`)
  } catch (e) {
    console.log(`   ❌ FAIL — ${e.__type}: ${e.message}`)
  }

  // Test B: S3 upload first, THEN Textract (simulates the upload flow)
  try {
    console.log('\n[Test B] S3 upload → then Textract...')
    const s3 = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    })
    const putCmd = new PutObjectCommand({
      Bucket: process.env.S3_BUCKET_NAME,
      Key: `test/debug_${Date.now()}.pdf`,
      Body: fileBuffer,
      ContentType: 'application/pdf',
    })
    await s3.send(putCmd)
    console.log('   ✓ S3 upload succeeded')

    // Now call Textract
    const textractClient = new TextractClient({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    })
    const analyzeCmd = new AnalyzeDocumentCommand({
      Document: { Bytes: fileBuffer },
      FeatureTypes: ['QUERIES'],
      QueriesConfig: { Queries: [{ Text: 'What is the RFC?', Alias: 'rfc' }] },
    })
    const res = await textractClient.send(analyzeCmd)
    console.log(`   ✅ OK — ${(res.Blocks || []).length} blocks`)
  } catch (e) {
    console.log(`   ❌ FAIL — ${e.__type || e.name}: ${e.message}`)
  }

  // Test C: Textract with 10 queries (full config)
  try {
    console.log('\n[Test C] Textract with 10 queries (full config)...')
    const client = new TextractClient({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    })
    const cmd = new AnalyzeDocumentCommand({
      Document: { Bytes: fileBuffer },
      FeatureTypes: ['QUERIES'],
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
    const res = await client.send(cmd)
    console.log(`   ✅ OK — ${(res.Blocks || []).length} blocks`)
  } catch (e) {
    console.log(`   ❌ FAIL — ${e.__type || e.name}: ${e.message}`)
  }

  console.log('\n--- Done ---')
})()
