import { useState, type FormEvent } from 'react';
import { useAuth } from '../lib/auth-context';

interface AuthPageProps {
  mode: 'login' | 'register';
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

export function AuthPage({ mode, onNavigate }: AuthPageProps) {
  const { login, register } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const isLogin = mode === 'login';

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
      setError(err.message || 'エラーが発生しました');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-8rem)] flex">
      {/* Left: Image */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <img
          src="https://images.unsplash.com/photo-1590490360182-c33d82de0e5c?w=1200"
          alt="古民家"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-ink/30" />
        <div className="absolute bottom-12 left-12 text-white">
          <h2 className="text-3xl font-bold mb-2">地域とつながる旅</h2>
          <p className="text-white/80">古民家、農家民泊、温泉旅館 —<br />日本の原風景に出会う</p>
        </div>
      </div>

      {/* Right: Form */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-md">
          <h1 className="text-2xl font-bold text-ink mb-2">
            {isLogin ? 'ログイン' : '新規登録'}
          </h1>
          <p className="text-warm-gray mb-8">
            {isLogin
              ? 'アカウントにログインして予約を管理'
              : 'TripLocalで特別な宿泊体験を始めましょう'}
          </p>

          {error && (
            <div className="mb-6 p-3 bg-rust/10 border border-rust/30 rounded-lg text-sm text-rust">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {!isLogin && (
              <div>
                <label className="block text-sm text-ink mb-1.5">お名前</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="山田 太郎"
                  className="w-full px-4 py-2.5 rounded-lg border border-light-border bg-white text-ink placeholder:text-warm-gray/60 focus:outline-none focus:ring-2 focus:ring-moss/30 focus:border-moss"
                />
              </div>
            )}
            <div>
              <label className="block text-sm text-ink mb-1.5">メールアドレス</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="your@email.com"
                className="w-full px-4 py-2.5 rounded-lg border border-light-border bg-white text-ink placeholder:text-warm-gray/60 focus:outline-none focus:ring-2 focus:ring-moss/30 focus:border-moss"
              />
            </div>
            <div>
              <label className="block text-sm text-ink mb-1.5">パスワード</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={8}
                placeholder="8文字以上"
                className="w-full px-4 py-2.5 rounded-lg border border-light-border bg-white text-ink placeholder:text-warm-gray/60 focus:outline-none focus:ring-2 focus:ring-moss/30 focus:border-moss"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-moss text-white rounded-lg font-medium hover:bg-moss/90 transition-colors disabled:opacity-50"
            >
              {loading
                ? '処理中...'
                : isLogin ? 'ログイン' : 'アカウントを作成'}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-warm-gray">
            {isLogin ? (
              <>
                アカウントをお持ちでないですか？{' '}
                <button onClick={() => onNavigate('register')} className="text-moss font-medium hover:underline">
                  新規登録
                </button>
              </>
            ) : (
              <>
                すでにアカウントをお持ちですか？{' '}
                <button onClick={() => onNavigate('login')} className="text-moss font-medium hover:underline">
                  ログイン
                </button>
              </>
            )}
          </p>

          {isLogin && (
            <div className="mt-8 p-4 bg-moss-xlight/30 border border-moss/20 rounded-lg">
              <p className="text-xs text-warm-gray mb-1">テストアカウント</p>
              <p className="text-sm text-ink">test@triplocal.jp / password123</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
