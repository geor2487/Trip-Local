import { useCallback, lazy, Suspense } from 'react';
import { Routes, Route, useNavigate, useLocation, useParams, useSearchParams, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AuthProvider } from './lib/auth-context';
import { Navbar } from './components/Navbar';
import { HomePage } from './pages/HomePage';
import { PropertyDetailPage } from './pages/PropertyDetailPage';
import { AuthPage } from './pages/AuthPage';
import { MyBookingsPage } from './pages/MyBookingsPage';
import './index.css';

const EventsPage = lazy(() => import('./pages/EventsPage').then(m => ({ default: m.EventsPage })));
const EventDetailPage = lazy(() => import('./pages/EventDetailPage').then(m => ({ default: m.EventDetailPage })));
const OwnerDashboardPage = lazy(() => import('./pages/OwnerDashboardPage').then(m => ({ default: m.OwnerDashboardPage })));
const AdminDashboardPage = lazy(() => import('./pages/AdminDashboardPage').then(m => ({ default: m.AdminDashboardPage })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: 1, staleTime: 30_000 },
  },
});

// ── ページ名 → URL パスのマッピング ──
function pageToPath(page: string, params?: Record<string, string>): string {
  switch (page) {
    case 'home':             return '/';
    case 'detail':           return `/properties/${params!.id}`;
    case 'login':            return '/login';
    case 'register':         return '/register';
    case 'bookings':         return '/bookings';
    case 'events':           return '/events';
    case 'event-detail':     return `/events/${params!.id}`;
    case 'owner-dashboard':  return '/owner';
    case 'admin-dashboard':  return '/admin';
    default:                 return '/';
  }
}

// ── URL パス → currentPage 名のマッピング ──
function pathToPage(pathname: string): string {
  if (pathname === '/') return 'home';
  if (pathname.startsWith('/properties/')) return 'detail';
  if (pathname === '/login') return 'login';
  if (pathname === '/register') return 'register';
  if (pathname === '/bookings') return 'bookings';
  if (/^\/events\/[^/]+$/.test(pathname)) return 'event-detail';
  if (pathname === '/events') return 'events';
  if (pathname === '/owner') return 'owner-dashboard';
  if (pathname === '/admin') return 'admin-dashboard';
  return 'home';
}

// ── Route ラッパー（URL パラメータを props に変換） ──

function HomeRoute({ onNavigate }: { onNavigate: (page: string, params?: Record<string, string>) => void }) {
  const [searchParams] = useSearchParams();
  const params = Object.fromEntries(searchParams.entries());
  return <HomePage onNavigate={onNavigate} searchParams={Object.keys(params).length > 0 ? params : undefined} />;
}

function PropertyDetailRoute({ onNavigate }: { onNavigate: (page: string, params?: Record<string, string>) => void }) {
  const { id } = useParams();
  return <PropertyDetailPage id={id!} onNavigate={onNavigate} />;
}

function EventsRoute({ onNavigate }: { onNavigate: (page: string, params?: Record<string, string>) => void }) {
  const [searchParams] = useSearchParams();
  const params = Object.fromEntries(searchParams.entries());
  return <EventsPage onNavigate={onNavigate} searchParams={Object.keys(params).length > 0 ? params : undefined} />;
}

function EventDetailRoute({ onNavigate }: { onNavigate: (page: string, params?: Record<string, string>) => void }) {
  const { id } = useParams();
  return <EventDetailPage id={id!} onNavigate={onNavigate} />;
}

// ── App ──

export default function App() {
  const { t } = useTranslation();
  const nav = useNavigate();
  const location = useLocation();

  const navigate = useCallback((page: string, params?: Record<string, string>) => {
    window.scrollTo(0, 0);
    nav(pageToPath(page, params));
  }, [nav]);

  const currentPage = pathToPage(location.pathname);
  const showBack = currentPage === 'detail' || currentPage === 'event-detail';

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Navbar
          onNavigate={navigate}
          currentPage={currentPage}
          showBack={showBack}
        />
        <main style={{ flex: 1 }}>
          <Suspense fallback={<div style={{ padding: '4rem', textAlign: 'center', color: 'var(--warm-gray)' }}>{t('common.loading')}</div>}>
            <Routes>
              <Route path="/" element={<HomeRoute onNavigate={navigate} />} />
              <Route path="/properties/:id" element={<PropertyDetailRoute onNavigate={navigate} />} />
              <Route path="/login" element={<AuthPage mode="login" onNavigate={navigate} />} />
              <Route path="/register" element={<AuthPage mode="register" onNavigate={navigate} />} />
              <Route path="/bookings" element={<MyBookingsPage onNavigate={navigate} />} />
              <Route path="/events" element={<EventsRoute onNavigate={navigate} />} />
              <Route path="/events/:id" element={<EventDetailRoute onNavigate={navigate} />} />
              <Route path="/owner" element={<OwnerDashboardPage onNavigate={navigate} />} />
              <Route path="/admin" element={<AdminDashboardPage onNavigate={navigate} />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Suspense>
        </main>
      </AuthProvider>
    </QueryClientProvider>
  );
}
