"use client";

import React, { useMemo } from 'react';

interface ProductSwatchesProps {
  variations: any[];
  selectedVariationId: string;
  onSelectVariation: (id: string) => void;
}

export const ProductSwatches: React.FC<ProductSwatchesProps> = ({ variations, selectedVariationId, onSelectVariation }) => {
  // Aggregate unique attributes
  const { availableAttributes, attributeKeys } = useMemo(() => {
    const attrs: Record<string, Set<string>> = {};
    variations.forEach(v => {
      if (!v.attributes) return;
      Object.entries(v.attributes).forEach(([key, val]) => {
        if (!val) return;
        const strVal = String(val);
        if (!attrs[key]) attrs[key] = new Set();
        attrs[key].add(strVal);
      });
    });
    
    const result: Record<string, string[]> = {};
    Object.keys(attrs).forEach(k => {
      result[k] = Array.from(attrs[k]);
    });
    
    return { availableAttributes: result, attributeKeys: Object.keys(result) };
  }, [variations]);

  // Current selected attributes based on selectedVariationId
  const selectedVariation = variations.find(v => v.id === selectedVariationId);
  const currentSelections = selectedVariation?.attributes || {};

  const handleSelectAttribute = (key: string, value: string) => {
    // Determine the new selections
    const newSelections = { ...currentSelections, [key]: value };
    
    // Find a variation that matches the new selections
    // We prioritize exact matches, then partial matches
    let bestMatch = variations.find(v => {
      if (!v.attributes) return false;
      return Object.entries(newSelections).every(([k, val]) => v.attributes[k] === val);
    });

    if (!bestMatch) {
      // If no exact match (e.g. some combo is out of stock / doesn't exist),
      // just find the first variation that matches the newly clicked attribute
      bestMatch = variations.find(v => v.attributes && v.attributes[key] === value);
    }

    if (bestMatch) {
      onSelectVariation(bestMatch.id);
    }
  };

  if (attributeKeys.length === 0) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginBottom: '30px' }}>
      {attributeKeys.map(key => (
        <div key={key}>
          <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600, textTransform: 'capitalize' }}>
            {key}: <span style={{ fontWeight: 400, color: 'var(--text-muted)' }}>{currentSelections[key] || 'Select'}</span>
          </label>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {availableAttributes[key].map(val => {
              const isSelected = currentSelections[key] === val;
              return (
                <button
                  key={val}
                  onClick={() => handleSelectAttribute(key, val)}
                  style={{
                    padding: '8px 16px',
                    borderRadius: '8px',
                    border: isSelected ? '2px solid var(--accent-color)' : '1px solid var(--glass-border)',
                    background: isSelected ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.05)',
                    color: '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                >
                  {val}
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};
