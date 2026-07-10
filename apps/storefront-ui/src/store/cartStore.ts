import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export interface CartItem {
  id: string; // variation_id or product_id
  name: string;
  price: number;
  quantity: number;
  image?: string;
  attributes?: Record<string, string>;
  product_id: string;
}

interface CartState {
  items: CartItem[];
  isCartOpen: boolean;
  coupon: { id: string; code: string; type: string; value: number } | null;
  addItem: (item: CartItem) => void;
  removeItem: (id: string) => void;
  updateQuantity: (id: string, quantity: number) => void;
  clearCart: () => void;
  toggleCart: () => void;
  getCartTotal: () => number;
  getCartSubtotal: () => number;
  getDiscountAmount: () => number;
  applyCoupon: (code: string) => Promise<{ success: boolean; error?: string }>;
  removeCoupon: () => void;
  syncCart: () => Promise<void>;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isCartOpen: false,
      coupon: null,
      addItem: (item) => {
        set((state) => {
          const existingItem = state.items.find(i => i.id === item.id);
          if (existingItem) {
            return {
              items: state.items.map(i => 
                i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i
              )
            }
          }
          return { items: [...state.items, item] }
        });
        get().syncCart();
      },
      removeItem: (id) => {
        set((state) => ({
          items: state.items.filter(i => i.id !== id)
        }));
        get().syncCart();
      },
      updateQuantity: (id, quantity) => {
        set((state) => ({
          items: state.items.map(i => i.id === id ? { ...i, quantity } : i)
        }));
        get().syncCart();
      },
      clearCart: () => {
        set({ items: [], coupon: null });
        get().syncCart();
      },
      toggleCart: () => set((state) => ({ isCartOpen: !state.isCartOpen })),
      getCartSubtotal: () => {
        return get().items.reduce((total, item) => total + (item.price * item.quantity), 0);
      },
      getDiscountAmount: () => {
        const coupon = get().coupon;
        if (!coupon) return 0;
        const subtotal = get().getCartSubtotal();
        if (coupon.type === 'percent') {
          return Math.floor(subtotal * (coupon.value / 100));
        } else if (coupon.type === 'fixed') {
          return coupon.value; // Assuming value is in cents
        }
        return 0; // freeship handled separately in checkout
      },
      getCartTotal: () => {
        const subtotal = get().getCartSubtotal();
        const discount = get().getDiscountAmount();
        return Math.max(0, subtotal - discount);
      },
      applyCoupon: async (code: string) => {
        try {
          const subTotalCents = get().getCartSubtotal();
          const res = await fetch(`${API_BASE}/api/cart/coupon`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cart_id: 'draft', coupon_code: code, subTotalCents }),
            credentials: 'include',
          });
          const data = await res.json();
          if (data.success && data.coupon) {
            set({ coupon: data.coupon });
            return { success: true };
          } else {
            return { success: false, error: data.error || 'Invalid coupon' };
          }
        } catch (err: any) {
          return { success: false, error: err.message || 'Failed to apply coupon' };
        }
      },
      removeCoupon: () => set({ coupon: null }),
      syncCart: async () => {
        try {
          // get guestSessionId from local storage or generate one
          let guestSessionId = localStorage.getItem('guest_session_id');
          if (!guestSessionId) {
            guestSessionId = 'guest_' + Math.random().toString(36).substring(2, 15);
            localStorage.setItem('guest_session_id', guestSessionId);
          }

          const items = get().items.map(i => ({
            productId: i.product_id,
            quantity: i.quantity
          }));

          await fetch(`${API_BASE}/api/cart/sync`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ items, guestSessionId }),
            credentials: 'include',
          });
        } catch (e) {
          console.error('Failed to sync cart', e);
        }
      }
    }),
    {
      name: 'aura-cart-storage',
    }
  )
)
