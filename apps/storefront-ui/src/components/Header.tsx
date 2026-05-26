"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShoppingBag, Search, User } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import CartDrawer from './CartDrawer';
import { useRouter } from 'next/navigation';

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const { items, toggleCart } = useCartStore();
  const { isAuthenticated } = useAuthStore();
  const router = useRouter();
  
  // Calculate total items
  const itemCount = items.reduce((total, item) => total + item.quantity, 0);
  
  // Handle scroll for sticky header styling
  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <header 
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 50,
          padding: '15px 30px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          transition: 'all 0.3s ease',
          background: isScrolled ? 'rgba(13, 17, 23, 0.8)' : 'transparent',
          backdropFilter: isScrolled ? 'blur(12px)' : 'none',
          WebkitBackdropFilter: isScrolled ? 'blur(12px)' : 'none',
          borderBottom: isScrolled ? '1px solid var(--glass-border)' : '1px solid transparent',
        }}
      >
        <Link href="/" style={{ textDecoration: 'none' }}>
          <div style={{ fontSize: '1.8rem', fontWeight: 800, letterSpacing: '-1px', color: '#fff' }}>
            AURA<span style={{ color: 'var(--accent-color)' }}>.</span>
          </div>
        </Link>
        
        <nav className="links" style={{ display: 'flex', gap: '30px', alignItems: 'center' }}>
          <Link href="/" style={{ fontWeight: 500 }}>Catalog</Link>
          <Link href="/about" style={{ fontWeight: 500, color: 'var(--text-muted)' }}>Story</Link>
          
          <div style={{ display: 'flex', gap: '20px', alignItems: 'center', marginLeft: '20px' }}>
            <button style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
              <Search size={20} />
            </button>
            <button 
              onClick={() => router.push(isAuthenticated ? '/dashboard' : '/my-account')}
              style={{ background: 'none', border: 'none', color: isAuthenticated ? 'var(--accent-color)' : '#fff', cursor: 'pointer' }}
              title={isAuthenticated ? 'My Dashboard' : 'Log In'}
            >
              <User size={20} />
            </button>
            <button 
              onClick={toggleCart}
              style={{ 
                background: 'none', 
                border: 'none', 
                color: '#fff', 
                cursor: 'pointer', 
                position: 'relative' 
              }}
            >
              <ShoppingBag size={20} />
              {itemCount > 0 && (
                <span 
                  style={{
                    position: 'absolute',
                    top: '-8px',
                    right: '-8px',
                    background: 'var(--accent-color)',
                    color: '#fff',
                    fontSize: '11px',
                    fontWeight: 'bold',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    boxShadow: '0 0 10px var(--accent-glow)'
                  }}
                >
                  {itemCount}
                </span>
              )}
            </button>
          </div>
        </nav>
      </header>
      <CartDrawer />
    </>
  );
}
