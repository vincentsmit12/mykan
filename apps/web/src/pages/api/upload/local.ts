import fs from 'fs';
import path from 'path';
import type { NextApiRequest, NextApiResponse } from 'next';
import { env } from "~/env"; // Ensure this import matches your project structure

// Disable the default body parser so we can stream the file directly to disk
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Only allow PUT requests (mimicking S3)
  if (req.method !== 'PUT') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { file } = req.query;

  if (!file || Array.isArray(file)) {
    return res.status(400).json({ error: 'Missing filename' });
  }

  try {
    // 1. Determine where to save
    // We use the avatar bucket name from your env, or default to 'avatars'
    const bucketName = process.env.NEXT_PUBLIC_AVATAR_BUCKET_NAME || 'avatars';
    const uploadDir = path.join('C:/uploads', bucketName);

    // 2. Construct full path (e.g., C:/uploads/avatars/user-123/avatar.png)
    const filePath = path.join(uploadDir, file as string);

    // 3. Security Check (Prevent escaping the folder)
    const resolvedPath = path.resolve(filePath);
    const resolvedRoot = path.resolve(uploadDir);
    if (!resolvedPath.startsWith(resolvedRoot)) {
        return res.status(403).json({ error: 'Access denied' });
    }

    // 4. Ensure the folder exists (Recursive create)
    // The filename might be "user-id/image.png", so we need to create the "user-id" folder first
    const folderPath = path.dirname(resolvedPath);
    if (!fs.existsSync(folderPath)) {
      fs.mkdirSync(folderPath, { recursive: true });
    }

    // 5. Write the file (Stream the request body to disk)
    const writeStream = fs.createWriteStream(resolvedPath);
    
    // Pipe the request (file data) into the file
    req.pipe(writeStream);

    // Return success when finished
    await new Promise((resolve, reject) => {
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
    });

    return res.status(200).json({ success: true });

  } catch (error) {
    console.error("Upload Error:", error);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
}