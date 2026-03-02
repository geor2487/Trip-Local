import { useState, useEffect, useRef, useCallback, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../lib/auth-context';
import '../styles/auth.css';

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: Record<string, unknown>) => void;
          renderButton: (element: HTMLElement, config: Record<string, unknown>) => void;
        };
      };
    };
  }
}

const GOOGLE_CLIENT_ID = '1065554017617-qd5ln80ohjf3bhfafa5os9hrgi0raas3.apps.googleusercontent.com';

interface AuthPageProps {
  mode: 'login' | 'register';
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

export function AuthPage({ mode, onNavigate }: AuthPageProps) {
  const { login, register, googleLogin } = useAuth();
  const { t, i18n } = useTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const googleBtnRef = useRef<HTMLDivElement>(null);

  const isLogin = mode === 'login';

  const handleGoogleResponse = useCallback(async (response: { credential: string }) => {
    setError('');
    setLoading(true);
    try {
      await googleLogin(response.credential);
      onNavigate('home');
    } catch (err: any) {
      setError(err.message || t('auth.defaultError'));
    } finally {
      setLoading(false);
    }
  }, [googleLogin, onNavigate, t]);

  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = () => {
      if (window.google && googleBtnRef.current) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleResponse,
        });
        window.google.accounts.id.renderButton(googleBtnRef.current, {
          theme: 'outline',
          size: 'large',
          width: '100%',
          text: isLogin ? 'signin_with' : 'signup_with',
          locale: i18n.language,
        });
      }
    };
    document.head.appendChild(script);
    return () => { script.remove(); };
  }, [handleGoogleResponse, isLogin, i18n.language]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (isLogin) {
        await login(email, password);
      } else {
        await register(email, password, name);
      }
      onNavigate('home');
    } catch (err: any) {
      setError(err.message || t('auth.defaultError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      {/* Left: Visual */}
      <div className="auth-visual">
        <img
          className="auth-visual-img"
          src="https://images.unsplash.com/photo-1670736990625-ac75a09397cd?w=1200"
          alt=""
        />
        <div className="auth-visual-content">
          <p className="auth-visual-logo">
            Trip<span>Local</span>
          </p>
          <h2 className="auth-visual-title">{t('auth.heroTitle')}</h2>
          <p className="auth-visual-desc">{t('auth.heroDesc')}</p>
        </div>
      </div>

      {/* Right: Form */}
      <div className="auth-form-side">
        <div className="auth-form-wrap">
          <p className="auth-eyebrow">
            {isLogin ? t('auth.eyebrowLogin') : t('auth.eyebrowRegister')}
          </p>
          <h1 className="auth-heading">
            {isLogin ? t('auth.login') : t('auth.register')}
          </h1>
          <p className="auth-subtitle">
            {isLogin ? t('auth.loginSubtitle') : t('auth.registerSubtitle')}
          </p>

          {error && <div className="auth-error">{error}</div>}

          <div ref={googleBtnRef} className="auth-google-btn" />

          <div className="auth-divider">
            <span>{t('auth.orDivider')}</span>
          </div>

          <form onSubmit={handleSubmit} className="auth-form">
            {!isLogin && (
              <div className="auth-field-group">
                <label className="auth-label">{t('auth.name')}</label>
                <input
                  type="text"
                  className="auth-input"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder={t('auth.namePlaceholder')}
                />
              </div>
            )}
            <div className="auth-field-group">
              <label className="auth-label">{t('auth.email')}</label>
              <input
                type="email"
                className="auth-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder={t('auth.emailPlaceholder')}
              />
            </div>
            <div className="auth-field-group">
              <label className="auth-label">{t('auth.password')}</label>
              <input
                type="password"
                className="auth-input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder={t('auth.passwordPlaceholder')}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="auth-submit"
            >
              {loading
                ? t('auth.processing')
                : isLogin ? t('auth.loginButton') : t('auth.registerButton')}
            </button>
          </form>

          <p className="auth-switch">
            {isLogin ? (
              <>
                {t('auth.switchToRegister')}{' '}
                <button
                  className="auth-switch-link"
                  onClick={() => onNavigate('register')}
                >
                  {t('auth.switchToRegisterLink')}
                </button>
              </>
            ) : (
              <>
                {t('auth.switchToLogin')}{' '}
                <button
                  className="auth-switch-link"
                  onClick={() => onNavigate('login')}
                >
                  {t('auth.switchToLoginLink')}
                </button>
              </>
            )}
          </p>

          {isLogin && (
            <div className="auth-test-card">
              <p className="auth-test-label">{t('auth.testAccount')}</p>
              <p className="auth-test-value">test@triplocal.jp / password123</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
