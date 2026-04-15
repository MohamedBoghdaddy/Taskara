import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faBolt, faRobot, faEnvelope, faBell, faCheck,
  faPlug, faArrowRight, faStar, faArrowTrendUp,
  faUserGroup, faBuilding, faPlay, faWandMagicSparkles,
} from '@fortawesome/free-solid-svg-icons';
import { DiscordIcon, TwitterIcon, LinkedInIcon } from '../components/common/Icons';
import logo1 from '../assets/images/logo1.png';
import logo2 from '../assets/images/logo2.png';
import './LandingPage.css';

/* ─── Design tokens ─────────────────────────────────────────────── */
const BLUE      = '#2563EB';
const BLUE_SOFT = '#EFF6FF';
const BLUE_MID  = '#60A5FA';
const NAVY      = '#0F172A';
const SLATE     = '#64748B';
const BORDER    = '#E2E8F0';

/* ─── Data ──────────────────────────────────────────────────────── */
const FEATURES = [
  {
    icon: faWandMagicSparkles, color: '#2563EB', bg: '#EFF6FF',
    title: 'Tasks that write themselves.',
    desc:  'Drop a note, email, or voice memo. Taskara extracts action items, preserves source context, deduplicates, and structures tasks ready to execute.',
    trust: 'Context-preserving · Handles messy threads · No duplicates',
  },
  {
    icon: faUserGroup, color: '#7C3AED', bg: '#F5F3FF',
    title: 'Auto-assignment. Zero overhead.',
    desc:  'Routes by role, workload, and history. Every assignment shows you why it was made. Override anytime — you stay in control.',
    trust: 'Explainable routing · Manual override · Workload-aware',
  },
  {
    icon: faEnvelope, color: '#059669', bg: '#ECFDF5',
    title: 'AI that actually sends the email.',
    desc:  "Reports. Outreach. Follow-ups. Taskara drafts and sends them. Approval mode lets you review before anything goes out.",
    trust: 'Approval mode · Brand-safe templates · Full audit log',
  },
  {
    icon: faBell, color: '#D97706', bg: '#FFFBEB',
    title: 'No more follow-ups. Ever.',
    desc:  'Multi-step sequences with stop conditions, escalation rules, and channel choice. It knows when to stop — and when to escalate.',
    trust: 'Stop conditions · Escalation rules · Respects replies',
  },
  {
    icon: faPlug, color: '#DC2626', bg: '#FEF2F2',
    title: 'Plug in where you already work.',
    desc:  'ClickUp, GitHub, WhatsApp, Slack, email — with two-way sync, not just read access. Deep actions, not just logo coverage.',
    trust: 'Two-way sync · Deep action support · System-of-record safe',
  },
  {
    icon: faArrowTrendUp, color: '#2563EB', bg: '#EFF6FF',
    title: 'From any platform. In minutes.',
    desc:  'Migrate from Asana, Notion, or Trello. Preview the field mapping before import. History preserved. Rollback available.',
    trust: 'Mapping preview · History preserved · Import-safe',
  },
];

const USE_CASES = [
  {
    id: 'recruiters', label: 'Recruiters', icon: faUserGroup,
    pain:    'Too much admin between every candidate touchpoint.',
    headline: 'Stop chasing candidates.\nStart closing roles.',
    body:     'Taskara reads your inbox and pipeline, sends outreach, follows up on no-reply, books interviews, and logs every action in your ATS — while you focus on hiring decisions, not logistics.',
    workflow: ['Email / ATS', 'Outreach sent', 'Interview booked', 'ATS updated'],
    items:    [
      'Outreach and no-reply follow-up sequences',
      'Interview scheduling with calendar sync',
      'Candidate stage updates in your ATS',
      'Rejection and nurture sequences',
      'Audit trail for every candidate touchpoint',
    ],
    metrics:      ['Response rate', 'Time to first reply', 'Time to hire', 'Drop-off per stage'],
    integrations: 'Gmail · Google Calendar · Greenhouse / Lever',
  },
  {
    id: 'startups', label: 'Startups', icon: faBolt,
    pain:    'You talk a lot. Execution still gets lost.',
    headline: 'From Slack chaos\nto shipped work.',
    body:     "Taskara turns messy threads, product notes, and voice memos into owned tasks — assigned, tracked, and closed without a project manager or daily standup.",
    workflow: ['Slack / Docs', 'Tasks extracted', 'Owner assigned', 'Status sent'],
    items:    [
      'Chat and doc to structured task extraction',
      'Auto-assign by role and current workload',
      'Weekly velocity and status reports',
      'GitHub and Notion two-way sync',
      'Ownerless task detection and escalation',
    ],
    metrics:      ['Tasks completed / week', 'Idea → execution time', '% tasks without owner', 'Team velocity'],
    integrations: 'Slack · GitHub · Notion / ClickUp',
  },
  {
    id: 'agencies', label: 'Agencies', icon: faBuilding,
    pain:    'Coordination overhead kills your margins.',
    headline: 'Stop chasing approvals.\nStart delivering.',
    body:     'Taskara breaks client briefs into deliverables, chases approvals, sends status updates, and flags delays — before they become misses.',
    workflow: ['Client brief', 'Tasks created', 'Client updated', 'Delay flagged'],
    items:    [
      'Brief to task breakdown',
      'Automated client status updates',
      'Approval request and follow-up sequences',
      'Deadline and bottleneck detection',
      'Cross-account project visibility',
    ],
    metrics:      ['On-time delivery %', 'Client response time', 'Active delays', 'Team utilization'],
    integrations: 'Email · Slack / WhatsApp · ClickUp / Notion',
  },
  {
    id: 'realestate', label: 'Real Estate', icon: faBuilding,
    pain:    'Everything depends on follow-ups and documents.',
    headline: 'Every deal has 40 moving parts.\nTrack all of them.',
    body:     'From lead inquiry to closing, Taskara automates follow-up sequences, document requests, deal stage updates, and multi-party coordination — so nothing falls through.',
    workflow: ['Lead / CRM', 'Follow-up sent', 'Docs requested', 'Stage updated'],
    items:    [
      'Lead follow-up sequences by source',
      'Document request and reminder automation',
      'Deal stage tracking and next-action triggers',
      'Multi-party coordination (agent, buyer, broker)',
      'Compliance-ready communication logs',
    ],
    metrics:      ['Lead response time', 'Conversion rate', 'Deal completion time', 'Missing docs count'],
    integrations: 'WhatsApp · Gmail · HubSpot / CRM · Google Drive',
  },
];

const TESTIMONIALS = [
  {
    quote: 'We cut our follow-up time by 70% in the first week. Candidates were getting faster responses than when we had a full coordinator on the role.',
    name:  'Sarah K.', role: 'Head of Talent @ Series B SaaS startup', stars: 5,
  },
  {
    quote: "I used to spend Friday mornings writing client status emails. Taskara writes them Wednesday night and sends them Thursday. I didn't change anything.",
    name:  'Marcus T.', role: 'Founder @ Digital Agency, 18 clients', stars: 5,
  },
  {
    quote: 'Our ops team stopped having daily standups because Taskara just handles it. Tasks move, people get notified. Nothing gets dropped.',
    name:  'Priya M.', role: 'COO @ Real Estate Group, 40+ agents', stars: 5,
  },
];

const STATS = [
  { value: '12,000+', label: 'tasks executed daily' },
  { value: '4.9 / 5',  label: 'avg rating'           },
  { value: '70%',      label: 'less follow-up'        },
  { value: '60 sec',   label: 'to go live'            },
];

const PRICING = [
  {
    name: 'Starter', price: 'Free', sub: 'forever',
    desc: 'For individuals and small teams getting started.',
    cta: 'Get started free', ctaTo: '/register', highlight: false,
    features: ['Up to 50 tasks/month', 'AI task generation from notes & email', 'Basic auto-assignment', '1 integration', '7-day history'],
  },
  {
    name: 'Pro', price: '$29', sub: '/ month', badge: 'Most popular',
    desc: 'For teams that need full execution power.',
    cta: 'Start free for 14 days', ctaTo: '/register', highlight: true,
    features: ['Unlimited tasks', 'AI email and report execution', 'All integrations (ClickUp, GitHub, Slack)', 'Auto follow-up engine', 'Full history + audit log', 'Priority support'],
  },
  {
    name: 'Team', price: '$79', sub: '/ month',
    desc: 'For operations-heavy teams and agencies.',
    cta: 'Talk to us', ctaTo: '/register', highlight: false,
    features: ['Up to 25 seats', 'Client workspace management', 'Cross-project AI automation', 'Custom workflow rules', 'Admin controls and permissions', 'Dedicated onboarding'],
  },
];

const STEPS = [
  {
    num: '1', color: '#3B82F6',
    title: 'Connect your sources.',
    desc:  'Email, Slack, WhatsApp, notes, voice. Taskara listens where you already work. Setup takes under 5 minutes.',
  },
  {
    num: '2', color: BLUE,
    title: 'AI reads. AI decides. AI acts.',
    desc:  "It extracts tasks, assigns them, drafts the messages, and sets execution in motion. You don't review anything unless you want to.",
  },
  {
    num: '3', color: '#059669',
    title: 'Work gets done.',
    desc:  'Tasks are completed, closed, and logged. Stakeholders are notified. You didn\'t have to think about any of it.',
  },
];

const PAIN_CARDS = [
  { emoji: '📋', title: 'Your list grows. Nothing closes.', desc: "You track tasks. You move them. You comment on them. But the follow-through still requires you — every single time." },
  { emoji: '📅', title: 'Follow-up is a full-time job.',   desc: 'Reminders. Nudges. Check-ins. Manual messages. You spend more calendar time chasing work than doing it. Things still slip.' },
  { emoji: '⏳', title: 'Context dies at handoff.',        desc: "By the time a task is delegated, half the context is gone. The next action takes longer than the original work would have." },
];


/* ─── Component ─────────────────────────────────────────────────── */
export default function LandingPage() {
  const [activeTab, setActiveTab] = useState('recruiters');
  const [scrolled,  setScrolled]  = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const activeCase = USE_CASES.find(u => u.id === activeTab);

  /* ── shared helpers ── */
  const SectionBadge = ({ children, color = BLUE, bg = BLUE_SOFT, border = '#BFDBFE' }) => (
    <div style={{
      display: 'inline-block', background: bg, color, border: `1px solid ${border}`,
      borderRadius: '99px', padding: '4px 16px', fontSize: '12px', fontWeight: '600',
      marginBottom: '20px', letterSpacing: '0.02em',
    }}>
      {children}
    </div>
  );

  const H2 = ({ children, light = false }) => (
    <h2 style={{
      fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: '800',
      color: light ? '#F8FAFC' : NAVY,
      letterSpacing: '-0.025em', lineHeight: 1.2, marginBottom: '14px',
    }}>
      {children}
    </h2>
  );

  /* ════════════════════════════════════════════════════════════════ */
  return (
    <div className="lp-page" style={{ minHeight: '100vh', background: '#FFFFFF', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>

      {/* ══ NAVBAR ════════════════════════════════════════════════ */}
      <header className={`lp-navbar${scrolled ? ' is-scrolled' : ''}`} style={{
        position: 'sticky', top: 0, zIndex: 100, height: '64px',
        padding: '0 48px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        background:    scrolled ? 'rgba(252, 252, 252, 0.57)' : '#FCFCFC',
        backdropFilter: scrolled ? 'blur(12px)'            : 'none',
        borderBottom:  scrolled ? `1px solid ${BORDER}`   : '1px solid transparent',
        transition: 'background 0.25s, border-color 0.25s, backdrop-filter 0.25s',
      }}>
        {/* Logo */}
        <Link to="/" className="lp-brand-link" style={{ display: 'flex', alignItems: 'center' }}>
          <img src={logo1} alt="Taskara" className="lp-brand-logo" style={{ height: '34px', objectFit: 'contain' }} />
        </Link>

        {/* Nav links */}
        <nav className="lp-nav-links" style={{ display: 'flex', gap: '36px', alignItems: 'center' }}>
          {[['Features', '#features'], ['Use Cases', '#use-cases'], ['Pricing', '#pricing']].map(([label, href]) => (
            <a key={label} href={href} className="lp-nav-link"
              style={{ fontSize: '14px', fontWeight: '500', color: '#374151', textDecoration: 'none' }}>
              {label}
            </a>
          ))}
        </nav>

        {/* Auth CTAs */}
        <div className="lp-navbar-actions" style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <Link to="/login">
            <button className="lp-btn-ghost lp-navbar-button lp-navbar-button-ghost" style={{
              padding: '8px 20px', background: 'none',
              border: `1px solid ${BORDER}`, borderRadius: '8px',
              cursor: 'pointer', color: '#374151', fontWeight: '500', fontSize: '14px',
            }}>
              Log in
            </button>
          </Link>
          <Link to="/register">
            <button className="lp-btn-primary lp-navbar-button lp-navbar-button-primary" style={{
              padding: '8px 20px', background: BLUE, border: 'none',
              borderRadius: '8px', cursor: 'pointer', color: '#fff',
              fontWeight: '600', fontSize: '14px',
              boxShadow: `0 2px 10px ${BLUE}44`,
            }}>
              Start free →
            </button>
          </Link>
        </div>
      </header>

      {/* ══ HERO ══════════════════════════════════════════════════ */}
      <section style={{ padding: '96px 48px 80px', maxWidth: '1140px', margin: '0 auto', textAlign: 'center' }}>

        {/* Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '7px',
          background: BLUE_SOFT, color: BLUE, border: '1px solid #BFDBFE',
          borderRadius: '99px', padding: '5px 16px',
          fontSize: '12px', fontWeight: '600', marginBottom: '30px', letterSpacing: '0.03em',
        }}>
          <FontAwesomeIcon icon={faBolt} size="xs" />
          AI Execution Platform · Free to start
        </div>

        {/* Headline */}
        <h1 style={{
          fontSize: 'clamp(38px, 6.5vw, 68px)', fontWeight: '800',
          lineHeight: 1.06, marginBottom: '22px',
          color: NAVY, letterSpacing: '-0.035em',
        }}>
          Stop managing tasks.<br />
          <span style={{ color: BLUE }}>Let AI close them.</span>
        </h1>

        {/* Sub */}
        <p style={{
          fontSize: 'clamp(16px, 2vw, 19px)', color: SLATE,
          maxWidth: '560px', margin: '0 auto 40px', lineHeight: 1.65,
        }}>
          Taskara turns your emails, chats, and notes into executed work — automatically.
          No follow-ups. No bottlenecks. Just done.
        </p>

        {/* CTAs */}
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap', marginBottom: '18px' }}>
          <Link to="/register">
            <button className="lp-btn-primary-lg" style={{
              display: 'inline-flex', alignItems: 'center', gap: '9px',
              padding: '15px 38px', background: BLUE, border: 'none',
              borderRadius: '10px', cursor: 'pointer', color: '#fff',
              fontWeight: '700', fontSize: '16px',
              boxShadow: `0 6px 22px ${BLUE}44`,
            }}>
              Start for free <FontAwesomeIcon icon={faArrowRight} />
            </button>
          </Link>
          <a href="#how-it-works" className="lp-btn-ghost-lg" style={{
            display: 'inline-flex', alignItems: 'center', gap: '9px',
            padding: '15px 30px', background: '#F8FAFC',
            border: `1px solid ${BORDER}`, borderRadius: '10px',
            color: '#374151', fontWeight: '600', fontSize: '16px', textDecoration: 'none',
          }}>
            <FontAwesomeIcon icon={faPlay} style={{ fontSize: '11px', color: BLUE }} />
            See how it works
          </a>
        </div>
        <p style={{ fontSize: '12px', color: '#94A3B8', marginBottom: '64px' }}>
          Free forever on Starter · No credit card required · Live in 60 seconds
        </p>

        {/* ── Hero mock UI ── */}
        <div className="lp-hero-mock" style={{
          maxWidth: '820px', margin: '0 auto',
          background: '#F8FAFC', border: `1px solid ${BORDER}`,
          borderRadius: '16px', padding: '22px',
          boxShadow: '0 32px 72px rgba(0,0,0,0.1), 0 4px 16px rgba(0,0,0,0.05)',
        }}>
          {/* Browser chrome */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '20px' }}>
            {['#FCA5A5', '#FDE68A', '#86EFAC'].map(c => (
              <span key={c} style={{ width: 10, height: 10, borderRadius: '50%', background: c, display: 'inline-block' }} />
            ))}
            <div style={{
              flex: 1, height: 22, background: '#E2E8F0', borderRadius: '6px',
              marginLeft: '10px', display: 'flex', alignItems: 'center', paddingLeft: '12px',
            }}>
              <span style={{ fontSize: '11px', color: '#94A3B8' }}>app.taskara.io/today</span>
            </div>
          </div>

          {/* Execution flow */}
          <div style={{
            display: 'grid', gap: '10px', alignItems: 'center',
            gridTemplateColumns: '1fr 52px 1fr 52px 1fr',
          }}>
            {/* Input */}
            <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: '10px', padding: '16px' }}>
              <div style={{ fontSize: '10px', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
                Email received
              </div>
              <div style={{ fontSize: '12px', color: '#374151', lineHeight: 1.55 }}>
                <div style={{ fontWeight: '700', marginBottom: '5px' }}>Re: Q2 Report</div>
                "Can you send the updated pipeline report to the client by Friday?"
              </div>
            </div>

            {/* AI arrow */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
              <div className="lp-pulse" style={{
                width: 34, height: 34, borderRadius: '50%', background: BLUE,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <FontAwesomeIcon icon={faRobot} style={{ color: '#fff', fontSize: '13px' }} />
              </div>
              <FontAwesomeIcon icon={faArrowRight} style={{ color: '#CBD5E1', fontSize: '13px' }} />
            </div>

            {/* Task */}
            <div style={{ background: '#fff', border: `2px solid ${BLUE}33`, borderRadius: '10px', padding: '16px' }}>
              <div style={{ fontSize: '10px', fontWeight: '700', color: BLUE, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
                AI created task
              </div>
              <div style={{ fontSize: '12px', color: '#374151', lineHeight: 1.55 }}>
                <div style={{ fontWeight: '700', marginBottom: '5px' }}>Send Q2 pipeline report</div>
                <span style={{ color: SLATE }}>Assigned: Marcus · Due: Friday</span>
              </div>
            </div>

            {/* Done arrow */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '5px' }}>
              <div style={{
                width: 34, height: 34, borderRadius: '50%', background: '#059669',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <FontAwesomeIcon icon={faCheck} style={{ color: '#fff', fontSize: '13px' }} />
              </div>
              <FontAwesomeIcon icon={faArrowRight} style={{ color: '#CBD5E1', fontSize: '13px' }} />
            </div>

            {/* Executed */}
            <div style={{ background: '#ECFDF5', border: '1px solid #A7F3D0', borderRadius: '10px', padding: '16px' }}>
              <div style={{ fontSize: '10px', fontWeight: '700', color: '#059669', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '10px' }}>
                Executed ✓
              </div>
              <div style={{ fontSize: '12px', color: '#374151', lineHeight: 1.55 }}>
                <div style={{ fontWeight: '700', marginBottom: '5px' }}>Report sent</div>
                <span style={{ color: SLATE }}>9 sec · Zero human action needed</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ══ STATS BAR ════════════════════════════════════════════ */}
      <section style={{ background: '#F8FAFC', borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, padding: '36px 48px' }}>
        <div className="lp-stats-grid" style={{
          maxWidth: '880px', margin: '0 auto',
          display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)',
          gap: '24px', textAlign: 'center',
        }}>
          {STATS.map(s => (
            <div key={s.label}>
              <div style={{ fontSize: '30px', fontWeight: '800', color: NAVY, letterSpacing: '-0.025em' }}>{s.value}</div>
              <div style={{ fontSize: '13px', color: SLATE, marginTop: '5px' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ PROBLEM ══════════════════════════════════════════════ */}
      <section id="features" style={{ padding: '100px 48px', maxWidth: '1140px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <SectionBadge color="#DC2626" bg="#FEF2F2" border="#FECACA">
            The real cost of task management
          </SectionBadge>
          <H2>Your team is drowning in work<br />that was never done.</H2>
          <p style={{ fontSize: '17px', color: SLATE, maxWidth: '520px', margin: '0 auto', lineHeight: 1.65 }}>
            Task managers were built to track work. Not to do it. So you end up with long lists,
            missed follow-ups, and the same tasks sitting there, untouched, tomorrow.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
          {PAIN_CARDS.map(card => (
            <div key={card.title} className="lp-problem-card"
              style={{ padding: '28px', background: '#fff', border: `1px solid ${BORDER}`, borderRadius: '12px' }}>
              <div style={{ fontSize: '30px', marginBottom: '14px' }}>{card.emoji}</div>
              <h3 style={{ fontWeight: '700', fontSize: '16px', color: NAVY, marginBottom: '8px' }}>{card.title}</h3>
              <p style={{ color: SLATE, fontSize: '14px', lineHeight: 1.65, margin: 0 }}>{card.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ══ SOLUTION ═════════════════════════════════════════════ */}
      <section style={{ background: NAVY, padding: '100px 48px' }}>
        <div style={{ maxWidth: '960px', margin: '0 auto', textAlign: 'center' }}>
          <SectionBadge color="#93C5FD" bg={`${BLUE}22`} border={`${BLUE}44`}>
            A different kind of platform
          </SectionBadge>
          <H2 light>
            Taskara doesn't manage your work.<br />
            <span style={{ color: BLUE_MID }}>It executes it.</span>
          </H2>
          <p style={{ fontSize: '17px', color: '#94A3B8', maxWidth: '520px', margin: '0 auto 64px', lineHeight: 1.65 }}>
            Drop a note. Forward an email. Type a message. Taskara reads it, creates the task,
            assigns it, and handles the follow-through — on its own.
          </p>

          {/* Flow */}
          <div className="lp-flow-grid" style={{
            display: 'grid', gap: '16px', alignItems: 'center',
            gridTemplateColumns: '1fr 40px 1fr 40px 1fr',
          }}>
            {[
              { step: '01', label: 'Input',    desc: 'Email, Slack, notes, voice — wherever you already work.',            color: '#3B82F6' },
              null,
              { step: '02', label: 'AI',       desc: 'Reads context, creates tasks, assigns owners, drafts outputs.',       color: BLUE },
              null,
              { step: '03', label: 'Executed', desc: 'Work is completed, closed, and logged. Zero manual effort required.', color: '#059669' },
            ].map((item, i) => item ? (
              <div key={i} style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.09)',
                borderRadius: '12px', padding: '28px', textAlign: 'center',
              }}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: item.color, letterSpacing: '0.1em', marginBottom: '8px' }}>
                  STEP {item.step}
                </div>
                <div style={{ fontSize: '22px', fontWeight: '800', color: '#F8FAFC', marginBottom: '10px' }}>{item.label}</div>
                <div style={{ fontSize: '13px', color: '#94A3B8', lineHeight: 1.6 }}>{item.desc}</div>
              </div>
            ) : (
              <div key={i} className="lp-flow-arrow" style={{ display: 'flex', justifyContent: 'center' }}>
                <FontAwesomeIcon icon={faArrowRight} style={{ color: '#334155', fontSize: '18px' }} />
              </div>
            ))}
          </div>

          <div style={{ marginTop: '44px', fontSize: '15px', color: '#64748B' }}>
            From input to execution in under{' '}
            <span style={{ color: BLUE_MID, fontWeight: '700' }}>10 seconds.</span>
          </div>
        </div>
      </section>

      {/* ══ FEATURES ═════════════════════════════════════════════ */}
      <section id="features-detail" style={{ padding: '100px 48px', maxWidth: '1140px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <SectionBadge>Outcome-based features</SectionBadge>
          <H2>Everything that used to take an hour.<br />Now it takes zero.</H2>
          <p style={{ fontSize: '16px', color: SLATE, fontWeight: '600' }}>
            Close more work. Do less manually.
          </p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px' }}>
          {FEATURES.map(f => (
            <div key={f.title} className="lp-feature-card"
              style={{ padding: '28px', background: '#fff', border: `1px solid ${BORDER}`, borderRadius: '12px' }}
              onMouseEnter={e => {
                e.currentTarget.style.boxShadow = `0 10px 36px ${f.color}18`;
                e.currentTarget.style.borderColor = `${f.color}44`;
                e.currentTarget.style.transform = 'translateY(-4px)';
              }}
              onMouseLeave={e => {
                e.currentTarget.style.boxShadow = 'none';
                e.currentTarget.style.borderColor = BORDER;
                e.currentTarget.style.transform = 'none';
              }}
            >
              <div style={{
                width: 46, height: 46, borderRadius: '10px', background: f.bg,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                marginBottom: '16px', color: f.color, fontSize: '18px',
              }}>
                <FontAwesomeIcon icon={f.icon} />
              </div>
              <h3 style={{ fontWeight: '700', fontSize: '15px', color: NAVY, marginBottom: '8px' }}>{f.title}</h3>
              <p style={{ color: SLATE, fontSize: '14px', lineHeight: 1.65, marginBottom: f.trust ? '14px' : 0 }}>{f.desc}</p>
              {f.trust && (
                <div style={{ fontSize: '11px', color: '#64748B', fontWeight: '600', letterSpacing: '0.01em', borderTop: `1px solid ${BORDER}`, paddingTop: '10px' }}>
                  {f.trust}
                </div>
              )}
            </div>
          ))}
        </div>
      </section>

      {/* ══ USE CASES ════════════════════════════════════════════ */}
      <section id="use-cases" style={{ background: '#F8FAFC', borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`, padding: '100px 48px' }}>
        <div style={{ maxWidth: '940px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '50px' }}>
            <SectionBadge>Use cases</SectionBadge>
            <H2>Built for teams that can't afford<br />to slow down.</H2>
          </div>

          {/* Tab bar */}
          <div style={{
            display: 'flex', gap: '4px', background: '#E2E8F0',
            borderRadius: '10px', padding: '4px', marginBottom: '32px',
          }}>
            {USE_CASES.map(uc => (
              <button key={uc.id}
                onClick={() => setActiveTab(uc.id)}
                style={{
                  flex: 1, padding: '10px 14px', borderRadius: '7px', border: 'none',
                  cursor: 'pointer', fontWeight: '600', fontSize: '14px',
                  transition: 'all 0.15s',
                  background: activeTab === uc.id ? '#fff'       : 'transparent',
                  color:      activeTab === uc.id ? NAVY          : SLATE,
                  boxShadow:  activeTab === uc.id ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                <FontAwesomeIcon icon={uc.icon} style={{ marginRight: '6px', fontSize: '12px' }} />
                {uc.label}
              </button>
            ))}
          </div>

          {/* Tab content */}
          {activeCase && (
            <div key={activeCase.id} className="lp-usecase-grid" style={{
              display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '40px', alignItems: 'start',
            }}>
              {/* Left — headline, pain, body, CTA */}
              <div>
                <div style={{
                  display: 'inline-block', background: '#FEF2F2', color: '#DC2626',
                  border: '1px solid #FECACA', borderRadius: '6px',
                  padding: '3px 10px', fontSize: '12px', fontWeight: '600', marginBottom: '14px',
                }}>
                  {activeCase.pain}
                </div>
                <h3 style={{
                  fontSize: '24px', fontWeight: '800', color: NAVY,
                  letterSpacing: '-0.025em', marginBottom: '14px', lineHeight: 1.25,
                  whiteSpace: 'pre-line',
                }}>
                  {activeCase.headline}
                </h3>
                <p style={{ fontSize: '15px', color: SLATE, lineHeight: 1.7, marginBottom: '24px' }}>
                  {activeCase.body}
                </p>

                {/* Workflow chain */}
                <div style={{ marginBottom: '28px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '10px' }}>
                    How it runs
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexWrap: 'wrap' }}>
                    {activeCase.workflow.map((step, i) => (
                      <React.Fragment key={i}>
                        <div style={{
                          background: i === 0 ? '#F1F5F9' : i === activeCase.workflow.length - 1 ? '#ECFDF5' : BLUE_SOFT,
                          color:      i === 0 ? '#475569' : i === activeCase.workflow.length - 1 ? '#059669' : BLUE,
                          border:     `1px solid ${i === 0 ? '#E2E8F0' : i === activeCase.workflow.length - 1 ? '#A7F3D0' : '#BFDBFE'}`,
                          borderRadius: '6px', padding: '4px 10px',
                          fontSize: '12px', fontWeight: '600', whiteSpace: 'nowrap',
                        }}>
                          {step}
                        </div>
                        {i < activeCase.workflow.length - 1 && (
                          <FontAwesomeIcon icon={faArrowRight} style={{ color: '#CBD5E1', fontSize: '10px', flexShrink: 0 }} />
                        )}
                      </React.Fragment>
                    ))}
                  </div>
                </div>

                <Link to="/register">
                  <button className="lp-btn-primary" style={{
                    display: 'inline-flex', alignItems: 'center', gap: '7px',
                    padding: '11px 22px', background: BLUE, border: 'none',
                    borderRadius: '8px', cursor: 'pointer', color: '#fff',
                    fontWeight: '600', fontSize: '14px', boxShadow: `0 2px 10px ${BLUE}33`,
                  }}>
                    Try it free <FontAwesomeIcon icon={faArrowRight} style={{ fontSize: '12px' }} />
                  </button>
                </Link>
              </div>

              {/* Right — checklist + metrics + integrations */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Checklist */}
                <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: '12px', padding: '22px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '16px' }}>
                    What Taskara handles
                  </div>
                  {activeCase.items.map(item => (
                    <div key={item} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', marginBottom: '11px' }}>
                      <div style={{
                        width: 18, height: 18, borderRadius: '50%',
                        background: BLUE_SOFT, display: 'flex',
                        alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px',
                      }}>
                        <FontAwesomeIcon icon={faCheck} style={{ color: BLUE, fontSize: '9px' }} />
                      </div>
                      <span style={{ fontSize: '13px', color: '#374151', lineHeight: 1.5 }}>{item}</span>
                    </div>
                  ))}
                </div>

                {/* Metrics */}
                <div style={{ background: '#fff', border: `1px solid ${BORDER}`, borderRadius: '12px', padding: '22px' }}>
                  <div style={{ fontSize: '11px', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '14px' }}>
                    What gets measured
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    {activeCase.metrics.map(m => (
                      <div key={m} style={{
                        background: '#F8FAFC', border: `1px solid ${BORDER}`,
                        borderRadius: '6px', padding: '8px 12px',
                        fontSize: '12px', color: '#374151', fontWeight: '500',
                      }}>
                        {m}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Integrations */}
                <div style={{
                  background: BLUE_SOFT, border: '1px solid #BFDBFE',
                  borderRadius: '10px', padding: '14px 18px',
                  display: 'flex', alignItems: 'center', gap: '10px',
                }}>
                  <FontAwesomeIcon icon={faPlug} style={{ color: BLUE, fontSize: '13px', flexShrink: 0 }} />
                  <span style={{ fontSize: '12px', color: '#1D4ED8', fontWeight: '600' }}>
                    {activeCase.integrations}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      {/* ══ HOW IT WORKS ═════════════════════════════════════════ */}
      <section id="how-it-works" style={{ padding: '100px 48px', maxWidth: '760px', margin: '0 auto', textAlign: 'center' }}>
        <SectionBadge>Simple by design</SectionBadge>
        <H2>Three steps. Then you stop doing it manually.</H2>
        <p style={{ fontSize: '16px', color: SLATE, marginBottom: '56px', lineHeight: 1.65 }}>
          Connect your sources once. Taskara handles everything after that.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', textAlign: 'left' }}>
          {STEPS.map((step, i) => (
            <div key={i} className="lp-step-row"
              style={{ display: 'flex', gap: '18px', alignItems: 'flex-start', padding: '24px', background: '#F8FAFC', border: `1px solid ${BORDER}`, borderRadius: '12px' }}>
              <div style={{
                width: 40, height: 40, borderRadius: '50%', background: step.color,
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: '800', fontSize: '15px', flexShrink: 0,
              }}>
                {step.num}
              </div>
              <div>
                <h3 style={{ fontWeight: '700', fontSize: '16px', color: NAVY, marginBottom: '6px' }}>{step.title}</h3>
                <p style={{ color: SLATE, fontSize: '14px', lineHeight: 1.65, margin: 0 }}>{step.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ══ TESTIMONIALS ═════════════════════════════════════════ */}
      <section style={{ background: '#F8FAFC', borderTop: `1px solid ${BORDER}`, padding: '100px 48px' }}>
        <div style={{ maxWidth: '1140px', margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: '60px' }}>
            <SectionBadge>Social proof</SectionBadge>
            <H2>Teams that stopped managing.<br />Started executing.</H2>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px' }}>
            {TESTIMONIALS.map(t => (
              <div key={t.name} className="lp-testimonial-card"
                style={{ padding: '28px', background: '#fff', border: `1px solid ${BORDER}`, borderRadius: '12px' }}>
                <div style={{ display: 'flex', gap: '3px', marginBottom: '16px' }}>
                  {Array(t.stars).fill(0).map((_, i) => (
                    <FontAwesomeIcon key={i} icon={faStar} style={{ color: '#FBBF24', fontSize: '14px' }} />
                  ))}
                </div>
                <p style={{ fontSize: '15px', color: '#374151', lineHeight: 1.7, marginBottom: '22px', fontStyle: 'italic' }}>
                  "{t.quote}"
                </p>
                <div>
                  <div style={{ fontWeight: '700', fontSize: '14px', color: NAVY }}>{t.name}</div>
                  <div style={{ fontSize: '12px', color: '#94A3B8', marginTop: '3px' }}>{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ══ PRICING ══════════════════════════════════════════════ */}
      <section id="pricing" style={{ padding: '100px 48px', maxWidth: '1140px', margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: '60px' }}>
          <SectionBadge>Pricing</SectionBadge>
          <H2>Start free. Scale when you're ready.</H2>
          <p style={{ fontSize: '16px', color: SLATE }}>No hidden seats. No surprise charges. No feature walls.</p>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '20px', alignItems: 'start' }}>
          {PRICING.map(plan => (
            <div key={plan.name}
              className={`lp-pricing-card${plan.highlight ? ' lp-pricing-highlight' : ''}`}
              style={{
                padding: '32px', borderRadius: '14px', position: 'relative',
                background: plan.highlight ? BLUE     : '#fff',
                border:     plan.highlight ? `2px solid ${BLUE}` : `1px solid ${BORDER}`,
                boxShadow:  plan.highlight ? `0 16px 48px ${BLUE}30` : 'none',
              }}
            >
              {plan.badge && (
                <div style={{
                  position: 'absolute', top: '-13px', left: '50%', transform: 'translateX(-50%)',
                  background: NAVY, color: '#fff', borderRadius: '99px',
                  padding: '4px 16px', fontSize: '11px', fontWeight: '700',
                  whiteSpace: 'nowrap', letterSpacing: '0.05em',
                }}>
                  {plan.badge}
                </div>
              )}

              <div style={{ fontSize: '13px', fontWeight: '600', color: plan.highlight ? '#BFDBFE' : SLATE, marginBottom: '6px' }}>
                {plan.name}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', marginBottom: '8px' }}>
                <span style={{ fontSize: '38px', fontWeight: '800', letterSpacing: '-0.035em', color: plan.highlight ? '#fff' : NAVY }}>
                  {plan.price}
                </span>
                <span style={{ fontSize: '14px', color: plan.highlight ? '#BFDBFE' : '#94A3B8' }}>{plan.sub}</span>
              </div>
              <p style={{ fontSize: '13px', color: plan.highlight ? '#BFDBFE' : SLATE, marginBottom: '24px', lineHeight: 1.55 }}>
                {plan.desc}
              </p>

              <Link to={plan.ctaTo} style={{ display: 'block', marginBottom: '24px' }}>
                <button style={{
                  width: '100%', padding: '12px', borderRadius: '8px', border: 'none',
                  cursor: 'pointer', fontWeight: '700', fontSize: '14px',
                  background: plan.highlight ? '#fff'  : BLUE,
                  color:      plan.highlight ? BLUE    : '#fff',
                  boxShadow:  plan.highlight ? 'none'  : `0 2px 10px ${BLUE}30`,
                  transition: 'filter 0.15s, transform 0.15s',
                }}
                  onMouseEnter={e => { e.currentTarget.style.filter = 'brightness(1.05)'; e.currentTarget.style.transform = 'translateY(-1px)'; }}
                  onMouseLeave={e => { e.currentTarget.style.filter = 'none'; e.currentTarget.style.transform = 'none'; }}
                >
                  {plan.cta}
                </button>
              </Link>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {plan.features.map(f => (
                  <div key={f} style={{ display: 'flex', alignItems: 'flex-start', gap: '9px' }}>
                    <FontAwesomeIcon icon={faCheck} style={{
                      color: plan.highlight ? '#BFDBFE' : BLUE,
                      fontSize: '11px', marginTop: '3px', flexShrink: 0,
                    }} />
                    <span style={{ fontSize: '13px', color: plan.highlight ? '#fff' : '#374151', lineHeight: 1.45 }}>{f}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <p style={{ textAlign: 'center', fontSize: '13px', color: '#94A3B8', marginTop: '36px' }}>
          All plans include SOC 2-ready infrastructure, 99.9% uptime SLA,
          and a 30-day money-back guarantee on paid plans.
        </p>
      </section>

      {/* ══ FINAL CTA ════════════════════════════════════════════ */}
      <section style={{ background: BLUE, padding: '100px 48px', textAlign: 'center' }}>
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <h2 style={{
            fontSize: 'clamp(28px, 4.5vw, 46px)', fontWeight: '800', color: '#fff',
            letterSpacing: '-0.03em', lineHeight: 1.15, marginBottom: '18px',
          }}>
            Your tasks are waiting.<br />Your AI is ready.
          </h2>
          <p style={{ fontSize: '17px', color: '#BFDBFE', marginBottom: '44px', lineHeight: 1.65 }}>
            Every day you spend managing work manually is a day Taskara could have closed it for you.
            Start today. See execution happen in your first hour.
          </p>
          <Link to="/register">
            <button className="lp-cta-final-btn" style={{
              padding: '17px 48px', background: '#fff', border: 'none',
              borderRadius: '10px', cursor: 'pointer', color: BLUE,
              fontWeight: '800', fontSize: '17px',
              boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
            }}>
              Start for free — it takes 60 seconds
            </button>
          </Link>
          <div style={{ marginTop: '22px', fontSize: '13px', color: '#93C5FD' }}>
            No credit card &nbsp;·&nbsp; No setup fee &nbsp;·&nbsp; Cancel anytime
          </div>
        </div>
      </section>

      {/* ══ FOOTER ═══════════════════════════════════════════════ */}
      <footer style={{ background: NAVY, padding: '64px 48px 32px' }}>
        <div style={{ maxWidth: '1140px', margin: '0 auto' }}>
          <div className="lp-footer-grid" style={{
            display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr',
            gap: '48px', marginBottom: '52px',
          }}>
            {/* Brand */}
            <div>
              <img src={logo2} alt="Taskara" style={{ height: '38px', objectFit: 'contain', marginBottom: '16px' }} />
              <p style={{ fontSize: '14px', color: '#64748B', lineHeight: 1.7, maxWidth: '230px' }}>
                Taskara executes your work so you don't have to.
              </p>
              <div style={{ display: 'flex', gap: '18px', marginTop: '22px' }}>
                {[
                  { Icon: DiscordIcon,  label: 'Discord',  color: '#5865F2' },
                  { Icon: TwitterIcon,  label: 'Twitter',  color: '#1DA1F2' },
                  { Icon: LinkedInIcon, label: 'LinkedIn', color: '#0A66C2' },
                ].map(({ Icon, label, color }) => (
                  <a key={label} href="#" title={label}
                    style={{ color: '#475569', transition: 'color 0.15s', display: 'flex', alignItems: 'center' }}
                    onMouseEnter={e => e.currentTarget.style.color = color}
                    onMouseLeave={e => e.currentTarget.style.color = '#475569'}
                  >
                    <Icon />
                  </a>
                ))}
              </div>
            </div>

            {/* Link columns */}
            {[
              { title: 'Product',   links: ['Features', 'Integrations', 'Pricing', 'Security'] },
              { title: 'Company',   links: ['About', 'Careers', 'Contact', 'Press'] },
              { title: 'Resources', links: ['Blog', 'Docs', 'Changelog', 'Status'] },
            ].map(col => (
              <div key={col.title}>
                <div style={{ fontSize: '11px', fontWeight: '700', color: '#94A3B8', textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: '18px' }}>
                  {col.title}
                </div>
                {col.links.map(link => (
                  <a key={link} href="#"
                    style={{ display: 'block', fontSize: '14px', color: '#64748B', marginBottom: '11px', textDecoration: 'none', transition: 'color 0.15s' }}
                    onMouseEnter={e => e.currentTarget.style.color = '#F1F5F9'}
                    onMouseLeave={e => e.currentTarget.style.color = '#64748B'}
                  >
                    {link}
                  </a>
                ))}
              </div>
            ))}
          </div>

          {/* Bottom bar */}
          <div style={{ borderTop: '1px solid #1E293B', paddingTop: '26px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '14px' }}>
            <span style={{ fontSize: '13px', color: '#475569' }}>
              © {new Date().getFullYear()} Taskara Inc. All rights reserved.
            </span>
            <div style={{ display: 'flex', gap: '24px' }}>
              {['Privacy Policy', 'Terms of Service', 'Status'].map(l => (
                <a key={l} href="#"
                  style={{ fontSize: '13px', color: '#475569', textDecoration: 'none', transition: 'color 0.15s' }}
                  onMouseEnter={e => e.currentTarget.style.color = '#94A3B8'}
                  onMouseLeave={e => e.currentTarget.style.color = '#475569'}
                >
                  {l}
                </a>
              ))}
            </div>
          </div>
        </div>
      </footer>

    </div>
  );
}
