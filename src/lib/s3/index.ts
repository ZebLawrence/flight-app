import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from '@aws-sdk/client-s3';

const client = new S3Client({
  endpoint: process.env.S3_ENDPOINT ?? 'http://localhost:9000',
  region: process.env.S3_REGION ?? 'us-east-1',
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY_ID ?? 'minioadmin',
    secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? 'minioadmin',
  },
  forcePathStyle: true,
});

const BUCKET = process.env.S3_BUCKET ?? 'flight-app';

/**
 * Uploads a file buffer to S3 under `tenantId/<filename>` and returns the
 * public URL and the S3 key.
 */
export async function uploadFile(
  tenantId: string,
  buffer: Buffer,
  filename: string,
  mimeType: string,
): Promise<{ key: string; url: string }> {
  const key = `${tenantId}/${filename}`;

  await client.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: buffer,
      ContentType: mimeType,
      ContentLength: buffer.byteLength,
    }),
  );

  const endpoint = (process.env.S3_ENDPOINT ?? 'http://localhost:9000').replace(/\/$/, '');
  const url = `${endpoint}/${BUCKET}/${key}`;

  return { key, url };
}

/**
 * Deletes an object from S3 by its key.
 */
export async function deleteFile(key: string): Promise<void> {
  await client.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    }),
  );
}
