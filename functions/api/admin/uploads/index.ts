import type { Fn } from '../../../lib/env';
import { uploadMedia } from '../../../lib/media';
import { created } from '../../../lib/response';
import { badRequest } from '../../../lib/errors';
import { writeAudit } from '../../../lib/audit';
import { getClientIp } from '../../../lib/http';

const ALLOWED_FOLDERS = new Set(['products', 'categories', 'collections', 'blog', 'branding', 'uploads']);

/** Upload an image to R2 (multipart/form-data: file, folder, entityId, altText, width, height). */
export const onRequestPost: Fn = async ({ request, env, data }) => {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    throw badRequest('Expected multipart/form-data with a file field.');
  }

  const file = form.get('file');
  if (!file || typeof file === 'string') throw badRequest('No file provided.');

  const rawFolder = String(form.get('folder') ?? 'uploads');
  const folder = ALLOWED_FOLDERS.has(rawFolder) ? rawFolder : 'uploads';
  const entityIdRaw = form.get('entityId');
  const entityId = entityIdRaw ? Number(entityIdRaw) : undefined;
  const altText = form.get('altText') ? String(form.get('altText')) : null;
  const width = form.get('width') ? Number(form.get('width')) : null;
  const height = form.get('height') ? Number(form.get('height')) : null;

  const asset = await uploadMedia(env, {
    file,
    folder,
    entityId: Number.isFinite(entityId) ? entityId : undefined,
    altText,
    width: Number.isFinite(width) ? width : null,
    height: Number.isFinite(height) ? height : null,
    uploadedBy: data.admin?.id ?? null,
  });

  await writeAudit(env, {
    actorId: data.admin?.id ?? null,
    action: 'media.upload',
    entityType: 'media_asset',
    entityId: asset.id,
    ip: getClientIp(request),
    metadata: { fileName: asset.fileName, sizeBytes: asset.sizeBytes },
  });

  return created(asset, { requestId: data.requestId });
};
