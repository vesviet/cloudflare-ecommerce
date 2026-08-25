import React, { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL || 'https://api-shop.tanhdev.com'}/api`;

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px', borderRadius: '8px',
  background: 'rgba(0,0,0,0.45)', color: 'white',
  border: '1px solid rgba(255,255,255,0.12)', outline: 'none',
  fontSize: '0.95rem', boxSizing: 'border-box'
};

const labelStyle: React.CSSProperties = {
  display: 'block', marginBottom: '7px',
  color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500
};

export default function ChangePasswordForm() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const getPasswordStrength = (pass: string) => {
    if (!pass) return null;
    if (pass.length < 8) return { label: 'Yếu', color: '#ff5858' };
    const hasLetters = /[a-zA-Z]/.test(pass);
    const hasNumbers = /[0-9]/.test(pass);
    const hasSpecial = /[^a-zA-Z0-9]/.test(pass);
    if (hasLetters && (hasNumbers || hasSpecial)) return { label: 'Mạnh', color: '#4ade80' };
    return { label: 'Trung bình', color: '#facc15' };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (newPassword.length < 8) { setMsg({ type: 'err', text: 'Mật khẩu mới phải từ 8 ký tự trở lên.' }); return; }
    if (newPassword !== confirmPassword) { setMsg({ type: 'err', text: 'Mật khẩu xác nhận không khớp.' }); return; }
    if (currentPassword === newPassword) { setMsg({ type: 'err', text: 'Mật khẩu mới không được trùng với mật khẩu cũ.' }); return; }

    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/customer/me/change-password`, {
        method: 'PUT', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }),
      });
      const data = await res.json();
      if (data.success) {
        setMsg({ type: 'ok', text: 'Đổi mật khẩu thành công! Đang đăng xuất...' });
        setCurrentPassword(''); setNewPassword(''); setConfirmPassword('');
        // Password change revokes all existing sessions server-side — sign out
        // locally and send the user back to the login screen.
        await fetch(`${API_BASE}/auth/logout`, { method: 'POST', credentials: 'include' }).catch(() => {});
        setTimeout(() => { window.location.href = '/my-account'; }, 800);
      } else {
        setMsg({ type: 'err', text: data.error || 'Thay đổi mật khẩu thất bại.' });
      }
    } catch {
      setMsg({ type: 'err', text: 'Lỗi mạng. Vui lòng thử lại.' });
    }
    setLoading(false);
  };

  return (
    <div style={{ marginTop: '40px', padding: '30px', background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: '12px' }}>
      <h3 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: '0 0 8px 0', fontSize: '1.25rem', color: 'var(--text-main)' }}>
        🔑 Security & Password
      </h3>
      <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '24px' }}>
        Update your account security credentials.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <label style={labelStyle}>Current Password *</label>
          <div style={{ position: 'relative' }}>
            <input type={showCurrent ? "text" : "password"} required value={currentPassword} onChange={e => setCurrentPassword(e.target.value)} style={{ ...inputStyle, paddingRight: '45px' }} />
            <button type="button" onClick={() => setShowCurrent(!showCurrent)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div>
          <label style={labelStyle}>New Password *</label>
          <div style={{ position: 'relative' }}>
            <input type={showNew ? "text" : "password"} required minLength={8} value={newPassword} onChange={e => setNewPassword(e.target.value)} style={{ ...inputStyle, paddingRight: '45px' }} />
            <button type="button" onClick={() => setShowNew(!showNew)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {newPassword && (() => {
            const strength = getPasswordStrength(newPassword);
            return strength ? (
              <p style={{ margin: '6px 0 0 0', fontSize: '0.8rem', color: strength.color, display: 'flex', alignItems: 'center', gap: '5px' }}>
                Độ mạnh mật khẩu: <strong>{strength.label}</strong>
              </p>
            ) : null;
          })()}
        </div>

        <div>
          <label style={labelStyle}>Confirm New Password *</label>
          <div style={{ position: 'relative' }}>
            <input type={showConfirm ? "text" : "password"} required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} style={{ ...inputStyle, paddingRight: '45px' }} />
            <button type="button" onClick={() => setShowConfirm(!showConfirm)} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
              {showConfirm ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {newPassword && confirmPassword && newPassword !== confirmPassword && (
            <p style={{ margin: '6px 0 0 0', fontSize: '0.8rem', color: '#ff5858' }}>Mật khẩu xác nhận không khớp.</p>
          )}
        </div>

        {msg && (
          <div style={{ padding: '12px 16px', borderRadius: '8px', background: msg.type === 'ok' ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)', border: `1px solid ${msg.type === 'ok' ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`, color: msg.type === 'ok' ? '#4ade80' : '#f87171', fontSize: '0.9rem' }}>
            {msg.type === 'ok' ? '✓' : '✕'} {msg.text}
          </div>
        )}

        <button className="btn" type="submit" disabled={loading || (newPassword !== confirmPassword) || newPassword.length < 8} style={{ width: 'fit-content', padding: '12px 30px' }}>
          {loading ? 'Updating...' : 'Change Password'}
        </button>
      </form>
    </div>
  );
}
