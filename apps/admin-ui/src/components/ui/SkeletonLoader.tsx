import React from 'react';
import { motion } from 'framer-motion';
import { cn } from './GlassCard';

interface SkeletonLoaderProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  borderRadius?: string | number;
}

export const SkeletonLoader: React.FC<SkeletonLoaderProps> = ({ 
  className, 
  width = '100%', 
  height = '20px', 
  borderRadius = '8px' 
}) => {
  return (
    <motion.div
      className={cn('skeleton-loader', className)}
      style={{
        width,
        height,
        borderRadius,
        background: 'linear-gradient(90deg, rgba(255, 255, 255, 0.03) 25%, rgba(255, 255, 255, 0.08) 50%, rgba(255, 255, 255, 0.03) 75%)',
        backgroundSize: '200% 100%'
      }}
      animate={{ backgroundPosition: ['200% 0', '-200% 0'] }}
      transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
    />
  );
};
