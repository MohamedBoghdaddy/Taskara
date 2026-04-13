import React from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faInbox, faStickyNote, faClipboardList, faStopwatch,
  faCalendarCheck, faRobot,
} from '@fortawesome/free-solid-svg-icons';
import { LogoIcon, DiscordIcon, TwitterIcon, LinkedInIcon } from '../components/common/Icons';

const features = [
  { icon: faInbox,         color: '#6366f1', title: 'Inbox Capture',   desc: 'Capture anything instantly. Process later.' },
  { icon: faStickyNote,    color: '#8b5cf6', title: 'Linked Notes',    desc: 'Notes that connect. Backlinks and graph view.' },
  { icon: faClipboardList, color: '#10b981', title: 'Smart Tasks',     desc: 'Status, priority, subtasks, and recurring tasks.' },
  { icon: faStopwatch,     color: '#ef4444', title: 'Focus Timer',     desc: 'Pomodoro sessions linked to your tasks.' },
  { icon: faCalendarCheck, color: '#f59e0b', title: 'Today Page',      desc: 'Your daily execution center.' },
  { icon: faRobot,         color: '#3b82f6', title: 'AI Assistant',    desc: 'Summarize, extract tasks, plan your day.' },
];

export default function LandingPage() {
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Header */}
      <header style={{
        padding: '14px 32px', borderBottom: '1px solid var(--border)',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        background: 'var(--surface)', position: 'sticky', top: 0, zIndex: 50,
      }}>
        <span style={{ fontWeight: '800', fontSize: '20px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <LogoIcon size={22} color="var(--primary)" /> Taskara
        </span>
        <div style={{ display: 'flex', gap: '12px' }}>
          <Link to="/login">
            <button style={{ padding: '8px 18px', background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius)', cursor: 'pointer', color: 'var(--text-primary)', fontWeight: '500', fontSize: '14px' }}>
              Sign in
            </button>
          </Link>
          <Link to="/register">
            <button style={{ padding: '8px 18px', background: 'var(--primary)', border: 'none', borderRadius: 'var(--radius)', cursor: 'pointer', color: '#fff', fontWeight: '600', fontSize: '14px' }}>
              Get started
            </button>
          </Link>
        </div>
      </header>

      <main style={{ maxWidth: '920px', margin: '0 auto', padding: '80px 24px', textAlign: 'center' }}>
        {/* Hero */}
        <div style={{ marginBottom: '16px' }}>
          <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            background: 'var(--primary)14', color: 'var(--primary)',
            border: '1px solid var(--primary)33', borderRadius: '99px',
            padding: '4px 14px', fontSize: '12px', fontWeight: '600',
            marginBottom: '24px',
          }}>
            <FontAwesomeIcon icon={faRobot} size="xs" /> AI-powered · Free to start
          </span>
        </div>

        <h1 style={{ fontSize: 'clamp(36px, 6vw, 56px)', fontWeight: '800', lineHeight: 1.1, marginBottom: '20px', color: 'var(--text-primary)' }}>
          Capture fast.<br />
          <span style={{ color: 'var(--primary)' }}>Focus deeply.</span><br />
          Stay connected.
        </h1>
        <p style={{ fontSize: '18px', color: 'var(--text-secondary)', maxWidth: '540px', margin: '0 auto 40px', lineHeight: '1.6' }}>
          One workspace for notes, tasks, knowledge, and focus. Built for people who think and build.
        </p>

        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', marginBottom: '80px', flexWrap: 'wrap' }}>
          <Link to="/register">
            <button style={{
              padding: '14px 36px', background: 'var(--primary)', border: 'none',
              borderRadius: '10px', cursor: 'pointer', color: '#fff',
              fontWeight: '700', fontSize: '16px', boxShadow: '0 4px 16px var(--primary)44',
            }}>
              Start for free →
            </button>
          </Link>
          <Link to="/login">
            <button style={{
              padding: '14px 28px', background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: '10px', cursor: 'pointer', color: 'var(--text-primary)',
              fontWeight: '600', fontSize: '16px',
            }}>
              Sign in
            </button>
          </Link>
        </div>

        {/* Feature grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '20px', textAlign: 'left' }}>
          {features.map(f => (
            <div
              key={f.title}
              style={{
                padding: '24px', background: 'var(--surface)',
                border: '1px solid var(--border)', borderRadius: '12px',
                transition: 'box-shadow 0.2s, transform 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow = `0 4px 16px ${f.color}22`; e.currentTarget.style.transform = 'translateY(-2px)'; }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow = 'none'; e.currentTarget.style.transform = 'none'; }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: '10px',
                background: `${f.color}18`, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                marginBottom: '14px', color: f.color, fontSize: '18px',
              }}>
                <FontAwesomeIcon icon={f.icon} />
              </div>
              <h3 style={{ fontWeight: '700', marginBottom: '6px', fontSize: '15px', color: 'var(--text-primary)' }}>{f.title}</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px', lineHeight: '1.5', margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Social proof */}
        <div style={{ marginTop: '64px', paddingTop: '48px', borderTop: '1px solid var(--border)' }}>
          <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '12px' }}>Trusted by builders, makers, and thinkers</p>
          <div style={{ display: 'flex', gap: '32px', justifyContent: 'center', flexWrap: 'wrap' }}>
            {['Notes', 'Tasks', 'Sprints', 'Pomodoro', 'AI', 'Boards', 'Calendar', 'Analytics'].map(label => (
              <span key={label} style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', opacity: 0.8 }}>{label}</span>
            ))}
          </div>
        </div>
      </main>

      <footer style={{ borderTop: '1px solid var(--border)', padding: '20px 32px', textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginBottom: '12px' }}>
          {[
            { Icon: DiscordIcon,  label: 'Discord',  color: '#5865F2', href: '#' },
            { Icon: TwitterIcon,  label: 'Twitter',  color: '#1DA1F2', href: '#' },
            { Icon: LinkedInIcon, label: 'LinkedIn', color: '#0A66C2', href: '#' },
          ].map(({ Icon, label, color, href }) => (
            <a key={label} href={href} title={label} style={{ color: 'var(--text-muted)', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '13px', transition: 'color 0.15s' }}
              onMouseEnter={e => e.currentTarget.style.color = color}
              onMouseLeave={e => e.currentTarget.style.color = 'var(--text-muted)'}
            >
              <Icon /> {label}
            </a>
          ))}
        </div>
        © {new Date().getFullYear()} Taskara · All-in-one productivity workspace
      </footer>
    </div>
  );
}
