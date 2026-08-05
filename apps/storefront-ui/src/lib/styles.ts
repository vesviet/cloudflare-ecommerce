import type { CSSProperties } from 'react';

/** Shared checkout form primitives — replaces 4 duplicated copies. */
export const inputStyle: CSSProperties = {
  width: '100%', padding: '11px 14px', borderRadius: '8px',
  background: 'rgba(0,0,0,0.45)', color: 'white',
  border: '1px solid rgba(255,255,255,0.12)', outline: 'none',
  fontSize: '0.95rem', boxSizing: 'border-box',
};

export const labelStyle: CSSProperties = {
  display: 'block', marginBottom: '7px',
  color: 'var(--text-muted)', fontSize: '0.85rem', fontWeight: 500,
};

export const statRowStyle: CSSProperties = {
  display: 'flex', justifyContent: 'space-between',
  color: 'var(--text-muted)', fontSize: '0.9rem',
};

export const alertWarnStyle: CSSProperties = {
  padding: '10px 14px', background: 'rgba(251,191,36,0.08)',
  border: '1px solid rgba(251,191,36,0.3)', borderRadius: '8px',
  marginBottom: '20px', color: '#fbbf24', fontSize: '0.85rem',
  display: 'flex', alignItems: 'center', gap: '8px',
};

export const alertErrorStyle: CSSProperties = {
  padding: '12px 16px', background: 'rgba(248,113,113,0.1)',
  color: '#f87171', borderRadius: '8px', marginBottom: '20px',
  border: '1px solid rgba(248,113,113,0.25)', fontSize: '0.9rem',
};
