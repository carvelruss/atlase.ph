import { eq } from 'drizzle-orm';
import { mediaAssets } from '../../shared/db/schema/index';
import { getDb } from './db';
import { badRequest, conflict, notFound } from './errors';
import type { Env } from './env';

// Allowed image types → canonical extension. Executable/unknown types are rejected.
const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'image/gif': 'gif',
  'image/avif': 'avif',
  'image/svg+xml': 'svg',
};
const MAX_BYTES = 8 * 1024 * 1024; // 8 MB

export function safeFileName(name: string, fallbackExt: string): string {
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^[-.]+/, '')
    .slice(0, 60);
  return cleaned || `upload.${fallbackExt}`;
}

export interface UploadInput {
  file: File;
  folder: string;
  entityId?: number | string;
  altText?: string | null;
  width?: number | null;
  height?: number | null;
  uploadedBy?: number | null;
}

export interface MediaAssetRecord {
  id: number;
  url: string;
  objectKey: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  altText: string | null;
  width: number | null;
  height: number | null;
}

/**
 * Validate and store an uploaded image in R2, then record its metadata in D1.
 * Binary data lives in R2 only; D1 stores the object key + metadata.
 */
export async function uploadMedia(env: Env, input: UploadInput): Promise<MediaAssetRecord> {
  const { file } = input;
  const type = file.type;
  const ext = ALLOWED_TYPES[type];
  if (!ext) {
    throw badRequest('Unsupported file type. Allowed: JPEG, PNG, WebP, AVIF, GIF, SVG.');
  }
  if (file.size <= 0 || file.size > MAX_BYTES) {
    throw badRequest('File must be between 1 byte and 8 MB.');
  }

  const environment = env.ENVIRONMENT ?? 'production';
  const uuid = crypto.randomUUID();
  const fileName = safeFileName(file.name || `upload.${ext}`, ext);
  const objectKey = `store/${environment}/${input.folder}/${input.entityId ?? '0'}/${uuid}-${fileName}`;

  const bytes = await file.arrayBuffer();
  await env.MEDIA_BUCKET.put(objectKey, bytes, {
    httpMetadata: { contentType: type, cacheControl: 'public, max-age=31536000, immutable' },
  });

  const url = `/media/${objectKey}`;
  const db = getDb(env);
  const inserted = await db
    .insert(mediaAssets)
    .values({
      objectKey,
      url,
      fileName,
      mimeType: type,
      sizeBytes: file.size,
      width: input.width ?? null,
      height: input.height ?? null,
      altText: input.altText ?? null,
      folder: input.folder,
      uploadedBy: input.uploadedBy ?? null,
    })
    .returning();

  const asset = inserted[0];
  if (!asset) throw new Error('Failed to record media asset.');
  return asset;
}

/** Delete a media asset from R2 + D1, unless it is still referenced (refCount > 0). */
export async function deleteMedia(env: Env, id: number): Promise<void> {
  const db = getDb(env);
  const rows = await db.select().from(mediaAssets).where(eq(mediaAssets.id, id)).limit(1);
  const asset = rows[0];
  if (!asset) throw notFound('Media asset not found.');
  if (asset.refCount > 0) {
    throw conflict('This asset is in use and cannot be deleted.');
  }
  await env.MEDIA_BUCKET.delete(asset.objectKey);
  await db.delete(mediaAssets).where(eq(mediaAssets.id, id));
}
