import React, { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from '../components/common/Sidebar';
import CommandModal from '../components/common/CommandModal';
import { useUIStore } from '../store/uiStore';
import { useAuthStore } from '../store/authStore';

export default function AppLayout() {
  const { sidebarOpen } = useUIStore();
  const { user } = useAuthStore();

  useEffect(() => {
    const handler = e => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        useUIStore.getState().openCommand();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div style={{ display: 'flex', height: '100vh', overflow: 'hidden', background: 'var(--bg)' }}>
      <Sidebar />
      <main style={{
        flex: 1,
        overflow: 'auto',
        marginLeft: sidebarOpen ? 'var(--sidebar-width)' : '0',
        transition: 'margin-left 0.2s ease',
      }}>
        <Outlet />
      </main>
      <CommandModal />
    </div>
  );
}
