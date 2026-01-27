import type { NextApiRequest, NextApiResponse } from "next";
import { createNextApiContext } from "@kan/api/trpc";
// Remove S3 imports
// import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
// import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

import { env } from "~/env";

const allowedContentTypes = ["image/jpeg", "image/png"];

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse,
) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const { user } = await createNextApiContext(req);

    if (!user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { filename, contentType } = req.body as {
      filename: string;
      contentType: string;
    };

    // Keep your existing validation regex
    const filenameRegex = /^[a-f0-9\-]+\/[a-zA-Z0-9_\-]+(\.jpg|\.jpeg|\.png)$/;

    if (!filenameRegex.test(filename)) {
      return res.status(400).json({ error: "Invalid filename" });
    }

    if (
      typeof contentType !== "string" ||
      !allowedContentTypes.includes(contentType)
    ) {
      return res.status(400).json({ error: "Invalid content type" });
    }

    // --- OLD S3 LOGIC (DELETED) ---
    // const client = new S3Client({ ... });
    // const signedUrl = await getSignedUrl(...);

    // --- NEW LOCAL LOGIC ---
    // We construct a URL that points to OUR OWN server's upload handler.
    // The frontend will treat this just like the S3 URL and PUT the file here.
    
    // Get the base URL (e.g. https://your-domain.com)
    // We use the env variable, or fallback to relative path if empty
    const baseUrl = env.NEXT_PUBLIC_STORAGE_URL 
        ? env.NEXT_PUBLIC_STORAGE_URL.replace('/api/uploads', '') // Strip suffix if present
        : ''; 

    // Final URL: /api/upload/local?file=userid/filename.png
    const signedUrl = `${baseUrl}/api/upload/local?file=${encodeURIComponent(filename)}`;

    return res.status(200).json({ url: signedUrl, key: filename });

  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
}
