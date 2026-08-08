import { useEffect, useState } from 'react';
import { getShippingEstimate } from '../lib/checkout-api';

/** Server-authoritative shipping fee resolved whenever the postcode changes. */
export function useShippingEstimate(activePostcode: string) {
  const [shippingFeeCents, setShippingFeeCents] = useState<number>(0);
  const [shippingLoading, setShippingLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const timer = setTimeout(async () => {
      setShippingLoading(true);
      try {
        const data = await getShippingEstimate(activePostcode);
        if (!cancelled && data?.success && typeof data.shipping_fee_cents === 'number') {
          setShippingFeeCents(data.shipping_fee_cents);
        }
      } catch {
        // fail open: keep previous estimate
      } finally {
        if (!cancelled) setShippingLoading(false);
      }
    }, 400);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [activePostcode]);

  return { shippingFeeCents, shippingLoading };
}
