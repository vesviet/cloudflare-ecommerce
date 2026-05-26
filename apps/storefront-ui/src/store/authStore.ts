import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface Customer {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  phone?: string;
}

interface AuthState {
  isAuthenticated: boolean;
  customer: Customer | null;
  setAuth: (customer: Customer) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      isAuthenticated: false,
      customer: null,
      setAuth: (customer) => set({ isAuthenticated: true, customer }),
      clearAuth: () => set({ isAuthenticated: false, customer: null }),
    }),
    {
      name: 'aura-auth-storage',
    }
  )
);
