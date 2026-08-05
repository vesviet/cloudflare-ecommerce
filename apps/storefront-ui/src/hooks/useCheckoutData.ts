import { useEffect, useState } from 'react';
import { getAddresses, getLoyalty } from '../lib/checkout-api';

/**
 * Prefills checkout fields for authenticated customers: B2B profile, marketing
 * consent, saved addresses (default first), and loyalty balance.
 */
export function useCheckoutData(isAuthenticated: boolean, customer: any) {
  const [email, setEmail] = useState('');
  const [savedAddresses, setSavedAddresses] = useState<any[]>([]);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [addressError, setAddressError] = useState('');
  const [loyaltyBalance, setLoyaltyBalance] = useState(0);
  const [acceptsMarketing, setAcceptsMarketing] = useState(false);
  const [isB2B, setIsB2B] = useState(false);
  const [b2bCompany, setB2bCompany] = useState('');
  const [b2bVatId, setB2bVatId] = useState('');

  useEffect(() => {
    if (!isAuthenticated || !customer) return;
    let cancelled = false;

    setEmail(customer.email);

    if (customer.company_name) {
      setIsB2B(true);
      setB2bCompany(customer.company_name);
      setB2bVatId(customer.vat_tax_id || '');
    }
    if (customer.accepts_marketing) {
      setAcceptsMarketing(customer.accepts_marketing === 1);
    }

    (async () => {
      try {
        const data = await getAddresses();
        if (cancelled) return;
        if (!data) throw new Error('empty response');
        if (data.success && data.data.length > 0) {
          setSavedAddresses(data.data);
          const def = data.data.find((a: any) => a.is_default_shipping === 1) || data.data[0];
          setSelectedAddressId(def.id);
        }
      } catch (e) {
        if (cancelled) return;
        console.error('[Checkout] Address fetch failed:', e);
        setAddressError('Could not load saved addresses. Please enter your address below.');
      }

      try {
        const loyaltyData = await getLoyalty();
        if (!cancelled && loyaltyData?.success && loyaltyData.data) {
          setLoyaltyBalance(loyaltyData.data.balance);
        }
      } catch {
        if (!cancelled) setLoyaltyBalance(0);
      }
    })();

    return () => { cancelled = true; };
  }, [isAuthenticated, customer]);

  return {
    email, setEmail,
    savedAddresses, selectedAddressId, setSelectedAddressId,
    addressError, loyaltyBalance,
    acceptsMarketing, setAcceptsMarketing,
    isB2B, setIsB2B, b2bCompany, setB2bCompany, b2bVatId, setB2bVatId,
  };
}
