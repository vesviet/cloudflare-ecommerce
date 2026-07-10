import React from 'react';
import { Image as ImageIcon } from 'lucide-react';

interface ImageFallbackProps {
  text?: string;
}

export default function ImageFallback({ text = 'Image not available' }: ImageFallbackProps) {
  return (
    <div 
      className="glass"
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        color: 'rgba(255, 255, 255, 0.4)',
        background: 'rgba(255, 255, 255, 0.03)',
        border: '1px dashed rgba(255, 255, 255, 0.1)',
        borderRadius: '8px',
        padding: '20px'
      }}
    >
      <ImageIcon size={48} strokeWidth={1} style={{ marginBottom: '12px', opacity: 0.5 }} />
      <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{text}</span>
    </div>
  );
}
