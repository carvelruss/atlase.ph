import { hmacHex, timingSafeEqual } from '../crypto';
import type { Env } from '../env';

export type PaymentStatusResult = 'paid' | 'failed' | 'refunded' | 'pending';

export interface WebhookResult {
  externalEventId: string;
  reference: string | null;
  status: PaymentStatusResult;
  eventType: string;
}

export interface PaymentProvider {
  key: string;
  /** Verify a webhook signature and parse it into a normalized result, or return null. */
  parseWebhook(rawBody: string, headers: Headers, env: Env): Promise<WebhookResult | null>;
}

/** Parse a Stripe/PayMongo style "t=<ts>,v1=<sig>" signature header. */
function parseSignatureHeader(header: string | null): { t?: string; sig?: string } {
  if (!header) return {};
  const out: { t?: string; sig?: string } = {};
  for (const part of header.split(',')) {
    const [k, v] = part.split('=');
    if (k === 't') out.t = v;
    if (k === 'v1' || k === 'te' || k === 'li') out.sig = out.sig ?? v;
  }
  return out;
}

async function verifyTimestampedSignature(rawBody: string, header: string | null, secret: string): Promise<boolean> {
  const { t, sig } = parseSignatureHeader(header);
  if (!t || !sig) return false;
  const expected = await hmacHex(secret, `${t}.${rawBody}`);
  return timingSafeEqual(expected, sig);
}

const stripe: PaymentProvider = {
  key: 'stripe',
  async parseWebhook(rawBody, headers, env) {
    const secret = env.STRIPE_WEBHOOK_SECRET;
    if (!secret) return null;
    if (!(await verifyTimestampedSignature(rawBody, headers.get('Stripe-Signature'), secret))) return null;
    const event = JSON.parse(rawBody) as { id: string; type: string; data: { object: { id?: string; metadata?: { reference?: string } } } };
    const obj = event.data?.object ?? {};
    const reference = obj.metadata?.reference ?? obj.id ?? null;
    const status: PaymentStatusResult = event.type.includes('payment_intent.succeeded') || event.type.includes('charge.succeeded')
      ? 'paid'
      : event.type.includes('refund')
        ? 'refunded'
        : event.type.includes('failed')
          ? 'failed'
          : 'pending';
    return { externalEventId: event.id, reference, status, eventType: event.type };
  },
};

const paymongo: PaymentProvider = {
  key: 'paymongo',
  async parseWebhook(rawBody, headers, env) {
    const secret = env.PAYMONGO_WEBHOOK_SECRET;
    if (!secret) return null;
    if (!(await verifyTimestampedSignature(rawBody, headers.get('Paymongo-Signature'), secret))) return null;
    const event = JSON.parse(rawBody) as { data: { id: string; attributes: { type: string; data: { id?: string; attributes?: { reference_number?: string } } } } };
    const type = event.data?.attributes?.type ?? '';
    const inner = event.data?.attributes?.data ?? {};
    const reference = inner.attributes?.reference_number ?? inner.id ?? null;
    const status: PaymentStatusResult = type.includes('paid') || type.includes('payment.paid')
      ? 'paid'
      : type.includes('refund')
        ? 'refunded'
        : type.includes('failed')
          ? 'failed'
          : 'pending';
    return { externalEventId: event.data.id, reference, status, eventType: type };
  },
};

// Manual/COD has no external webhook; status changes are driven by the admin.
const PROVIDERS: Record<string, PaymentProvider> = { stripe, paymongo };

export function getPaymentProvider(key: string): PaymentProvider | null {
  return PROVIDERS[key] ?? null;
}
