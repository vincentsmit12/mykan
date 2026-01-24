import { createHmac } from "crypto";
import { createReadStream, createWriteStream, promises as fs } from "fs";
import type { NextApiRequest, NextApiResponse } from "next";
import path from "path";
import { pipeline } from "stream/promises";

export const config = {
  api: {
    bodyParser: false,
  },
};

const SECRET = process.env.BETTER_AUTH_SECRET || "fallback-secret-do-not-use-in-prod";
const STORAGE_ROOT = process.env.KAN_STORAGE_PATH || path.join(process.cwd(), "storage");

function verifySignature(urlPath: string, method: string, expires: string, signature: string): boolean {
  const expiresAt = parseInt(expires, 10);
  if (isNaN(expiresAt) || Date.now() / 1000 > expiresAt) {
    return false;
  }
  const data = `${urlPath}:${method}:${expiresAt}`;
  const expectedSignature = createHmac("sha256", SECRET).update(data).digest("hex");
  return signature === expectedSignature;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { path: pathParams, expires, signature } = req.query;

  if (!pathParams || !Array.isArray(pathParams) || pathParams.length < 2) {
    return res.status(400).json({ message: "Invalid path" });
  }

  const bucket = pathParams[0];
  const key = pathParams.slice(1).join("/");
  // Reconstruct the URL path used for signing (must match local-adapter.ts)
  // local-adapter uses: `/api/files/${bucket}/${key}`
  const urlPath = `/api/files/${bucket}/${key}`;

  if (
    !expires ||
    !signature ||
    typeof expires !== "string" ||
    typeof signature !== "string" ||
    !verifySignature(urlPath, req.method || "GET", expires, signature)
  ) {
    return res.status(403).json({ message: "Invalid or expired signature" });
  }

  const filePath = path.join(STORAGE_ROOT, bucket, key);

  try {
    if (req.method === "PUT") {
      // Ensure directory exists
      await fs.mkdir(path.dirname(filePath), { recursive: true });

      const writeStream = createWriteStream(filePath);
      await pipeline(req, writeStream);

      return res.status(200).json({ success: true });
    } else if (req.method === "GET") {
      try {
        await fs.access(filePath);
      } catch {
        return res.status(404).json({ message: "File not found" });
      }

      // Determine content type? S3 stores it. Local FS doesn't store metadata easily.
      // We can guess from extension or just send generic.
      // The browser usually handles images fine.
      // For now, let's not set Content-Type explicitly or guess it.

      const readStream = createReadStream(filePath);
      await pipeline(readStream, res);
    } else {
      res.status(405).json({ message: "Method not allowed" });
    }
  } catch (error) {
    console.error("Storage API Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
}
