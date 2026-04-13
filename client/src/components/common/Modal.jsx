import React, { useEffect } from 'react';
import { CloseIcon } from './Icons';

/**
 * Modal — accessible dialog component.
 * Accepts both `isOpen` (preferred) and `open` for backwards-compat.
 */
export default function Modal({ isOpen, open, onClose, title, children, width = '500px' }) {
  const visible = isOpen ?? open ?? false;

  useEffect(() => {
    const h = e => e.key === 'Escape' && onClose?.();
    if (visible) {
      window.addEventListener('keydown', h);
      document.body.style.overflow = 'hidden';
    }
    return () => {
      window.removeEventListener('keydown', h);
      document.body.style.overflow = '';
    };
  }, [visible, onClose]);

  if (!visible) return null;

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)',
        zIndex: 500, display: 'flex', alignItems: 'center',
        justifyContent: 'center', padding: '16px',
      }}
    >
      <div
        onClick={e => e.stopPropagation()}
        style={{
          background: 'var(--surface)', borderRadius: '12px',
          width, maxWidth: '100%', maxHeight: '90vh',
          overflow: 'auto', boxShadow: 'var(--shadow-md)',
          border: '1px solid var(--border)',
        }}
      >
        {title && (
          <div style={{
            padding: '16px 20px', borderBottom: '1px solid var(--border)',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            position: 'sticky', top: 0, background: 'var(--surface)', zIndex: 1,
          }}>
            <h3 style={{ fontWeight: '600', fontSize: '16px', margin: 0 }}>{title}</h3>
            <button
              onClick={onClose}
              style={{
                background: 'none', border: 'none', color: 'var(--text-muted)',
                cursor: 'pointer', padding: '4px', borderRadius: 'var(--radius)',
                display: 'flex', alignItems: 'center',
              }}
              aria-label="Close modal"
            >
              <CloseIcon size="sm" />
            </button>
          </div>
        )}
        <div style={{ padding: '20px' }}>{children}</div>
      </div>
    </div>
  );
}
