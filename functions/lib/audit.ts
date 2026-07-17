import { auditLogs } from '../../shared/db/schema/index';
import { getDb } from './db';
import type { Env } from './env';

export interface AuditEntry {
  actorType?: string;
  actorId?: number | null;
  action: string;
  entityType?: string;
  entityId?: string | number;
  ip?: string | null;
  userAgent?: string | null;
  metadata?: Record<string, unknown>;
}

/** Write an audit record. Never throws into the request path — logging is best-effort. */
export async function writeAudit(env: Env, entry: AuditEntry): Promise<void> {
  try {
    const db = getDb(env);
    await db.insert(auditLogs).values({
      actorType: entry.actorType ?? 'admin',
      actorId: entry.actorId ?? null,
      action: entry.action,
      entityType: entry.entityType ?? null,
      entityId: entry.entityId != null ? String(entry.entityId) : null,
      ip: entry.ip ?? null,
      userAgent: entry.userAgent ?? null,
      metadata: entry.metadata ?? null,
    });
  } catch (err) {
    console.error('Failed to write audit log:', err);
  }
}
