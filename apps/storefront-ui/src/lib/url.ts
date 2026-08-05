/** Only ever redirect to an HTTPS Stripe-hosted checkout URL. */
export function isTrustedCheckoutUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'https:' && (u.hostname === 'stripe.com' || u.hostname.endsWith('.stripe.com'));
  } catch {
    return false;
  }
}
