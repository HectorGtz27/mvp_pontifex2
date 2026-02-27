/**
 * Test: see what KEY_VALUE_SET blocks FORMS returns for CSF_MOM.pdf
 */
require('dotenv').config()
const fs = require('fs')
const path = require('path')
const os = require('os')
const { TextractClient, AnalyzeDocumentCommand } = require('@aws-sdk/client-textract')

const buf = fs.readFileSync(path.join(os.homedir(), 'Desktop', 'ScreenShots📸', 'CSF_MOM.pdf'))

;(async () => {
  const client = new TextractClient({
    region: process.env.AWS_REGION,
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
  })

  const cmd = new AnalyzeDocumentCommand({
    Document: { Bytes: buf },
    FeatureTypes: ['FORMS'],
  })

  const res = await client.send(cmd)
  const blocks = res.Blocks || []

  // Build block map
  const blockMap = {}
  for (const b of blocks) blockMap[b.Id] = b

  // Extract KEY_VALUE_SET pairs
  const kvPairs = []
  for (const b of blocks) {
    if (b.BlockType !== 'KEY_VALUE_SET' || b.EntityTypes?.[0] !== 'KEY') continue

    // Get key text
    let keyText = ''
    for (const rel of b.Relationships || []) {
      if (rel.Type === 'CHILD') {
        for (const id of rel.Ids || []) {
          const child = blockMap[id]
          if (child?.BlockType === 'WORD') keyText += (keyText ? ' ' : '') + child.Text
        }
      }
    }

    // Get value text
    let valueText = ''
    for (const rel of b.Relationships || []) {
      if (rel.Type === 'VALUE') {
        for (const id of rel.Ids || []) {
          const valueBlock = blockMap[id]
          if (!valueBlock) continue
          for (const vRel of valueBlock.Relationships || []) {
            if (vRel.Type === 'CHILD') {
              for (const vid of vRel.Ids || []) {
                const word = blockMap[vid]
                if (word?.BlockType === 'WORD') valueText += (valueText ? ' ' : '') + word.Text
              }
            }
          }
        }
      }
    }

    kvPairs.push({ key: keyText.trim(), value: valueText.trim(), confidence: b.Confidence })
  }

  console.log(`\nFound ${kvPairs.length} key-value pairs:\n`)
  for (const kv of kvPairs) {
    console.log(`  "${kv.key}" → "${kv.value}"  (${kv.confidence?.toFixed(1)}%)`)
  }
})()
