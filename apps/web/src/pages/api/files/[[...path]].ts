import { createHmac } from "crypto";
import { createReadStream, createWriteStream, promises as fs } from "fs";
import type { NextApiRequest, NextApiResponse } from "next";
import path from "path";
import { pipeline } from "stream/promises";
import mime from "mime"; // OPTIONAL: Helps images load faster/correctly (pnpm add mime)

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
  // --- FIX: ADD CORS HEADERS ---
  // This allows the browser to actually read the file
  res.setHeader("Access-Control-Allow-Origin", "*"); 
  res.setHeader("Access-Control-Allow-Methods", "GET, PUT, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  // Handle "Preflight" checks automatically
  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }
  // -----------------------------

  const { path: pathParams, expires, signature } = req.query;

  if (!pathParams || !Array.isArray(pathParams) || pathParams.length < 2) {
    return res.status(400).json({ message: "Invalid path" });
  }

  const bucket = pathParams[0];
  const key = pathParams.slice(1).join("/");
  
  // Reconstruct the URL path used for signing
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

      // Try to set the correct content type (helps images display instead of download)
      const contentType = mime.getType(filePath) || 'application/octet-stream';
      res.setHeader('Content-Type', contentType);

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
