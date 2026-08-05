import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { applyCoupon as apiApplyCoupon, syncCart as apiSyncCart } from '../lib/checkout-api'

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
  updatePrices: (updates: { id: string; price: number }[]) => void;
}

let syncTimer: ReturnType<typeof setTimeout> | null = null;

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => {
      const scheduleSync = () => {
        if (syncTimer) clearTimeout(syncTimer);
        syncTimer = setTimeout(() => { get().syncCart(); }, 500);
      };
      return {
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
        scheduleSync();
      },
      removeItem: (id) => {
        set((state) => ({
          items: state.items.filter(i => i.id !== id)
        }));
        scheduleSync();
      },
      updateQuantity: (id, quantity) => {
        set((state) => ({
          items: state.items.map(i => i.id === id ? { ...i, quantity } : i)
        }));
        scheduleSync();
      },
      clearCart: () => {
        set({ items: [], coupon: null });
        scheduleSync();
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
          const data = await apiApplyCoupon(code, subTotalCents);
          if (data.success && data.coupon) {
            set({ coupon: data.coupon });
            return { success: true };
          }
          return { success: false, error: data.error || 'Invalid coupon' };
        } catch (err: unknown) {
          return { success: false, error: (err as Error).message || 'Failed to apply coupon' };
        }
      },
      removeCoupon: () => set({ coupon: null }),
      syncCart: async () => {
        try {
          let guestSessionId = localStorage.getItem('guest_session_id');
          if (!guestSessionId) {
            guestSessionId = 'guest_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16);
            localStorage.setItem('guest_session_id', guestSessionId);
          }

          const items = get().items.map(i => ({
            productId: i.product_id,
            quantity: i.quantity
          }));

          await apiSyncCart(items, guestSessionId);
        } catch (e) {
          console.error('Failed to sync cart', e);
        }
      },
      updatePrices: (updates) => {
        set((state) => ({
          items: state.items.map(i => {
            const upd = updates.find(u => u.id === i.id);
            return upd ? { ...i, price: upd.price } : i;
          })
        }));
      }
    };
    },
    {
      name: 'aura-cart-storage',
    }
  )
)
