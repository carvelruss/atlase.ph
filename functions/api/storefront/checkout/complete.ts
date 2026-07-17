import { z } from 'zod';
import type { Fn } from '../../../lib/env';
import { parseJsonBody } from '../../../lib/validation';
import { ok } from '../../../lib/response';
import { badRequest } from '../../../lib/errors';
import { addressSchema } from '../../../lib/validators';
import { findCart } from '../../../lib/services/cart';
import { completeCheckout, type CompleteInput } from '../../../lib/services/checkout';
import { sendEmail } from '../../../lib/email';
import { serializeCookie, CART_COOKIE } from '../../../lib/cookies';
import { isProduction } from '../../../lib/env';
import { formatMoney } from '../../../lib/shared';

const bodySchema = z.object({
  email: z.string().email().max(200),
  phone: z.string().max(40).nullable().optional(),
  shipping: addressSchema,
  billingSameAsShipping: z.boolean().default(true),
  billing: addressSchema.nullable().optional(),
  shippingMethodId: z.number().int().nonnegative().default(0),
  paymentMethod: z.enum(['cod', 'bank_transfer']),
  discountCode: z.string().max(60).nullable().optional(),
  customerNote: z.string().max(1000).nullable().optional(),
  marketingConsent: z.boolean().optional(),
  termsAccepted: z.boolean().optional(),
  idempotencyKey: z.string().min(8).max(100),
});

export const onRequestPost: Fn = async ({ request, env, data }) => {
  const cartId = await findCart(env, request);
  if (!cartId) throw badRequest('Your cart is empty.');
  const input = await parseJsonBody(request, bodySchema);

  const completeInput: CompleteInput = {
    email: input.email,
    phone: input.phone ?? null,
    shipping: input.shipping,
    billing: input.billingSameAsShipping ? null : (input.billing ?? null),
    shippingMethodId: input.shippingMethodId,
    paymentMethod: input.paymentMethod,
    discountCode: input.discountCode ?? null,
    customerNote: input.customerNote ?? null,
    marketingConsent: input.marketingConsent,
    idempotencyKey: input.idempotencyKey,
  };

  const result = await completeCheckout(env, cartId, completeInput);

  // Send confirmation email (best-effort; never blocks the response).
  void sendEmail(env, {
    to: result.email,
    subject: `Order ${result.orderNumber} confirmed`,
    templateKey: 'order_confirmation',
    html: `<p>Thanks for your order!</p><p>Order <strong>${result.orderNumber}</strong> — total ${formatMoney(result.grandTotal)}.</p><p>Payment: ${result.paymentMethod === 'cod' ? 'Cash on delivery' : 'Bank transfer'}.</p>`,
    referenceType: 'order',
    referenceId: result.orderId,
  });

  // Clear the guest cart cookie (cart is now converted).
  const clearCart = serializeCookie(CART_COOKIE, '', { maxAge: 0, httpOnly: true, secure: isProduction(env), sameSite: 'Lax' });

  return ok(
    { orderId: result.orderId, orderNumber: result.orderNumber, grandTotal: result.grandTotal, email: result.email },
    { requestId: data.requestId },
    201,
    { 'Set-Cookie': clearCart },
  );
};
