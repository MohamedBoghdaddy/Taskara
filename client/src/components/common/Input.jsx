import React from 'react';
export default function Input({ label, error, ...props }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
      {label && <label style={{ fontSize: '13px', fontWeight: '500', color: 'var(--text-secondary)' }}>{label}</label>}
      <input {...props} style={{
        padding: '8px 12px', border: `1px solid ${error ? 'var(--error)' : 'var(--border)'}`, borderRadius: 'var(--radius)',
        background: 'var(--surface)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none', width: '100%',
        ...props.style,
      }}
      onFocus={e => e.currentTarget.style.borderColor = 'var(--primary)'}
      onBlur={e => e.currentTarget.style.borderColor = error ? 'var(--error)' : 'var(--border)'}
      />
      {error && <span style={{ fontSize: '12px', color: 'var(--error)' }}>{error}</span>}
    </div>
  );
}
