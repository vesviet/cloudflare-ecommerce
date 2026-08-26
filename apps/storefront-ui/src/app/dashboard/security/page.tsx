"use client";

import React, { useEffect, useState } from 'react';

const API_BASE = `${process.env.NEXT_PUBLIC_API_URL || 'https://api-shop.tanhdev.com'}/api`;

export default function SecurityPrivacyPage() {
  // Referral
  const [referral, setReferral] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  // Notification prefs
  const [prefs, setPrefs] = useState({ email_marketing: false, order_updates: true, security_alerts: true });
  const [prefsSaved, setPrefsSaved] = useState('');

  // 2FA
  const [twofaEnabled, setTwofaEnabled] = useState(false);
  const [setupSecret, setSetupSecret] = useState<{ secret: string; otpauth_url: string } | null>(null);
  const [verifyCode, setVerifyCode] = useState('');
  const [recoveryCodes, setRecoveryCodes] = useState<string[] | null>(null);
  const [disablePassword, setDisablePassword] = useState('');
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // GDPR
  const [deletePassword, setDeletePassword] = useState('');
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  useEffect(() => {
    fetch(`${API_BASE}/customer/me`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => {
        if (d?.success && d.data) {
          setTwofaEnabled(Boolean(d.data.two_factor_enabled));
          if (d.data.notification_preferences) setPrefs(d.data.notification_preferences);
        }
      })
      .catch(() => {});
    fetch(`${API_BASE}/customer/referrals`, { credentials: 'include' })
      .then((r) => r.json())
      .then((d) => { if (d?.success) setReferral(d.data); })
      .catch(() => {});
  }, []);

  const flash = (type: 'ok' | 'err', text: string) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 5000);
  };

  const savePrefs = async () => {
    const res = await fetch(`${API_BASE}/customer/me/notification-preferences`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      credentials: 'include', body: JSON.stringify(prefs),
    });
    const d = await res.json();
    flash(d.success ? 'ok' : 'err', d.success ? 'Đã lưu tuỳ chọn thông báo.' : (d.error || 'Lỗi'));
  };

  const exportData = async () => {
    try {
      const res = await fetch(`${API_BASE}/customer/privacy/export`, { credentials: 'include' });
      const blob = new Blob([JSON.stringify(await res.json(), null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `aura-data-export-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      flash('ok', 'Đã tải dữ liệu của bạn.');
    } catch {
      flash('err', 'Không thể xuất dữ liệu.');
    }
  };

  const deleteAccount = async () => {
    if (!window.confirm('Xoá tài khoản vĩnh viễn? Dữ liệu cá nhân sẽ được ẩn danh hoá và không thể hoàn tác.')) return;
    const res = await fetch(`${API_BASE}/customer/me`, {
      method: 'DELETE', headers: { 'Content-Type': 'application/json' },
      credentials: 'include', body: JSON.stringify({ password: deletePassword }),
    });
    const d = await res.json();
    if (d.success) {
      window.location.href = '/my-account';
    } else {
      flash('err', d.error || 'Xoá tài khoản thất bại.');
    }
  };

  const start2fa = async () => {
    const res = await fetch(`${API_BASE}/customer/2fa/setup`, { method: 'POST', credentials: 'include' });
    const d = await res.json();
    if (d.success) setSetupSecret(d.data);
    else flash('err', d.error || 'Không thể bắt đầu thiết lập 2FA.');
  };

  const confirm2fa = async () => {
    const res = await fetch(`${API_BASE}/customer/2fa/enable`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      credentials: 'include', body: JSON.stringify({ code: verifyCode.trim() }),
    });
    const d = await res.json();
    if (d.success) {
      setTwofaEnabled(true);
      setSetupSecret(null);
      setRecoveryCodes(d.data.recovery_codes || []);
      setVerifyCode('');
      flash('ok', 'Đã bật 2FA. Hãy lưu các mã khôi phục!');
    } else {
      flash('err', d.error || 'Mã không đúng.');
    }
  };

  const disable2fa = async () => {
    const res = await fetch(`${API_BASE}/customer/2fa/disable`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      credentials: 'include', body: JSON.stringify({ password: disablePassword }),
    });
    const d = await res.json();
    if (d.success) {
      setTwofaEnabled(false);
      setDisablePassword('');
      flash('ok', 'Đã tắt 2FA.');
    } else {
      flash('err', d.error || 'Không thể tắt 2FA.');
    }
  };

  const sectionStyle = { padding: '20px', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '12px', marginBottom: '18px' } as const;

  return (
    <div>
      <h2 style={{ color: 'var(--text-main)', marginTop: 0 }}>Security & Privacy</h2>

      {msg && (
        <div style={{
          marginBottom: '16px', padding: '10px 14px', borderRadius: '8px', fontSize: '0.9rem',
          background: msg.type === 'ok' ? 'rgba(74,222,128,0.1)' : 'rgba(248,113,113,0.1)',
          border: `1px solid ${msg.type === 'ok' ? 'rgba(74,222,128,0.3)' : 'rgba(248,113,113,0.3)'}`,
          color: msg.type === 'ok' ? '#4ade80' : '#f87171',
        }}>
          {msg.text}
        </div>
      )}

      {/* Referral */}
      <div style={sectionStyle}>
        <h3 style={{ marginTop: 0 }}>🎁 Giới thiệu bạn bè</h3>
        {referral ? (
          <>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Chia sẻ mã của bạn — cả hai nhận ưu đãi khi người được mời hoàn tất đơn đầu tiên (+50.000 điểm cho bạn).</p>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <code style={{ fontFamily: 'monospace', fontSize: '1.05rem', background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.3)', padding: '8px 16px', borderRadius: '8px', color: 'var(--text-main)' }}>
                {referral.referral_code}
              </code>
              <button className="btn" style={{ padding: '8px 14px' }} onClick={() => {
                navigator.clipboard?.writeText(referral.referral_code);
                setCopied(true);
                setTimeout(() => setCopied(false), 2000);
              }}>{copied ? '✓ Đã copy' : 'Copy mã'}</button>
            </div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: 0 }}>
              Đã mời: <strong style={{ color: 'var(--text-main)' }}>{referral.invited_count}</strong> · Điểm nhận được: <strong style={{ color: 'var(--text-main)' }}>{Number(referral.earned_points).toLocaleString('vi-VN')}</strong>
            </p>
          </>
        ) : <p className="opacity-60">Đang tải...</p>}
      </div>

      {/* 2FA */}
      <div style={sectionStyle}>
        <h3>{twofaEnabled ? '🛡️ Xác thực 2 yếu tố — ĐANG BẬT' : '🛡️ Xác thực 2 yếu tố'}</h3>
        {twofaEnabled ? (
          <>
            {recoveryCodes && (
              <div style={{ background: 'rgba(250,204,21,0.08)', border: '1px solid rgba(250,204,21,0.3)', borderRadius: '8px', padding: '12px', marginBottom: '12px' }}>
                <p style={{ margin: '0 0 8px 0', fontWeight: 600 }}>Mã khôi phục (lưu ngay, chỉ dùng 1 lần):</p>
                <code style={{ display: 'block', fontSize: '0.85rem', lineHeight: 1.7 }}>{recoveryCodes.join('  ')}</code>
                <button className="btn" style={{ marginTop: '8px', padding: '6px 12px' }} onClick={() => { navigator.clipboard?.writeText(recoveryCodes.join('\n')); flash('ok', 'Đã copy mã khôi phục.'); }}>Copy tất cả</button>
              </div>
            )}
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input type="password" placeholder="Xác nhận mật khẩu để tắt 2FA" value={disablePassword} onChange={(e) => setDisablePassword(e.target.value)}
                style={{ flex: 1, minWidth: '220px', padding: '10px 12px', borderRadius: '8px', background: 'rgba(0,0,0,0.4)', color: 'white', border: '1px solid rgba(255,255,255,0.12)' }} />
              <button className="btn" onClick={disable2fa} disabled={!disablePassword} style={{ background: 'transparent', border: '1px solid rgba(248,113,113,0.4)', color: '#f87171' }}>Tắt 2FA</button>
            </div>
          </>
        ) : setupSecret ? (
          <>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>Thêm khoá này vào app authenticator (Google Authenticator / Authy):</p>
            <code style={{ display: 'block', fontFamily: 'monospace', background: 'rgba(0,0,0,0.4)', padding: '10px', borderRadius: '8px', wordBreak: 'break-all', marginBottom: '10px' }}>{setupSecret.secret}</code>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', wordBreak: 'break-all' }}>{setupSecret.otpauth_url}</p>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
              <input placeholder="Nhập mã 6 số" value={verifyCode} onChange={(e) => setVerifyCode(e.target.value)} maxLength={6}
                style={{ width: '160px', padding: '10px 12px', borderRadius: '8px', background: 'rgba(0,0,0,0.4)', color: 'white', border: '1px solid rgba(255,255,255,0.12)', fontFamily: 'monospace' }} />
              <button className="btn btn-primary" onClick={confirm2fa} disabled={verifyCode.length !== 6}>Xác nhận & bật</button>
            </div>
          </>
        ) : (
          <button className="btn" onClick={start2fa}>Bật bảo mật 2 lớp (TOTP)</button>
        )}
      </div>

      {/* Notification preferences */}
      <div style={sectionStyle}>
        <h3>🔔 Tuỳ chọn thông báo</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
          {([
            ['email_marketing', 'Email khuyến mãi & newsletter'],
            ['order_updates', 'Cập nhật đơn hàng'],
          ] as const).map(([key, label]) => (
            <label key={key} style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
              <input type="checkbox" checked={prefs[key]} onChange={(e) => setPrefs({ ...prefs, [key]: e.target.checked })} />
              <span style={{ color: 'var(--text-muted)', fontSize: '0.92rem' }}>{label}</span>
            </label>
          ))}
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input type="checkbox" checked disabled />
            <span style={{ color: 'var(--text-muted)', fontSize: '0.92rem', opacity: 0.7 }}>Cảnh báo bảo mật (luôn bật)</span>
          </label>
        </div>
        <button className="btn" onClick={savePrefs} style={{ padding: '8px 16px' }}>Lưu tuỳ chọn</button>
      </div>

      {/* GDPR */}
      <div style={{ ...sectionStyle, borderColor: 'rgba(248,113,113,0.2)' }}>
        <h3 style={{ color: '#fca5a5' }}>Quyền riêng tư (GDPR)</h3>
        <button className="btn" onClick={exportData} style={{ padding: '10px 16px', marginRight: '12px' }}>
          ⬇ Tải dữ liệu của tôi (JSON)
        </button>
        {!confirmingDelete ? (
          <button className="btn" onClick={() => setConfirmingDelete(true)} style={{ background: 'transparent', border: '1px solid rgba(248,113,113,0.4)', color: '#f87171', padding: '10px 16px' }}>
            Xoá tài khoản
          </button>
        ) : (
          <div style={{ display: 'inline-flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            <input type="password" placeholder="Xác nhận mật khẩu" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)}
              style={{ padding: '10px 12px', borderRadius: '8px', background: 'rgba(0,0,0,0.4)', color: 'white', border: '1px solid rgba(248,113,113,0.3)' }} />
            <button className="btn" onClick={deleteAccount} disabled={!deletePassword} style={{ background: '#ef4444', color: 'white' }}>Xác nhận xoá vĩnh viễn</button>
            <button className="btn" onClick={() => setConfirmingDelete(false)}>Huỷ</button>
          </div>
        )}
        <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '10px', marginBottom: 0 }}>
          Xoá tài khoản sẽ ẩn danh hoá toàn bộ dữ liệu cá nhân theo GDPR Article 17.
        </p>
      </div>
    </div>
  );
}
