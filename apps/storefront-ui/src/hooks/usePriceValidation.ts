import { useEffect, useRef, useState } from 'react';
import { validatePrices } from '../lib/checkout-api';
import type { CartItem } from '../store/cartStore';

/**
 * Best-effort server price validation. Failures are silent — checkout itself
 * re-validates every price server-side, so this banner is informational only.
 */
export function usePriceValidation(items: CartItem[], updatePrices: (updates: { id: string; price: number }[]) => void) {
  const [priceChanged, setPriceChanged] = useState(false);
  // Serialize id+quantity so quantity edits (same length) also trigger re-validation.
  const itemsKey = items.map(i => `${i.id}:${i.quantity}`).join(',');
  const itemsRef = useRef(items);
  itemsRef.current = items;

  useEffect(() => {
    if (itemsRef.current.length === 0) return;
    let cancelled = false;

    (async () => {
      try {
        const current = itemsRef.current;
        const data = await validatePrices(
          current
            .filter(item => item.id && (item.product_id || item.id))
            .map(item => ({ id: item.id, product_id: item.product_id ?? item.id }))
        );
        if (cancelled || !data?.success || !Array.isArray(data.updates)) return;
        const priceUpdates = data.updates
          .filter((u) => {
            const localItem = current.find(i => i.id === u.id);
            return localItem && localItem.price !== u.price;
          })
          .map((u) => ({ id: u.id, price: u.price }));
        if (priceUpdates.length > 0) {
          updatePrices(priceUpdates);
          setPriceChanged(true);
        }
      } catch {
        // fail silently
      }
    })();

    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey]);

  return priceChanged;
}
