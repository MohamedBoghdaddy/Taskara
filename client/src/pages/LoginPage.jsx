import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { login } from '../api/auth';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { useAuthStore } from '../store/authStore';
import { getDefaultAuthenticatedPath } from '../utils/routing';

export default function LoginPage() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const { setAuth } = useAuthStore();
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      const data = await login(form);
      setAuth({
        user: data.user,
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
      });
      navigate(getDefaultAuthenticatedPath(data.user));
    } catch (error) {
      toast.error(error.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <Input
          label="Email"
          type="email"
          value={form.email}
          onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))}
          placeholder="you@example.com"
          required
        />
        <Input
          label="Password"
          type="password"
          value={form.password}
          onChange={(event) => setForm((current) => ({ ...current, password: event.target.value }))}
          placeholder="Enter your password"
          required
        />
        <Button type="submit" disabled={loading} style={{ width: '100%', marginTop: '4px' }}>
          {loading ? 'Signing in...' : 'Sign in'}
        </Button>
      </div>
      <p style={{ textAlign: 'center', color: 'var(--text-secondary)', fontSize: '14px' }}>
        No account?{' '}
        <Link to="/register" style={{ color: 'var(--primary)', fontWeight: '500' }}>
          Create one
        </Link>
      </p>
    </form>
  );
}
