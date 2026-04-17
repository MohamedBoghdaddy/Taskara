import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { register } from '../api/auth';
import { useAuthStore } from '../store/authStore';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { getDefaultAuthenticatedPath } from '../utils/routing';
import toast from 'react-hot-toast';

export default function RegisterPage() {
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async e => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await register(form);
      setAuth({ user: data.user, accessToken: data.accessToken, refreshToken: data.refreshToken });
      navigate(getDefaultAuthenticatedPath(data.user));
    } catch (err) {
      toast.error(err.response?.data?.error || 'Registration failed');
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <Input label="Name" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Your name" required />
        <Input label="Email" type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} placeholder="you@example.com" required />
        <Input label="Password" type="password" value={form.password} onChange={e => setForm(f => ({ ...f, password: e.target.value }))} placeholder="min 8 characters" minLength={8} required />
        <Button type="submit" disabled={loading} style={{ width: '100%', marginTop: '4px' }}>
          {loading ? 'Creating account...' : 'Create account'}
        </Button>
      </div>
      <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
        Have an account? <Link to="/login" style={{ color: 'var(--primary)', fontWeight: '500' }}>Sign in</Link>
      </p>
    </form>
  );
}
