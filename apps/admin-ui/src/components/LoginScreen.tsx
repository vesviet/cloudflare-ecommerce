import React, { useState } from 'react';
import { GlassCard } from './ui/GlassCard';
import { Sparkles, ArrowRight, ShieldAlert } from 'lucide-react';
import { motion } from 'framer-motion';

interface LoginScreenProps {
  onLogin: (email: string) => void;
  status: 'login' | 'forbidden';
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, status }) => {
  const [email, setEmail] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      onLogin(email);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background blurs specifically for the login screen */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary-accent/20 rounded-full blur-[120px] -z-10 pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary-accent/20 rounded-full blur-[120px] -z-10 pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md"
      >
        <GlassCard className="p-8 sm:p-10 w-full" glowColor={status === 'forbidden' ? 'danger' : 'primary'}>
          <div className="flex flex-col items-center mb-8">
            <motion.div 
              initial={{ rotate: -15, scale: 0.8 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ type: "spring", stiffness: 200, damping: 15, delay: 0.2 }}
              className="w-14 h-14 rounded-2xl bg-gradient-to-br from-white/10 to-white/5 flex items-center justify-center mb-6 border border-white/20 shadow-[0_0_30px_var(--primary-glow)] backdrop-blur-xl"
            >
              <Sparkles className="w-7 h-7 text-white" />
            </motion.div>
            
            {status !== 'forbidden' && (
              <div className="text-center space-y-2">
                <p className="text-primary-accent text-sm font-semibold tracking-widest uppercase mb-1">Aura Admin</p>
                <h2 className="text-3xl font-bold tracking-tight text-white m-0" style={{ fontFamily: 'var(--header-font)' }}>
                  Developer Login
                </h2>
                <p className="text-text-muted text-sm mt-2 max-w-[280px] mx-auto leading-relaxed">
                  Enter a local mock email to bypass Zero Trust authentication locally.
                </p>
              </div>
            )}
          </div>
          
          {status === 'forbidden' ? (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center text-center"
            >
               <div className="w-16 h-16 rounded-full bg-danger-glow/20 flex items-center justify-center mb-5 border border-danger-accent/30 shadow-[0_0_20px_var(--danger-glow)]">
                 <ShieldAlert className="w-8 h-8 text-danger-accent" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-3">Access Denied</h2>
              <p className="text-text-muted mb-8 leading-relaxed">
                The email you entered does not exist in the local <code className="bg-white/10 px-1.5 py-0.5 rounded text-danger-accent">admin_users</code> table.
              </p>
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-medium transition-all text-white bg-white/10 hover:bg-white/20 border border-white/10"
                onClick={() => window.location.reload()}
              >
                Try Different Email
              </motion.button>
            </motion.div>
          ) : (
            <motion.form 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              onSubmit={handleSubmit} 
              className="flex flex-col gap-6"
            >
              <div className="flex flex-col gap-2 relative">
                <label className="text-sm font-medium text-text-muted ml-1 transition-colors duration-200" style={{ color: isFocused ? 'var(--text-main)' : 'var(--text-muted)' }}>
                  Email Address
                </label>
                <input 
                  type="email" 
                  placeholder="admin@local.dev" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  className="w-full bg-black/20 border border-white/10 focus:border-primary-accent/50 focus:ring-4 focus:ring-primary-glow/20 rounded-xl px-4 py-3.5 text-white placeholder-white/30 transition-all duration-300 outline-none backdrop-blur-sm"
                  required
                />
              </div>
              
              <motion.button 
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                type="submit" 
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-medium text-white bg-gradient-to-r from-primary-accent to-secondary-accent hover:from-primary-accent hover:to-primary-accent shadow-[0_0_20px_var(--primary-glow)] transition-all duration-300 border border-white/10 group overflow-hidden relative"
              >
                <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                <span className="relative z-10">Continue Local Session</span>
                <ArrowRight className="w-4 h-4 relative z-10 group-hover:translate-x-1 transition-transform" />
              </motion.button>
              
              <div className="mt-4 text-center">
                <p className="text-xs text-text-muted/70 leading-relaxed max-w-[260px] mx-auto">
                  In production, this screen is automatically bypassed and Cloudflare Access takes over.
                </p>
              </div>
            </motion.form>
          )}
        </GlassCard>
      </motion.div>
    </div>
  );
};
