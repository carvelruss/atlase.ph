import type { Fn } from '../../../lib/env';
import { deleteMedia } from '../../../lib/media';
import { ok } from '../../../lib/response';
import { badRequest } from '../../../lib/errors';
import { writeAudit } from '../../../lib/audit';

export const onRequestDelete: Fn = async ({ params, env, data }) => {
  const id = Number(params.id);
  if (!Number.isInteger(id)) throw badRequest('Invalid media id.');

  await deleteMedia(env, id);
  await writeAudit(env, {
    actorId: data.admin?.id ?? null,
    action: 'media.delete',
    entityType: 'media_asset',
    entityId: id,
  });

  return ok({ deleted: true }, { requestId: data.requestId });
};
