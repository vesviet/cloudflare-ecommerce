import React from 'react';

const inputStyle: React.CSSProperties = {
  width: '100%', padding: '11px 14px', borderRadius: '8px',
  background: 'rgba(0,0,0,0.45)', color: 'white',
  border: '1px solid rgba(255,255,255,0.12)', outline: 'none',
  fontSize: '0.95rem', boxSizing: 'border-box',
};

const labelStyle: React.CSSProperties = {
  display: 'block', marginBottom: '7px',
  color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500,
};

interface ContactFormProps {
  email: string;
  onChangeEmail: (email: string) => void;
}

export const ContactForm: React.FC<ContactFormProps> = ({ email, onChangeEmail }) => {
  return (
    <>
      <h2 style={{ marginBottom: '20px', fontSize: '1.2rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
        <span style={{ width: '28px', height: '28px', background: 'var(--accent-color)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.8rem', fontWeight: 700 }}>1</span>
        Contact Information
      </h2>
      <div style={{ marginBottom: '28px' }}>
        <label style={labelStyle}>Email Address *</label>
        <input
          type="email" required value={email}
          onChange={e => onChangeEmail(e.target.value)}
          placeholder="your@email.com"
          style={inputStyle}
        />
      </div>
    </>
  );
};
