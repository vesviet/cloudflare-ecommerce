import React, { useEffect, useState } from 'react';
import { GlassCard } from '../ui/GlassCard';

interface ResetPasswordModalProps {
  target: { id: string; email: string };
  onClose: () => void;
  onSubmit: (newPassword: string) => Promise<void>;
}

export const ResetPasswordModal: React.FC<ResetPasswordModalProps> = ({ target, onClose, onSubmit }) => {
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [isResettingPassword, setIsResettingPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsResettingPassword(true);
    try {
      await onSubmit(resetPasswordValue);
    } finally {
      setIsResettingPassword(false);
    }
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" role="dialog" aria-modal="true" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <GlassCard className="w-full max-w-md p-6">
        <h2 className="text-xl font-bold mb-2">🔑 Reset Password</h2>
        <p className="text-sm text-text-muted mb-6">
          Resetting password for <strong className="text-text-main">{target.email}</strong>
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-text-muted mb-1">New Password <span className="text-danger-accent">*</span></label>
            <input
              type="password"
              className="w-full"
              placeholder="Min. 8 characters"
              value={resetPasswordValue}
              onChange={(e) => setResetPasswordValue(e.target.value)}
              minLength={8}
              required
              autoFocus
            />
            {resetPasswordValue.length > 0 && resetPasswordValue.length < 8 && (
              <span className="text-xs text-danger-accent mt-1 block">
                Password must be at least 8 characters
              </span>
            )}
          </div>
          <div className="flex gap-3 mt-8">
            <button
              type="button"
              className="flex-1 px-4 py-2 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 transition-colors"
              onClick={onClose}
              disabled={isResettingPassword}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 rounded-lg bg-danger-accent hover:bg-danger-accent/80 text-white font-medium transition-colors disabled:opacity-50 shadow-[0_0_15px_rgba(239,68,68,0.4)]"
              disabled={isResettingPassword || resetPasswordValue.length < 8}
            >
              {isResettingPassword ? 'Resetting…' : 'Confirm Reset'}
            </button>
          </div>
        </form>
      </GlassCard>
    </div>
  );
};
