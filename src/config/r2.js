const { S3Client } = require("@aws-sdk/client-s3");

const {
  R2_ACCOUNT_ID,
  R2_ENDPOINT,
  R2_ACCESS_KEY_ID,
  R2_SECRET_ACCESS_KEY,
  R2_REGION = "auto",
  R2_BUCKET_NAME,
} = process.env;

const estimatedEndpoint =
  R2_ENDPOINT || (R2_ACCOUNT_ID ? `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com` : undefined);

const credentialsProvided = Boolean(R2_ACCESS_KEY_ID && R2_SECRET_ACCESS_KEY);
const bucketConfigured = Boolean(R2_BUCKET_NAME);
const isConfigured = Boolean(estimatedEndpoint && credentialsProvided && bucketConfigured);

let r2Client = null;

if (isConfigured) {
  r2Client = new S3Client({
    region: R2_REGION,
    endpoint: estimatedEndpoint,
    credentials: {
      accessKeyId: R2_ACCESS_KEY_ID,
      secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
  });
} else {
  console.warn("[R2] configuration missing; R2 health checks will be skipped");
}

module.exports = {
  r2Client,
  bucketName: R2_BUCKET_NAME,
  isConfigured,
};
