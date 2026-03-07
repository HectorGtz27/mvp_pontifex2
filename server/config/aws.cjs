'use strict'

/**
 * Shared AWS credentials object used by all AWS SDK clients (S3, Textract, Bedrock).
 * Values are read from environment variables set in the .env file.
 */
const awsCredentials = {
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
}

module.exports = { awsCredentials }
