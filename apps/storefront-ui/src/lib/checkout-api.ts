import { apiFetch } from './api-client';

// Typed wrappers for every endpoint the checkout surface touches.
// Payload/response shapes intentionally mirror the existing inline fetches.

export type CartSyncItem = { productId: string; quantity: number };

export function syncCart(items: CartSyncItem[], guestSessionId?: string) {
  return apiFetch<{ success: boolean; cartId?: string }>('/api/cart/sync', {
    body: { items, guestSessionId },
    credentials: 'include',
  });
}

export function applyCoupon(couponCode: string, subTotalCents: number, cartId: string = 'active') {
  return apiFetch<{
    success: boolean;
    coupon?: { id: string; code: string; type: string; value: number };
    error?: string;
  }>('/api/cart/coupon', {
    body: { cart_id: cartId, coupon_code: couponCode, subTotalCents },
    credentials: 'include',
  });
}

export function getShippingEstimate(postcode: string) {
  return apiFetch<{ success: boolean; shipping_fee_cents?: number }>(
    `/api/checkout/shipping-estimate?postcode=${encodeURIComponent(postcode)}`
  );
}

export function getAddresses() {
  return apiFetch<{ success: boolean; data: unknown[] }>('/api/customer/addresses', {
    credentials: 'include',
  });
}

export function getLoyalty() {
  return apiFetch<{ success: boolean; data?: { balance: number } }>('/api/customer/loyalty', {
    credentials: 'include',
  });
}

export function validatePrices(items: { id: string; product_id: string }[]) {
  return apiFetch<{ success: boolean; updates?: { id: string; price: number }[] }>(
    '/api/checkout/validate-prices',
    { body: { items } }
  );
}

export function postCheckout(payload: Record<string, unknown>, idempotencyKey: string) {
  return apiFetch<{ success: boolean; order_id?: string; checkout_url?: string; error?: string }>(
    '/api/checkout',
    {
      body: payload,
      headers: { 'Idempotency-Key': idempotencyKey },
      credentials: 'include',
    }
  );
}
