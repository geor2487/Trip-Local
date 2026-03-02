import { useAuth } from '../lib/auth-context';
import '../styles/nav.css';

interface NavbarProps {
  onNavigate: (page: string, params?: Record<string, string>) => void;
  currentPage: string;
  showBack?: boolean;
}

export function Navbar({ onNavigate, currentPage, showBack }: NavbarProps) {
  const { user, logout } = useAuth();

  return (
    <nav className="site-nav">
      <button className="logo" onClick={() => onNavigate('home')}>
        Trip<span>Local</span>
      </button>

      {showBack ? (
        <button className="nav-back" onClick={() => onNavigate('home')}>
          ← 検索結果に戻る
        </button>
      ) : user ? (
        <div className="user-nav">
          <button
            className={`user-nav-link${currentPage === 'home' ? ' active' : ''}`}
            onClick={() => onNavigate('home')}
          >
            宿泊を探す
          </button>
          <button
            className={`user-nav-link${currentPage === 'bookings' ? ' active' : ''}`}
            onClick={() => onNavigate('bookings')}
          >
            マイ予約
          </button>
          <button className="user-nav-link" onClick={logout}>
            ログアウト
          </button>
        </div>
      ) : (
        <ul className="nav-links">
          <li>
            <button className="nav-link" onClick={() => onNavigate('home')}>
              宿泊を探す
            </button>
          </li>
          <li>
            <button className="nav-cta" onClick={() => onNavigate('login')}>
              ログイン
            </button>
          </li>
        </ul>
      )}
    </nav>
  );
}
