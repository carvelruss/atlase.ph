import { sql } from 'drizzle-orm';
import { integer, sqliteTable, text, index, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { timestamps } from './_helpers';

/** The single store administrator (single-owner platform; typically one row). */
export const adminUsers = sqliteTable(
  'admin_users',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    email: text('email').notNull(),
    name: text('name').notNull().default('Store Owner'),
    passwordHash: text('password_hash').notNull(),
    passwordSalt: text('password_salt').notNull(),
    role: text('role').notNull().default('owner'),
    isActive: integer('is_active', { mode: 'boolean' }).notNull().default(true),
    lastLoginAt: integer('last_login_at', { mode: 'timestamp' }),
    lastLoginIp: text('last_login_ip'),
    passwordChangedAt: integer('password_changed_at', { mode: 'timestamp' }),
    // Bumped to invalidate every existing session ("log out everywhere").
    sessionEpoch: integer('session_epoch').notNull().default(0),
    ...timestamps,
  },
  (t) => [uniqueIndex('idx_admin_users_email').on(t.email)],
);

/** Server-side admin sessions. The cookie holds only the opaque session id. */
export const adminSessions = sqliteTable(
  'admin_sessions',
  {
    id: text('id').primaryKey(), // random opaque token
    adminUserId: integer('admin_user_id')
      .notNull()
      .references(() => adminUsers.id, { onDelete: 'cascade' }),
    sessionEpoch: integer('session_epoch').notNull().default(0),
    csrfToken: text('csrf_token').notNull(),
    userAgent: text('user_agent'),
    ip: text('ip'),
    rememberMe: integer('remember_me', { mode: 'boolean' }).notNull().default(false),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    lastSeenAt: integer('last_seen_at', { mode: 'timestamp' }),
    ...timestamps,
  },
  (t) => [index('idx_admin_sessions_user').on(t.adminUserId)],
);

export const passwordResetTokens = sqliteTable(
  'password_reset_tokens',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    adminUserId: integer('admin_user_id')
      .notNull()
      .references(() => adminUsers.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(), // store only the hash
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    usedAt: integer('used_at', { mode: 'timestamp' }),
    ...timestamps,
  },
  (t) => [uniqueIndex('idx_password_reset_token').on(t.tokenHash)],
);

/** Failed/successful login attempts for rate limiting and lockout. */
export const loginAttempts = sqliteTable(
  'login_attempts',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    email: text('email').notNull(),
    ip: text('ip'),
    success: integer('success', { mode: 'boolean' }).notNull().default(false),
    userAgent: text('user_agent'),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    index('idx_login_attempts_email').on(t.email),
    index('idx_login_attempts_ip').on(t.ip),
  ],
);

/** Scoped API tokens for external/webhook automation. Only the hash is stored. */
export const apiTokens = sqliteTable(
  'api_tokens',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    name: text('name').notNull(),
    tokenPrefix: text('token_prefix').notNull(), // shown in UI, e.g. "atl_live_ab12"
    tokenHash: text('token_hash').notNull(),
    scopes: text('scopes', { mode: 'json' }).$type<string[]>().notNull().default(sql`'[]'`),
    lastUsedAt: integer('last_used_at', { mode: 'timestamp' }),
    revokedAt: integer('revoked_at', { mode: 'timestamp' }),
    createdBy: integer('created_by').references(() => adminUsers.id),
    ...timestamps,
  },
  (t) => [uniqueIndex('idx_api_tokens_hash').on(t.tokenHash)],
);

/** Append-only audit trail of important admin actions. Never stores secrets. */
export const auditLogs = sqliteTable(
  'audit_logs',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    actorType: text('actor_type').notNull().default('admin'), // admin | system | api
    actorId: integer('actor_id'),
    action: text('action').notNull(), // e.g. product.update
    entityType: text('entity_type'),
    entityId: text('entity_id'),
    ip: text('ip'),
    userAgent: text('user_agent'),
    metadata: text('metadata', { mode: 'json' }).$type<Record<string, unknown>>(),
    createdAt: integer('created_at', { mode: 'timestamp' })
      .notNull()
      .default(sql`(unixepoch())`),
  },
  (t) => [
    index('idx_audit_logs_entity').on(t.entityType, t.entityId),
    index('idx_audit_logs_action').on(t.action),
  ],
);
