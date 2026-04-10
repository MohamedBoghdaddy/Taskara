import React from 'react';
import { Link } from 'react-router-dom';

const features = [
  { icon: '📥', title: 'Inbox Capture', desc: 'Capture anything instantly. Process later.' },
  { icon: '📝', title: 'Linked Notes', desc: 'Notes that connect. Backlinks and graph view.' },
  { icon: '✓', title: 'Smart Tasks', desc: 'Status, priority, subtasks, and recurring tasks.' },
  { icon: '🍅', title: 'Focus Timer', desc: 'Pomodoro sessions linked to your tasks.' },
  { icon: '☀️', title: 'Today Page', desc: 'Your daily execution center.' },
  { icon: '✨', title: 'AI Assistant', desc: 'Summarize, extract tasks, plan your day.' },
];

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      <header style={{ padding: '16px 32px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--surface)' }}>
        <span style={{ fontWeight: '700', fontSize: '20px', color: 'var(--primary)' }}>Taskara</span>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link to="/login"><button style={{ padding: '8px 16px', background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', color: 'var(--text-primary)', fontWeight: '500' }}>Sign in</button></Link>
          <Link to="/register"><button style={{ padding: '8px 16px', background: 'var(--primary)', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer', color: '#fff', fontWeight: '500' }}>Get started</button></Link>
        </div>
      </header>

      <main style={{ maxWidth: '900px', margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
        <h1 style={{ fontSize: '52px', fontWeight: '800', lineHeight: 1.15, marginBottom: '20px', color: 'var(--text-primary)' }}>
          Capture fast.<br /><span style={{ color: 'var(--primary)' }}>Focus deeply.</span><br />Stay connected.
        </h1>
        <p style={{ fontSize: '18px', color: 'var(--text-secondary)', maxWidth: '540px', margin: '0 auto 40px' }}>
          One workspace for notes, tasks, knowledge, and focus. Built for people who think and build.
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '80px' }}>
          <Link to="/register"><button style={{ padding: '14px 32px', background: 'var(--primary)', border: 'none', borderRadius: '10px', cursor: 'pointer', color: '#fff', fontWeight: '600', fontSize: '16px' }}>Start free →</button></Link>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', textAlign: 'left' }}>
          {features.map(f => (
            <div key={f.title} style={{ padding: '24px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px' }}>
              <div style={{ fontSize: '28px', marginBottom: '12px' }}>{f.icon}</div>
              <h3 style={{ fontWeight: '600', marginBottom: '6px' }}>{f.title}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
