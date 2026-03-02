import { useTranslation } from 'react-i18next';
import { useAuth } from '../lib/auth-context';
import '../styles/nav.css';

interface NavbarProps {
  onNavigate: (page: string, params?: Record<string, string>) => void;
  currentPage: string;
  showBack?: boolean;
}

export function Navbar({ onNavigate, currentPage, showBack }: NavbarProps) {
  const { user, logout } = useAuth();
  const { t, i18n } = useTranslation();

  const toggleLang = () => {
    i18n.changeLanguage(i18n.language === 'ja' ? 'en' : 'ja');
  };

  return (
    <nav className="site-nav">
      <button className="logo" onClick={() => onNavigate('home')}>
        Trip<span>Local</span>
      </button>

      {showBack ? (
        <button className="nav-back" onClick={() => onNavigate('home')}>
          {t('nav.backToSearch')}
        </button>
      ) : user ? (
        <div className="user-nav">
          <button
            className={`user-nav-link${currentPage === 'home' ? ' active' : ''}`}
            onClick={() => onNavigate('home')}
          >
            {t('nav.accommodations')}
          </button>
          <button
            className={`user-nav-link${currentPage === 'events' ? ' active' : ''}`}
            onClick={() => onNavigate('events')}
          >
            {t('nav.events')}
          </button>
          <button
            className={`user-nav-link${currentPage === 'bookings' ? ' active' : ''}`}
            onClick={() => onNavigate('bookings')}
          >
            {t('nav.myBookings')}
          </button>
          {(user.role === 'OWNER' || user.role === 'ADMIN') && (
            <button
              className={`user-nav-link${currentPage === 'owner-dashboard' ? ' active' : ''}`}
              onClick={() => onNavigate('owner-dashboard')}
            >
              {t('nav.ownerDashboard')}
            </button>
          )}
          {user.role === 'ADMIN' && (
            <button
              className={`user-nav-link${currentPage === 'admin-dashboard' ? ' active' : ''}`}
              onClick={() => onNavigate('admin-dashboard')}
            >
              {t('nav.adminDashboard')}
            </button>
          )}
          <button className="user-nav-link lang-toggle" onClick={toggleLang}>
            {i18n.language === 'ja' ? 'EN' : 'JA'}
          </button>
          <button className="user-nav-link" onClick={logout}>
            {t('nav.logout')}
          </button>
        </div>
      ) : (
        <ul className="nav-links">
          <li>
            <button className="nav-link" onClick={() => onNavigate('home')}>
              {t('nav.accommodations')}
            </button>
          </li>
          <li>
            <button className="nav-link" onClick={() => onNavigate('events')}>
              {t('nav.events')}
            </button>
          </li>
          <li>
            <button className="lang-toggle" onClick={toggleLang}>
              {i18n.language === 'ja' ? 'EN' : 'JA'}
            </button>
          </li>
          <li>
            <button className="nav-cta" onClick={() => onNavigate('login')}>
              {t('nav.login')}
            </button>
          </li>
        </ul>
      )}
    </nav>
  );
}
