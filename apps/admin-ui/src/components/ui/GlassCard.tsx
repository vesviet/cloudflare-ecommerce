import React from 'react';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

/** Utility for Tailwind-like class merging if needed, though we use standard CSS */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  className?: string;
  glowColor?: 'primary' | 'secondary' | 'danger' | 'success' | 'none';
}

export const GlassCard: React.FC<GlassCardProps> = ({ 
  children, 
  className, 
  glowColor = 'none',
  style,
  ...props 
}) => {
  const glowStyle = glowColor !== 'none' ? {
    boxShadow: `0 0 20px var(--${glowColor}-glow), inset 0 0 10px rgba(255, 255, 255, 0.05)`
  } : {};

  return (
    <div 
      className={cn('glass-card', className)} 
      style={{ ...glowStyle, ...style }}
      {...props}
    >
      {children}
    </div>
  );
};
