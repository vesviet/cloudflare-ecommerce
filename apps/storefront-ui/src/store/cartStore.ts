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
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      isCartOpen: false,
      coupon: null,
      addItem: (item) => set((state) => {
        const existingItem = state.items.find(i => i.id === item.id);
        if (existingItem) {
          return {
            items: state.items.map(i => 
              i.id === item.id ? { ...i, quantity: i.quantity + item.quantity } : i
            )
          }
        }
        return { items: [...state.items, item] }
      }),
      removeItem: (id) => set((state) => ({
        items: state.items.filter(i => i.id !== id)
      })),
      updateQuantity: (id, quantity) => set((state) => ({
        items: state.items.map(i => i.id === id ? { ...i, quantity } : i)
      })),
      clearCart: () => set({ items: [], coupon: null }),
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
          const res = await fetch(`${API_BASE}/api/cart/coupon`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cart_id: 'draft', coupon_code: code }),
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
      removeCoupon: () => set({ coupon: null })
    }),
    {
      name: 'aura-cart-storage',
    }
  )
)
