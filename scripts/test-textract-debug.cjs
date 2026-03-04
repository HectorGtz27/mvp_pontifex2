#!/usr/bin/env node
require('dotenv').config()
const fs = require('fs')
const path = require('path')
const { analyzeDocumentForms } = require('../server/services/textractService.cjs')

async function testTextract() {
  console.log('\n════════════════════════════════════════')
  console.log('  DIAGNÓSTICO DE TEXTRACT')
  console.log('════════════════════════════════════════\n')

  // 1. Verificar variables de entorno
  console.log('1️⃣  Variables de entorno:')
  console.log(`   AWS_REGION: ${process.env.AWS_REGION || '❌ NO DEFINIDA'}`)
  console.log(`   AWS_ACCESS_KEY_ID: ${process.env.AWS_ACCESS_KEY_ID ? '✓ Configurada' : '❌ NO DEFINIDA'}`)
  console.log(`   AWS_SECRET_ACCESS_KEY: ${process.env.AWS_SECRET_ACCESS_KEY ? '✓ Configurada' : '❌ NO DEFINIDA'}`)
  console.log(`   S3_BUCKET_NAME: ${process.env.S3_BUCKET_NAME || '❌ NO DEFINIDA'}`)

  if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY || !process.env.AWS_REGION) {
    console.error('\n❌ Faltan credenciales de AWS. Revisa tu archivo .env')
    process.exit(1)
  }

  // 2. Intentar leer un archivo de prueba
  const testFilePath = process.argv[2]
  if (!testFilePath) {
    console.log('\n⚠️  Uso: node scripts/test-textract-debug.cjs <ruta-del-archivo>')
    console.log('   Ejemplo: node scripts/test-textract-debug.cjs ~/Downloads/constancia.pdf\n')
    
    // Intentar encontrar un PDF en el directorio actual
    const files = fs.readdirSync('.').filter(f => f.endsWith('.pdf'))
    if (files.length > 0) {
      console.log(`   Archivos PDF encontrados: ${files.join(', ')}`)
    }
    process.exit(1)
  }

  if (!fs.existsSync(testFilePath)) {
    console.error(`\n❌ Archivo no encontrado: ${testFilePath}`)
    process.exit(1)
  }

  console.log(`\n2️⃣  Leyendo archivo: ${testFilePath}`)
  const fileBuffer = fs.readFileSync(testFilePath)
  const ext = path.extname(testFilePath).toLowerCase()
  const mimeTypes = {
    '.pdf': 'application/pdf',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
  }
  const mimeType = mimeTypes[ext] || 'application/octet-stream'
  
  console.log(`   Tamaño: ${(fileBuffer.length / 1024).toFixed(2)} KB`)
  console.log(`   MIME type: ${mimeType}`)

  if (fileBuffer.length === 0) {
    console.error('\n❌ El archivo está vacío')
    process.exit(1)
  }

  if (fileBuffer.length > 10 * 1024 * 1024) {
    console.error('\n❌ El archivo excede 10 MB (límite de Textract)')
    process.exit(1)
  }

  // 3. Llamar a Textract
  console.log('\n3️⃣  Llamando a AWS Textract (FORMS API)...')
  try {
    const result = await analyzeDocumentForms(fileBuffer, mimeType)
    console.log('\n✅ ¡Textract respondió exitosamente!\n')
    console.log('📄 Datos extraídos:')
    console.log(JSON.stringify(result, null, 2))
    
    console.log('\n════════════════════════════════════════')
    console.log('  ✓ DIAGNÓSTICO EXITOSO')
    console.log('════════════════════════════════════════\n')
  } catch (error) {
    console.error('\n❌ ERROR al llamar a Textract:\n')
    console.error('Tipo de error:', error.constructor.name)
    console.error('Mensaje:', error.message)
    
    if (error.name) console.error('Nombre:', error.name)
    if (error.code) console.error('Código:', error.code)
    if (error.$metadata) {
      console.error('Metadata:', JSON.stringify(error.$metadata, null, 2))
    }
    if (error.stack) {
      console.error('\nStack trace:')
      console.error(error.stack)
    }
    
    console.log('\n════════════════════════════════════════')
    console.log('  POSIBLES CAUSAS:')
    console.log('════════════════════════════════════════')
    console.log('1. Las credenciales no tienen permisos para Textract')
    console.log('   → Verifica en AWS IAM que el usuario tenga: textract:AnalyzeDocument')
    console.log('2. El archivo no es compatible con Textract')
    console.log('   → Solo acepta: PDF, PNG, JPG/JPEG')
    console.log('3. La región no soporta Textract')
    console.log('   → Textract está disponible en: us-east-1, us-east-2, us-west-2, eu-west-1, etc.')
    console.log('4. El archivo está corrupto o protegido con contraseña')
    console.log('5. Límite de API excedido (muy raro)')
    console.log('════════════════════════════════════════\n')
    
    process.exit(1)
  }
}

testTextract()
