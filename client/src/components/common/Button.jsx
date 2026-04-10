import React from 'react';
const variants = {
  primary: { background: 'var(--primary)', color: '#fff', border: 'none' },
  secondary: { background: 'var(--surface-alt)', color: 'var(--text-primary)', border: '1px solid var(--border)' },
  ghost: { background: 'transparent', color: 'var(--text-secondary)', border: 'none' },
  danger: { background: 'var(--error)', color: '#fff', border: 'none' },
};
export default function Button({ children, variant = 'primary', size = 'md', onClick, disabled, type = 'button', style = {} }) {
  const sz = size === 'sm' ? { padding: '5px 10px', fontSize: '13px' } : size === 'lg' ? { padding: '12px 24px', fontSize: '16px' } : { padding: '8px 16px', fontSize: '14px' };
  return (
    <button type={type} onClick={onClick} disabled={disabled} style={{
      ...variants[variant], ...sz, borderRadius: 'var(--radius)', fontWeight: '500', cursor: disabled ? 'not-allowed' : 'pointer',
      opacity: disabled ? 0.6 : 1, transition: 'opacity 0.1s, background 0.1s', ...style,
    }}
    onMouseEnter={e => !disabled && variant === 'primary' && (e.currentTarget.style.background = 'var(--primary-hover)')}
    onMouseLeave={e => !disabled && variant === 'primary' && (e.currentTarget.style.background = 'var(--primary)')}>
      {children}
    </button>
  );
}
