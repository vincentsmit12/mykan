import * as s3Adapter from "./s3-adapter";
import * as localAdapter from "./local-adapter";

const isS3Configured = () => {
  return !!(process.env.S3_ACCESS_KEY_ID && process.env.S3_SECRET_ACCESS_KEY);
};

export async function generateUploadUrl(
  bucket: string,
  key: string,
  contentType: string,
  expiresIn = 3600,
) {
  if (isS3Configured()) {
    return s3Adapter.generateUploadUrl(bucket, key, contentType, expiresIn);
  }
  return localAdapter.generateUploadUrl(bucket, key, contentType, expiresIn);
}

export async function generateDownloadUrl(
  bucket: string,
  key: string,
  expiresIn = 3600,
) {
  if (isS3Configured()) {
    return s3Adapter.generateDownloadUrl(bucket, key, expiresIn);
  }
  return localAdapter.generateDownloadUrl(bucket, key, expiresIn);
}

export async function deleteObject(bucket: string, key: string) {
  if (isS3Configured()) {
    return s3Adapter.deleteObject(bucket, key);
  }
  return localAdapter.deleteObject(bucket, key);
}

// Re-export createS3Client for health checks, but it might fail if not configured
export const createS3Client = s3Adapter.createS3Client;
