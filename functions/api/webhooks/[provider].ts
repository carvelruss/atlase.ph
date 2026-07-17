import { eq } from 'drizzle-orm';
import type { Fn } from '../../lib/env';
import { getDb, schema } from '../../lib/db';
import { ok, fail } from '../../lib/response';
import { ERROR_CODES } from '../../lib/shared';
import { getPaymentProvider } from '../../lib/providers/payment';

/**
 * Payment provider webhook receiver. Verifies the signature, dedupes by the
 * provider's event id (payment_events unique index), and updates the payment +
 * order status idempotently. Never trusts an unverified payload.
 */
export const onRequestPost: Fn = async ({ request, params, env, data }) => {
  const providerKey = String(params.provider ?? '');
  const provider = getPaymentProvider(providerKey);
  if (!provider) {
    return fail(404, { code: ERROR_CODES.NOT_FOUND, message: 'Unknown webhook provider.' }, { requestId: data.requestId });
  }

  const rawBody = await request.text();
  const result = await provider.parseWebhook(rawBody, request.headers, env);
  if (!result) {
    return fail(400, { code: ERROR_CODES.VALIDATION_ERROR, message: 'Invalid or unverified webhook signature.' }, { requestId: data.requestId });
  }

  const db = getDb(env);

  // Idempotency: if we've already recorded this event id, acknowledge and stop.
  const seen = await db
    .select({ id: schema.paymentEvents.id })
    .from(schema.paymentEvents)
    .where(eq(schema.paymentEvents.externalEventId, result.externalEventId))
    .limit(1);
  if (seen[0]) return ok({ deduped: true }, { requestId: data.requestId });

  // Locate the payment by provider reference.
  let paymentId: number | null = null;
  let orderId: number | null = null;
  if (result.reference) {
    const payment = await db
      .select({ id: schema.payments.id, orderId: schema.payments.orderId })
      .from(schema.payments)
      .where(eq(schema.payments.reference, result.reference))
      .limit(1);
    if (payment[0]) {
      paymentId = payment[0].id;
      orderId = payment[0].orderId;
    }
  }

  await db.insert(schema.paymentEvents).values({
    paymentId,
    provider: providerKey,
    eventType: result.eventType,
    externalEventId: result.externalEventId,
    payload: { reference: result.reference, status: result.status },
  });

  if (paymentId && orderId) {
    const paymentStatus = result.status === 'paid' ? 'paid' : result.status === 'refunded' ? 'refunded' : result.status === 'failed' ? 'failed' : 'pending';
    await db.update(schema.payments).set({ status: paymentStatus, paidAt: result.status === 'paid' ? new Date() : null, updatedAt: new Date() }).where(eq(schema.payments.id, paymentId));

    const orderRows = await db.select({ grandTotal: schema.orders.grandTotal }).from(schema.orders).where(eq(schema.orders.id, orderId)).limit(1);
    const paidPatch = result.status === 'paid' ? { amountPaid: orderRows[0]?.grandTotal ?? 0, status: 'confirmed' } : {};
    await db.update(schema.orders).set({ paymentStatus, updatedAt: new Date(), ...paidPatch }).where(eq(schema.orders.id, orderId));
    await db.insert(schema.orderStatusHistory).values({ orderId, field: 'payment_status', fromValue: null, toValue: paymentStatus, actorType: 'system' });
  }

  return ok({ processed: true }, { requestId: data.requestId });
};
