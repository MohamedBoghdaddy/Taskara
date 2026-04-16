/**
 * Tooltip — lightweight hover tooltip using CSS positioning.
 * No external dependency. Wraps any children.
 *
 * Usage:
 *   <Tooltip content="Create a new task" placement="top">
 *     <button>+</button>
 *   </Tooltip>
 */
import React, { useState, useRef } from 'react';

export default function Tooltip({ content, placement = 'top', delay = 400, children, disabled = false }) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef(null);

  if (disabled || !content) return children;

  const show = () => { timerRef.current = setTimeout(() => setVisible(true), delay); };
  const hide = () => { clearTimeout(timerRef.current); setVisible(false); };

  const positions = {
    top:    { bottom: 'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)' },
    bottom: { top:    'calc(100% + 6px)', left: '50%', transform: 'translateX(-50%)' },
    left:   { right:  'calc(100% + 6px)', top: '50%',  transform: 'translateY(-50%)' },
    right:  { left:   'calc(100% + 6px)', top: '50%',  transform: 'translateY(-50%)' },
  };

  return (
    <span
      style={{ position: 'relative', display: 'inline-flex' }}
      onMouseEnter={show}
      onMouseLeave={hide}
      onFocus={show}
      onBlur={hide}
    >
      {children}
      {visible && (
        <span style={{
          position: 'absolute',
          ...positions[placement],
          background: 'var(--text-primary)',
          color: 'var(--background)',
          fontSize: '11px',
          padding: '4px 8px',
          borderRadius: '4px',
          zIndex: 9999,
          pointerEvents: 'none',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
          maxWidth: '220px',
          whiteSpace: 'normal',
          textAlign: 'center',
          lineHeight: '1.4',
        }}>
          {content}
        </span>
      )}
    </span>
  );
}
