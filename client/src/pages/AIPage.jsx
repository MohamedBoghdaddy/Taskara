import React, { useState, useEffect, useRef } from 'react';
import { aiAnswer, aiPlanToday } from '../api/index';
import { getTodayTasks } from '../api/tasks';
import Button from '../components/common/Button';
import toast from 'react-hot-toast';

export default function AIPage() {
  const [messages, setMessages] = useState([{ role: 'assistant', text: 'Hi! I can answer questions about your workspace, help you plan your day, or discuss your notes and tasks. What do you need?' }]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('qa');
  const bottomRef = useRef();

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    const question = input.trim();
    setMessages(m => [...m, { role: 'user', text: question }]);
    setInput(''); setLoading(true);
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
    } catch { setMessages(m => [...m, { role: 'assistant', text: 'Could not plan — AI unavailable.', error: true }]); }
    setLoading(false);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', maxWidth: '780px', margin: '0 auto', padding: '0 24px' }}>
      <div style={{ padding: '24px 0 16px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '20px', fontWeight: '700' }}>✨ AI Assistant</h1>
        <div style={{ display: 'flex', gap: '8px' }}>
          {[['qa','Workspace Q&A'],['plan','Plan Day']].map(([m, l]) => (
            <button key={m} onClick={() => setMode(m)} style={{ padding: '6px 14px', border: 'none', borderRadius: '20px', cursor: 'pointer', fontSize: '13px', background: mode === m ? 'var(--primary)' : 'var(--surface-alt)', color: mode === m ? '#fff' : 'var(--text-secondary)', fontWeight: mode === m ? '600' : '400' }}>{l}</button>
          ))}
        </div>
      </div>

      {/* Quick actions */}
      <div style={{ display: 'flex', gap: '8px', padding: '12px 0', flexWrap: 'wrap' }}>
        {['What are my key notes?', 'Summarize my projects', 'What should I focus on?'].map(q => (
          <button key={q} onClick={() => { setInput(q); }} style={{ padding: '6px 12px', border: '1px solid var(--border)', borderRadius: '20px', background: 'var(--surface)', color: 'var(--text-secondary)', fontSize: '13px', cursor: 'pointer' }}>{q}</button>
        ))}
        <button onClick={handlePlanDay} disabled={loading} style={{ padding: '6px 12px', border: '1px solid var(--primary)', borderRadius: '20px', background: 'var(--primary-soft)', color: 'var(--primary)', fontSize: '13px', cursor: 'pointer', fontWeight: '500' }}>☀️ Plan my day</button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '16px' }}>
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start' }}>
            <div style={{ maxWidth: '80%', padding: '12px 16px', borderRadius: m.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px', background: m.role === 'user' ? 'var(--primary)' : 'var(--surface)', color: m.role === 'user' ? '#fff' : m.error ? 'var(--error)' : 'var(--text-primary)', fontSize: '14px', lineHeight: 1.6, border: m.role === 'user' ? 'none' : '1px solid var(--border)', whiteSpace: 'pre-wrap' }}>
              {m.aiGenerated && <div style={{ fontSize: '10px', color: m.role === 'user' ? 'rgba(255,255,255,0.7)' : 'var(--primary)', fontWeight: '600', marginBottom: '4px', letterSpacing: '0.5px' }}>AI GENERATED</div>}
              {m.text}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div style={{ padding: '12px 16px', borderRadius: '16px 16px 16px 4px', background: 'var(--surface)', border: '1px solid var(--border)', color: 'var(--text-muted)', fontSize: '14px' }}>
              AI is thinking<span style={{ animation: 'blink 1s infinite' }}>...</span>
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div style={{ borderTop: '1px solid var(--border)', padding: '16px 0 24px' }}>
        <form onSubmit={handleSend} style={{ display: 'flex', gap: '8px' }}>
          <input value={input} onChange={e => setInput(e.target.value)} placeholder={mode === 'qa' ? 'Ask anything about your workspace...' : 'Ask about your day...'}
            style={{ flex: 1, padding: '12px 16px', border: '1px solid var(--border)', borderRadius: '24px', background: 'var(--surface)', color: 'var(--text-primary)', fontSize: '14px', outline: 'none' }}
            onFocus={e => e.currentTarget.style.borderColor = 'var(--primary)'}
            onBlur={e => e.currentTarget.style.borderColor = 'var(--border)'}
          />
          <Button type="submit" disabled={loading || !input.trim()} style={{ borderRadius: '24px', padding: '12px 20px' }}>Send</Button>
        </form>
      </div>
    </div>
  );
}
