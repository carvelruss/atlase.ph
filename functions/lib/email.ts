import { notificationLogs } from '../../shared/db/schema/index';
import { getDb } from './db';
import type { Env } from './env';

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
  templateKey?: string;
  referenceType?: string;
  referenceId?: string | number;
}

/**
 * Transactional email dispatcher. Provider-agnostic: the "console" provider logs
 * to the worker console for local development; real providers (Resend/Postmark/
 * SendGrid) are wired in Phase 5 behind the same interface. Delivery never blocks
 * the caller's critical path — callers should not await this in order flows.
 */
export async function sendEmail(env: Env, msg: EmailMessage): Promise<{ ok: boolean; error?: string }> {
  const provider = env.EMAIL_PROVIDER ?? 'console';
  let ok = true;
  let error: string | undefined;

  try {
    if (provider === 'resend' && env.EMAIL_API_KEY) {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: { Authorization: `Bearer ${env.EMAIL_API_KEY}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          from: env.EMAIL_FROM ?? 'Atlase <onboarding@resend.dev>',
          to: [msg.to],
          subject: msg.subject,
          html: msg.html,
          text: msg.text,
        }),
      });
      if (!res.ok) {
        ok = false;
        error = `Resend responded ${res.status}: ${await res.text().catch(() => '')}`.slice(0, 300);
      }
    } else if (provider === 'console' || !env.EMAIL_API_KEY) {
      // Dev / unconfigured: log instead of sending.
      console.log(`📧 [email:${provider}] to=${msg.to} subject="${msg.subject}"`);
      console.log(msg.text ?? msg.html);
    } else {
      // Postmark/SendGrid adapters follow the same shape; not yet wired.
      console.log(`📧 [email:${provider}] (adapter not configured) to=${msg.to}`);
    }
  } catch (err) {
    ok = false;
    error = err instanceof Error ? err.message : 'Unknown email error';
  }

  try {
    const db = getDb(env);
    await db.insert(notificationLogs).values({
      templateKey: msg.templateKey ?? null,
      channel: 'email',
      recipient: msg.to,
      subject: msg.subject,
      status: ok ? 'sent' : 'failed',
      error: error ?? null,
      referenceType: msg.referenceType ?? null,
      referenceId: msg.referenceId != null ? String(msg.referenceId) : null,
    });
  } catch (logErr) {
    console.error('Failed to log notification:', logErr);
  }

  return { ok, error };
}
