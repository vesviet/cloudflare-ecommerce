import { useEffect, useState } from 'react';
import { getShippingEstimate } from '../lib/checkout-api';

/** Server-authoritative shipping fee resolved whenever the postcode changes. */
export function useShippingEstimate(activePostcode: string) {
  const [shippingFeeCents, setShippingFeeCents] = useState<number>(5000);
  const [shippingLoading, setShippingLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
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
    };
    run();
    return () => { cancelled = true; };
  }, [activePostcode]);

  return { shippingFeeCents, shippingLoading };
}
