import { createHmac } from "crypto";
import { env } from "next-runtime-env";
import { promises as fs } from "fs";
import path from "path";

const SECRET = process.env.BETTER_AUTH_SECRET || "fallback-secret-do-not-use-in-prod";
const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

// Ensure storage directory exists
const STORAGE_ROOT = process.env.KAN_STORAGE_PATH || path.join(process.cwd(), "storage");

async function ensureStorageDir() {
  try {
    await fs.mkdir(STORAGE_ROOT, { recursive: true });
  } catch (e) {
    // Ignore error if exists
  }
}

function signUrl(urlPath: string, method: string, expiresIn: number) {
  const expiresAt = Math.floor(Date.now() / 1000) + expiresIn;
  const data = `${urlPath}:${method}:${expiresAt}`;
  const signature = createHmac("sha256", SECRET).update(data).digest("hex");
  return `${BASE_URL}${urlPath}?expires=${expiresAt}&signature=${signature}`;
}

export async function generateUploadUrl(
  bucket: string,
  key: string,
  contentType: string,
  expiresIn = 3600,
) {
  // Local storage doesn't rely on "bucket" as S3, but we use it as folder
  const urlPath = `/api/files/${bucket}/${key}`;
  return signUrl(urlPath, "PUT", expiresIn);
}

export async function generateDownloadUrl(
  bucket: string,
  key: string,
  expiresIn = 3600,
) {
  const urlPath = `/api/files/${bucket}/${key}`;
  return signUrl(urlPath, "GET", expiresIn);
}

export async function deleteObject(bucket: string, key: string) {
  await ensureStorageDir();
  const filePath = path.join(STORAGE_ROOT, bucket, key);
  try {
    await fs.unlink(filePath);
  } catch (e) {
    console.warn(`Failed to delete local file: ${filePath}`, e);
  }
}

export function verifySignature(urlPath: string, method: string, expires: string, signature: string): boolean {
  const expiresAt = parseInt(expires, 10);
  if (isNaN(expiresAt) || Date.now() / 1000 > expiresAt) {
    return false;
  }
  const data = `${urlPath}:${method}:${expiresAt}`;
  const expectedSignature = createHmac("sha256", SECRET).update(data).digest("hex");
  return signature === expectedSignature;
}
