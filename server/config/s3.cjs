const { S3Client } = require('@aws-sdk/client-s3')
const { awsCredentials } = require('./aws.cjs')

const s3 = new S3Client(awsCredentials)

const S3_BUCKET = process.env.S3_BUCKET_NAME

module.exports = { s3, S3_BUCKET }
