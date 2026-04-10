import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useUIStore } from '../../store/uiStore';
import { useAuthStore } from '../../store/authStore';
import toast from 'react-hot-toast';
import * as authApi from '../../api/auth';

const navItems = [
  { path: '/today', label: 'Today', icon: '☀️' },
  { path: '/inbox', label: 'Inbox', icon: '📥' },
  { path: '/notes', label: 'Notes', icon: '📝' },
  { path: '/tasks', label: 'Tasks', icon: '✓' },
  { path: '/projects', label: 'Projects', icon: '📁' },
  { path: '/pomodoro', label: 'Focus', icon: '🍅' },
  { path: '/calendar', label: 'Calendar', icon: '📅' },
  { path: '/analytics', label: 'Analytics', icon: '📊' },
  { path: '/templates', label: 'Templates', icon: '📋' },
  { path: '/databases', label: 'Databases', icon: '🗄️' },
  { path: '/graph', label: 'Graph', icon: '🕸️' },
  { path: '/collaboration', label: 'Team', icon: '👥' },
  { path: '/ai', label: 'AI Assistant', icon: '✨' },
];

export default function Sidebar() {
  const { sidebarOpen, toggleSidebar, openCommand } = useUIStore();
  const { user, clearAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try { await authApi.logout({ refreshToken: localStorage.getItem('refreshToken') }); } catch {}
    clearAuth();
    navigate('/login');
  };

  if (!sidebarOpen) return (
    <div style={{ position: 'fixed', left: 0, top: 0, zIndex: 100 }}>
      <button onClick={toggleSidebar} style={{ padding: '12px', background: 'var(--surface)', border: 'none', color: 'var(--text-primary)', fontSize: '18px' }}>☰</button>
    </div>
  );

  return (
    <aside style={{
      position: 'fixed', left: 0, top: 0, bottom: 0, width: 'var(--sidebar-width)',
      background: 'var(--surface)', borderRight: '1px solid var(--border)',
      display: 'flex', flexDirection: 'column', zIndex: 100, overflow: 'hidden',
    }}>
      <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontWeight: '700', fontSize: '16px', color: 'var(--primary)' }}>Taskara</span>
        <button onClick={toggleSidebar} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '16px' }}>✕</button>
      </div>

      <div style={{ padding: '8px', borderBottom: '1px solid var(--border)' }}>
        <button onClick={openCommand} style={{
          width: '100%', padding: '8px 12px', background: 'var(--surface-alt)', border: '1px solid var(--border)',
          borderRadius: 'var(--radius)', color: 'var(--text-muted)', textAlign: 'left', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <span>🔍</span><span>Search... ⌘K</span>
        </button>
      </div>

      <nav style={{ flex: 1, overflow: 'auto', padding: '8px' }}>
        {navItems.map(item => (
          <NavLink key={item.path} to={item.path} style={({ isActive }) => ({
            display: 'flex', alignItems: 'center', gap: '10px', padding: '8px 12px',
            borderRadius: 'var(--radius)', color: isActive ? 'var(--primary)' : 'var(--text-secondary)',
            background: isActive ? 'var(--primary-soft)' : 'transparent',
            fontWeight: isActive ? '500' : '400', fontSize: '14px', marginBottom: '2px',
            textDecoration: 'none', transition: 'all 0.1s',
          })}>
            <span style={{ fontSize: '15px' }}>{item.icon}</span>
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>

      <div style={{ padding: '12px', borderTop: '1px solid var(--border)' }}>
        <NavLink to="/settings" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', borderRadius: 'var(--radius)', color: 'var(--text-secondary)', fontSize: '14px' }}>
          ⚙️ Settings
        </NavLink>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 12px', marginTop: '4px' }}>
          <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'var(--primary)', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: '600' }}>
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '13px', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.name}</div>
          </div>
          <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontSize: '13px' }}>↩</button>
        </div>
      </div>
    </aside>
  );
}
