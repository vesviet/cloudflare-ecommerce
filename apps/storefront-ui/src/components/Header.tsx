"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShoppingBag, Search, User } from 'lucide-react';
import { useCartStore } from '../store/cartStore';
import { useAuthStore } from '../store/authStore';
import CartDrawer from './CartDrawer';
import { useRouter } from 'next/navigation';

interface Category {
  id: string;
  name: string;
  slug: string;
  parent_id: string | null;
  children?: Category[];
}

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showCategories, setShowCategories] = useState(false);
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

  const apiBase = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8787';

  useEffect(() => {
    fetch(`${apiBase}/api/categories`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setCategories(data.data || []);
        }
      })
      .catch(err => console.error('Failed to fetch categories', err));
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
          
          <div 
            style={{ position: 'relative' }} 
            onMouseEnter={() => setShowCategories(true)} 
            onMouseLeave={() => setShowCategories(false)}
          >
            <span style={{ fontWeight: 500, cursor: 'pointer' }}>Categories ▾</span>
            {showCategories && categories.length > 0 && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: '-20px',
                background: 'rgba(20, 20, 30, 0.95)',
                backdropFilter: 'blur(10px)',
                border: '1px solid var(--glass-border)',
                borderRadius: '8px',
                padding: '10px 0',
                minWidth: '200px',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
                zIndex: 100
              }}>
                {categories.map(cat => (
                  <Link 
                    key={cat.id} 
                    href={`/category/${cat.slug}`}
                    style={{ padding: '8px 20px', display: 'block', fontSize: '0.9rem', color: '#fff', textDecoration: 'none' }}
                  >
                    {cat.name}
                  </Link>
                ))}
              </div>
            )}
          </div>

          <Link href="/about" style={{ fontWeight: 500, color: 'var(--text-muted)' }}>Story</Link>
          <Link href="/blog" style={{ fontWeight: 500, color: 'var(--text-muted)' }}>Blog</Link>
          <Link href="/events" style={{ fontWeight: 500, color: 'var(--text-muted)' }}>Events</Link>
          
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
