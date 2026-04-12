import React, { useState, useEffect, useRef } from 'react';
import { aiAnswer, aiPlanToday } from '../api/index';
import { getTodayTasks } from '../api/tasks';
import Button from '../components/common/Button';
import FeatureGuide from '../components/common/FeatureGuide';
import Tooltip from '../components/common/Tooltip';
import {
  AIIcon,
  BrainIcon,
  TodayIcon,
  TaskIcon,
  SendIcon,
  SparkIcon,
  LightbulbIcon,
  WandIcon,
  SearchIcon,
} from '../components/common/Icons';
import toast from 'react-hot-toast';

export default function AIPage() {
  const [messages, setMessages] = useState([
    { role: 'assistant', text: 'Hi! I can answer questions about your workspace, help you plan your day, or discuss your notes and tasks. What do you need?' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('qa');
  const bottomRef = useRef();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const question = input.trim();
    setMessages(m => [...m, { role: 'user', text: question }]);
    setInput('');
    setLoading(true);
    try {
      if (mode === 'qa') {
        const r = await aiAnswer({ question });
        setMessages(m => [...m, { role: 'assistant', text: r.answer, aiGenerated: true }]);
      } else {
        const tasks = await getTodayTasks();
        const r = await aiPlanToday({ tasks });
        setMessages(m => [...m, { role: 'assistant', text: r.plan, aiGenerated: true }]);
      }
    } catch (e) {
      const msg = e.response?.data?.error || 'AI is unavailable. Check your GEMINI_API_KEY.';
      setMessages(m => [...m, { role: 'assistant', text: msg, error: true }]);
    }
    setLoading(false);
  };

  const handlePlanDay = async () => {
    setLoading(true);
    setMessages(m => [...m, { role: 'user', text: 'Plan my day based on my tasks.' }]);
    try {
      const tasks = await getTodayTasks();
      const r = await aiPlanToday({ tasks });
      setMessages(m => [...m, { role: 'assistant', text: r.plan, aiGenerated: true }]);
    } catch {
      setMessages(m => [...m, { role: 'assistant', text: 'Could not plan — AI unavailable.', error: true }]);
    }
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', maxWidth: '780px', margin: '0 auto', padding: '0 24px' }}>
      <FeatureGuide
        storageKey="ai-guide"
        title="AI Assistant"
        icon={<AIIcon />}
        description="Your AI assistant is powered by Gemini and can answer questions about your entire workspace — notes, tasks, and projects — or help you plan your day."
        steps={[
          {
            icon: <SearchIcon />,
            title: 'Workspace Q&A',
            body: 'Switch to the "Workspace Q&A" mode and ask anything: "What are my open tasks?" or "Summarise my project notes."',
          },
          {
            icon: <TodayIcon />,
            title: 'Plan My Day',
            body: 'Switch to "Plan Day" mode or click the quick action button. The AI reads today\'s tasks and generates a prioritised schedule.',
          },
          {
            icon: <SparkIcon />,
            title: 'Quick prompts',
            body: 'Use the suggestion chips below the header to send common questions with a single click.',
          },
          {
            icon: <BrainIcon />,
            title: 'AI suggestions',
            body: 'Responses tagged "AI GENERATED" are synthesised from your actual workspace data — not generic advice.',
          },
        ]}
        tips={[
          'Ask "What should I focus on today?" for a prioritised task list',
          'Ask "Summarise my projects" to get a high-level overview',
          'The AI uses your notes content — keep notes well-titled for better answers',
          'If the AI is unavailable, check that GEMINI_API_KEY is set on the server',
        ]}
        accentColor="var(--primary)"
      />

      <div style={{ padding: '24px 0 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <AIIcon /> AI Assistant
        </h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[['qa', 'Workspace Q&A', <SearchIcon />], ['plan', 'Plan Day', <TodayIcon />]].map(([m, l, icon]) => (
            <Tooltip key={m} content={l} placement="bottom">
              <button
                onClick={() => setMode(m)}
                style={{ padding: '6px 14px', border: 'none', borderRadius: '20px', cursor: 'pointer', fontSize: '13px', background: mode === m ? 'var(--primary)' : 'var(--surface-alt)', color: mode === m ? '#fff' : 'var(--text-secondary)', fontWeight: mode === m ? '600' : '400', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
              >
                {icon} {l}
              </button>
            </Tooltip>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ display: 'flex', gap: '8px', padding: '12px 0', flexWrap: 'wrap' }}>
        {['What are my key notes?', 'Summarize my projects', 'What should I focus on?'].map(q => (
          <Tooltip key={q} content="Click to pre-fill this question" placement="top">
            <button
              onClick={() => setInput(q)}
              style={{ padding: '6px 12px', border: '1px solid var(--border)', borderRadius: '20px', background: 'var(--surface)', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
            >
              <LightbulbIcon size="xs" /> {q}
            </button>
          </Tooltip>
        ))}
        <Tooltip content="Let AI plan your day from today's tasks" placement="top">
          <button
            onClick={handlePlanDay}
            disabled={loading}
            style={{ padding: '6px 12px', border: '1px solid var(--primary)', borderRadius: '20px', background: 'var(--primary-soft)', color: 'var(--primary)', fontSize: '13px', cursor: 'pointer', fontWeight: '500', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
          >
            <WandIcon size="xs" /> Plan my day
          </button>
        </Tooltip>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '16px' }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{ maxWidth: '80%', padding: '12px 16px', borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: m.role === 'user' ? 'var(--primary)' : 'var(--surface)', color: m.role === 'user' ? '#fff' : m.error ? 'var(--error)' : 'var(--text-primary)', fontSize: '14px', lineHeight: 1.6, border: m.role === 'user' ? 'none' : '1px solid var(--border)', whiteSpace: 'pre-wrap' }}>
              {m.aiGenerated && (
                <div style={{ fontSize: '10px', color: m.role === 'user' ? 'rgba(255,255,255,0.7)' : 'var(--primary)', fontWeight: '600', marginBottom: '4px', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <SparkIcon size="xs" /> AI GENERATED
                </div>
              )}
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ padding: '12px 16px', borderRadius: '16px 16px 16px 4px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AIIcon size="xs" /> AI is thinking<span style={{ animation: 'blink 1s infinite' }}>...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ borderTop: '1px solid var(--border)', padding: '16px 0 24px' }}>
        <form onSubmit={handleSend} style={{ display: 'flex', gap: '8px' }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            placeholder={mode === 'qa' ? 'Ask anything about your workspace...' : 'Ask about your day...'}
            style={{ flex: 1, padding: '12px 16px', border: '1px solid var(--border)', borderRadius: '24px', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' }}
            onFocus={e => e.currentTarget.style.borderColor = 'var(--primary)'}
            onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
          />
          <Tooltip content="Send message" placement="top">
            <Button type="submit" disabled={loading || !input.trim()} style={{ borderRadius: '24px', padding: '12px 20px', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <SendIcon /> Send
            </Button>
          </Tooltip>
        </form>
      </div>
    </div>
  );
}
