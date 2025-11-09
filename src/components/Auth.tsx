'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, signup } = useAuth();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await signup(email, password);
      }
    } catch (err: any) {
      setError(err.message || 'Bir hata oluştu');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8" style={{ backgroundColor: 'var(--bg-main)' }}>
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <h1 className="text-4xl font-bold mb-2" style={{ color: 'var(--text-primary)' }}>
            Lexi
          </h1>
          <p style={{ color: 'var(--text-muted)' }}>
            Kelime Tekrar Uygulaması
          </p>
        </div>

        <div className="rounded-2xl p-8" style={{ 
          backgroundColor: 'var(--bg-card)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
        }}>
          <div className="flex mb-6 rounded-lg p-1" style={{ backgroundColor: 'var(--btn-secondary-bg)' }}>
            <button
              type="button"
              onClick={() => setIsLogin(true)}
              className="flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all"
              style={{
                backgroundColor: isLogin ? 'var(--bg-card)' : 'transparent',
                color: isLogin ? 'var(--text-primary)' : 'var(--text-secondary)',
                boxShadow: isLogin ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              Giriş Yap
            </button>
            <button
              type="button"
              onClick={() => setIsLogin(false)}
              className="flex-1 py-2 px-4 rounded-md text-sm font-medium transition-all"
              style={{
                backgroundColor: !isLogin ? 'var(--bg-card)' : 'transparent',
                color: !isLogin ? 'var(--text-primary)' : 'var(--text-secondary)',
                boxShadow: !isLogin ? '0 1px 3px rgba(0,0,0,0.1)' : 'none'
              }}
            >
              Kayıt Ol
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="px-4 py-3 rounded-lg text-sm" style={{
                backgroundColor: '#FEE2E2',
                border: '1px solid #FCA5A5',
                color: '#991B1B'
              }}>
                {error}
              </div>
            )}

            <div>
              <label htmlFor="email" className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                E-posta
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg outline-none transition-all"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-light)',
                  color: 'var(--text-primary)'
                }}
                placeholder="ornek@email.com"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                Şifre
              </label>
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="w-full px-4 py-3 rounded-lg outline-none transition-all"
                style={{
                  backgroundColor: 'var(--bg-card)',
                  border: '1px solid var(--border-light)',
                  color: 'var(--text-primary)'
                }}
                placeholder="••••••••"
                minLength={6}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-lg font-medium outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              style={{
                backgroundColor: 'var(--btn-primary-bg)',
                color: 'var(--btn-primary-text)'
              }}
            >
              {loading ? 'Yükleniyor...' : isLogin ? 'Giriş Yap' : 'Kayıt Ol'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}

