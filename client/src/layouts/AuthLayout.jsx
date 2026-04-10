import React from 'react';

export default function AuthLayout({ children }) {
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: '24px',
    }}>
      <div style={{ width: '100%', maxWidth: '420px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <span style={{ fontSize: '28px', fontWeight: '700', color: 'var(--primary)' }}>Taskara</span>
          <p style={{ color: 'var(--text-secondary)', marginTop: '4px', fontSize: '14px' }}>Your productivity workspace</p>
        </div>
        {children}
      </div>
    </div>
  );
}
