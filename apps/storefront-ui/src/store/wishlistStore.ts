import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useAuthStore } from './authStore';

export interface WishlistItem {
  productId: string;
  name?: string;
  price?: number;
  imageUrl?: string;
  slug?: string;
}

interface WishlistState {
  items: WishlistItem[];
  addItem: (item: WishlistItem) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  isInWishlist: (productId: string) => boolean;
  syncWithServer: () => Promise<void>;
  fetchFromServer: () => Promise<void>;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],

      isInWishlist: (productId) => {
        return get().items.some((item) => item.productId === productId);
      },

      addItem: async (item) => {
        const { isAuthenticated } = useAuthStore.getState();
        const { items, isInWishlist } = get();

        if (isInWishlist(item.productId)) return;

        // Optimistic update
        set({ items: [...items, item] });

        if (isAuthenticated) {
          try {
            const res = await fetch('/api/customer/wishlist', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ productId: item.productId }),
            });
            if (!res.ok) {
              // Revert on failure
              set({ items: get().items.filter(i => i.productId !== item.productId) });
            }
          } catch (error) {
            set({ items: get().items.filter(i => i.productId !== item.productId) });
          }
        }
      },

      removeItem: async (productId) => {
        const { isAuthenticated } = useAuthStore.getState();
        const { items } = get();
        const removedItem = items.find((i) => i.productId === productId);

        // Optimistic update
        set({ items: items.filter((item) => item.productId !== productId) });

        if (isAuthenticated && removedItem) {
          try {
            const res = await fetch(`/api/customer/wishlist/${productId}`, {
              method: 'DELETE',
            });
            if (!res.ok) {
              // Revert
              set({ items: [...get().items, removedItem] });
            }
          } catch (error) {
            set({ items: [...get().items, removedItem] });
          }
        }
      },

      syncWithServer: async () => {
        const { items } = get();
        const productIds = items.map((i) => i.productId);
        
        if (productIds.length > 0) {
          try {
            await fetch('/api/customer/wishlist/merge', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ productIds }),
            });
          } catch (e) {
            console.error('Failed to sync wishlist with server', e);
          }
        }
        
        // Fetch the unified list
        await get().fetchFromServer();
      },

      fetchFromServer: async () => {
        try {
          const res = await fetch('/api/customer/wishlist');
          if (res.ok) {
            const json = await res.json();
            if (json.success && json.data) {
              const serverItems: WishlistItem[] = json.data.map((i: any) => ({
                productId: i.product_id,
                name: i.product?.name,
                slug: i.product?.slug,
                price: i.product?.prices?.price,
                imageUrl: i.product?.images?.[0]?.url,
              }));
              set({ items: serverItems });
            }
          }
        } catch (e) {
          console.error('Failed to fetch wishlist from server', e);
        }
      },
    }),
    {
      name: 'aura-wishlist-storage',
    }
  )
);
