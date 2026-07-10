"use client";

import React from 'react';
import { useCartStore } from '../store/cartStore';

interface AddToCartButtonProps {
  product: any;
  isVariable: boolean;
}

export default function AddToCartButton({ product, isVariable }: AddToCartButtonProps) {
  const { addItem, toggleCart } = useCartStore();

  const handleAddToCart = () => {
    if (isVariable) {
      const variation = product.variations?.[0];
      if (!variation) return;
      addItem({
        id: variation.id,
        product_id: product.id,
        name: product.name ?? product.title,
        price: parseInt(String(variation.sale_price ?? variation.regular_price), 10),
        quantity: 1,
        image: product.images?.[0]?.url || '',
      });
    } else {
      // Simple product
      addItem({
        id: product.id,
        product_id: product.id,
        name: product.name ?? product.title,
        price: parseInt(String(product.prices?.sale_price ?? product.prices?.regular_price), 10),
        quantity: 1,
        image: product.images?.[0]?.url || '',
      });
    }
    toggleCart();
  };

  const inStock = isVariable 
    ? product.variations?.some((v: any) => v.stock_quantity > 0) 
    : product.stock_quantity > 0;

  return (
    <button className="btn" disabled={!inStock} onClick={handleAddToCart}>
      {inStock ? 'Add to Cart' : 'Out of Stock'}
    </button>
  );
}
