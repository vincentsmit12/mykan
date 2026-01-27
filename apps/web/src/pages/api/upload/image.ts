import type { NextApiRequest, NextApiResponse } from "next";
import { env as nextRuntimeEnv } from "next-runtime-env";

import { createNextApiContext, storage } from "@kan/api";

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

    const bucket = nextRuntimeEnv("NEXT_PUBLIC_AVATAR_BUCKET_NAME");
    if (!bucket) {
      return res.status(500).json({ error: "Avatar bucket not configured" });
    }

    const signedUrl = await storage.generateUploadUrl(
      bucket,
      filename,
      contentType,
    );

    return res.status(200).json({ url: signedUrl, key: filename });

  } catch (error) {
    return res.status(500).json({ error: (error as Error).message });
  }
}
