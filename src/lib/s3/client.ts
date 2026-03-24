import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

function getS3Config() {
  const bucket = process.env.S3_BUCKET;
  const accessKeyId = process.env.S3_ACCESS_KEY;
  const secretAccessKey = process.env.S3_SECRET_KEY;

  if (!bucket) throw new Error('S3_BUCKET environment variable is required');
  if (!accessKeyId)
    throw new Error('S3_ACCESS_KEY environment variable is required');
  if (!secretAccessKey)
    throw new Error('S3_SECRET_KEY environment variable is required');

  return { bucket, accessKeyId, secretAccessKey };
}

function createClient(): S3Client {
  const { accessKeyId, secretAccessKey } = getS3Config();
  const endpoint = process.env.S3_ENDPOINT;

  return new S3Client({
    region: 'us-east-1',
    credentials: { accessKeyId, secretAccessKey },
    ...(endpoint
      ? {
          endpoint,
          forcePathStyle: true,
        }
      : {}),
  });
}

/**
 * Uploads a file buffer to S3 under the `tenantId/` namespace.
 * Returns the object key and the public URL for the uploaded object.
 */
export async function uploadFile(
  tenantId: string,
  file: Buffer,
  filename: string,
  mimeType: string,
): Promise<{ key: string; url: string }> {
  const { bucket } = getS3Config();
  const client = createClient();

  const key = `${tenantId}/${filename}`;

  await client.send(
    new PutObjectCommand({
      Bucket: bucket,
      Key: key,
      Body: file,
      ContentType: mimeType,
    }),
  );

  const publicUrlBase = process.env.S3_PUBLIC_URL ?? process.env.S3_ENDPOINT;
  const url = publicUrlBase
    ? `${publicUrlBase.replace(/\/$/, '')}/${bucket}/${key}`
    : `https://${bucket}.s3.amazonaws.com/${key}`;

  return { key, url };
}

/**
 * Removes an object from S3 by its key.
 */
export async function deleteFile(key: string): Promise<void> {
  const { bucket } = getS3Config();
  const client = createClient();

  await client.send(
    new DeleteObjectCommand({
      Bucket: bucket,
      Key: key,
    }),
  );
}

/**
 * Returns a presigned URL that grants temporary access to the object.
 * Defaults to 3600 seconds (1 hour) expiry.
 */
export async function getPresignedUrl(
  key: string,
  expiresInSeconds = 3600,
): Promise<string> {
  const { bucket } = getS3Config();
  const client = createClient();

  const command = new GetObjectCommand({ Bucket: bucket, Key: key });
  return getSignedUrl(client, command, { expiresIn: expiresInSeconds });
}
