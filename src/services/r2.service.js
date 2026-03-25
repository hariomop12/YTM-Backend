const { PutObjectCommand, GetObjectCommand } = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const { r2Client, bucketName, isConfigured } = require("../config/r2");

const generateUploadUrl = async (key, expiresIn = 3600) => {
  if (!isConfigured || !r2Client) {
    throw new Error("R2 is not configured");
  }

  const command = new PutObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  const signedUrl = await getSignedUrl(r2Client, command, { expiresIn });
  return signedUrl;
};

const generateStreamUrl = async (key, expiresIn = 3600) => {
  if (!isConfigured || !r2Client) {
    throw new Error("R2 is not configured");
  }

  const command = new GetObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  const signedUrl = await getSignedUrl(r2Client, command, { expiresIn });
  return signedUrl;
};

const deleteObject = async (key) => {
  if (!isConfigured || !r2Client) {
    throw new Error("R2 is not configured");
  }

  const { DeleteObjectCommand } = require("@aws-sdk/client-s3");
  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  await r2Client.send(command);
};

module.exports = {
  generateUploadUrl,
  generateStreamUrl,
  deleteObject,
  isConfigured,
  bucketName,
};
