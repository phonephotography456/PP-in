import "server-only";
import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

/** Cloudflare R2 over the S3 API. Credentials stay on the server; the public base URL is the only env var that changes for a custom domain. */
const env = () => ({
  accountId: process.env.R2_ACCOUNT_ID,
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  bucket: process.env.R2_BUCKET,
  publicUrl: process.env.R2_PUBLIC_URL?.replace(/\/+$/, ""),
});

export function r2Configured() {
  const e = env();
  return !!(e.accountId && e.accessKeyId && e.secretAccessKey && e.bucket && e.publicUrl);
}

let client: S3Client | undefined;
function s3() {
  const e = env();
  client ??= new S3Client({
    region: "auto",
    endpoint: `https://${e.accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: e.accessKeyId!, secretAccessKey: e.secretAccessKey! },
    requestChecksumCalculation: "WHEN_REQUIRED",
    responseChecksumValidation: "WHEN_REQUIRED",
  });
  return client;
}

/** Keys are generated server-side only: <kind>/<photographerId>/<parentId or profile slot>/<random>.webp */
export const objectKey = (kind: "packages" | "portfolio" | "profile", photographerId: string, parent: string) =>
  `${kind}/${photographerId}/${parent}/${crypto.randomUUID()}.webp`;

const U = "[0-9a-f-]{36}";
const KEY = new RegExp(`^((packages|portfolio)/${U}/${U}|profile/${U}/(photo|logo|banner))/${U}\\.webp$`);

export const publicUrl = (key: string) => `${env().publicUrl}/${key}`;

/** The object key behind a stored URL, or null if the URL is not one of our uploads. */
export function keyFromUrl(url: string) {
  const base = env().publicUrl;
  if (!base || !url.startsWith(base + "/")) return null;
  const key = url.slice(base.length + 1);
  return KEY.test(key) ? key : null;
}

export async function putImage(key: string, body: Buffer) {
  await s3().send(new PutObjectCommand({
    Bucket: env().bucket, Key: key, Body: body, ContentType: "image/webp", ContentLength: body.length,
    CacheControl: "public, max-age=31536000, immutable", // keys are unique per upload, never overwritten
  }));
}

export async function deleteKey(key: string) {
  await s3().send(new DeleteObjectCommand({ Bucket: env().bucket, Key: key }));
}

/**
 * Best-effort removal of stored files after their DB rows are gone. Never throws; failures only leave an orphan file.
 * Only deletes keys under the given photographer's own prefix, so a URL tampered to point at someone else's file is ignored.
 */
export async function purgeUrls(urls: string[], ownerId: string) {
  if (!r2Configured()) return;
  await Promise.all(urls.map(async (u) => {
    const key = keyFromUrl(u);
    if (!key || key.split("/")[1] !== ownerId) return;
    try { await deleteKey(key); } catch (e) { console.error("R2 cleanup failed", key, (e as Error).message); }
  }));
}
