'use client';

import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const { login, signup, signInWithGoogle, resetPassword } = useAuth();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
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

  async function handleForgotPassword(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await resetPassword(email);
      setSuccess('Şifre sıfırlama bağlantısı email adresinize gönderildi. Lütfen gelen kutunuzu kontrol edin.');
      setTimeout(() => {
        setShowForgotPassword(false);
        setSuccess('');
      }, 3000);
    } catch (err: any) {
      setError(err.message || 'Şifre sıfırlama emaili gönderilemedi');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      await signInWithGoogle();
    } catch (err: any) {
      setError(err.message || 'Google ile giriş yapılamadı');
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

          {showForgotPassword ? (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              {error && (
                <div className="px-4 py-3 rounded-lg text-sm" style={{
                  backgroundColor: '#FEE2E2',
                  border: '1px solid #FCA5A5',
                  color: '#991B1B'
                }}>
                  {error}
                </div>
              )}

              {success && (
                <div className="px-4 py-3 rounded-lg text-sm" style={{
                  backgroundColor: '#D1FAE5',
                  border: '1px solid #6EE7B7',
                  color: '#065F46'
                }}>
                  {success}
                </div>
              )}

              <div>
                <label htmlFor="reset-email" className="block text-sm font-medium mb-1" style={{ color: 'var(--text-primary)' }}>
                  E-posta
                </label>
                <input
                  id="reset-email"
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

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg font-medium outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                style={{
                  backgroundColor: 'var(--btn-primary-bg)',
                  color: 'var(--btn-primary-text)'
                }}
              >
                {loading ? 'Gönderiliyor...' : 'Şifre Sıfırlama Bağlantısı Gönder'}
              </button>

              <button
                type="button"
                onClick={() => {
                  setShowForgotPassword(false);
                  setError('');
                  setSuccess('');
                }}
                className="w-full py-2 text-sm"
                style={{ color: 'var(--text-muted)' }}
              >
                ← Giriş sayfasına dön
              </button>
            </form>
          ) : (
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
              {isLogin && (
                <div className="mt-2 text-right">
                  <button
                    type="button"
                    onClick={() => setShowForgotPassword(true)}
                    className="text-sm hover:underline"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    Şifremi Unuttum
                  </button>
                </div>
              )}
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

            {/* Ayırıcı */}
            <div className="relative flex items-center justify-center my-4">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t" style={{ borderColor: 'var(--border-light)' }}></div>
              </div>
              <div className="relative px-4" style={{ 
                backgroundColor: 'var(--bg-card)',
                color: 'var(--text-muted)',
                fontSize: '0.875rem'
              }}>
                veya
              </div>
            </div>

            {/* Google ile Giriş Butonu */}
            <button
              type="button"
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full py-3 rounded-lg font-medium outline-none disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-3 hover:shadow-md"
              style={{
                backgroundColor: '#FFFFFF',
                color: '#1F2937',
                border: '1px solid #E5E7EB'
              }}
            >
              <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
                <g fill="none" fillRule="evenodd">
                  <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 01-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
                  <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 009 18z" fill="#34A853"/>
                  <path d="M3.964 10.71A5.41 5.41 0 013.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 000 9c0 1.452.348 2.827.957 4.042l3.007-2.332z" fill="#FBBC05"/>
                  <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 00.957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
                </g>
              </svg>
              <span>Google ile {isLogin ? 'Giriş Yap' : 'Kayıt Ol'}</span>
            </button>
          </form>
          )}
        </div>
      </div>
    </div>
  );
}

