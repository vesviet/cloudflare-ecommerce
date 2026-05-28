import React, { useState } from 'react';
import './LoginScreen.css';

interface LoginScreenProps {
  onLogin: (email: string) => void;
  status: 'login' | 'forbidden';
}

export const LoginScreen: React.FC<LoginScreenProps> = ({ onLogin, status }) => {
  const [email, setEmail] = useState('');
  
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (email) {
      onLogin(email);
    }
  };

  return (
    <div className="login-container">
      {/* Dynamic Background Elements */}
      <div className="bg-shape shape-1"></div>
      <div className="bg-shape shape-2"></div>
      <div className="bg-shape shape-3"></div>

      <div className="login-glass-card">
        <div className="brand-logo">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />
          </svg>
        </div>
        
        {status === 'forbidden' ? (
          <div className="forbidden-content">
             <div className="icon-wrapper error">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0110 0v4" />
              </svg>
            </div>
            <h2>Access Denied</h2>
            <p>You do not have permission to access the admin dashboard or your session has expired.</p>
            <button className="btn-primary full-width" onClick={() => window.location.reload()}>Try Again</button>
          </div>
        ) : (
          <div className="login-content">
            <h2>Welcome Back</h2>
            <p>Sign in to your Aura admin account</p>
            
            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <label>Email Address</label>
                <input 
                  type="email" 
                  placeholder="admin@local.dev" 
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              
              <button type="submit" className="btn-primary full-width login-btn">
                <span>Continue</span>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </button>
            </form>
            
            <div className="login-footer">
              <p>In production, you will be redirected to Cloudflare Zero Trust.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
