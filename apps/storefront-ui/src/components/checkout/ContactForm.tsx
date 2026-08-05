import React from 'react';
import { inputStyle, labelStyle } from '../../lib/styles';

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
