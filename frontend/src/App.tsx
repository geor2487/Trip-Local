import { useState, useCallback, lazy, Suspense } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
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

type PageState =
  | { page: 'home'; search?: Record<string, string> }
  | { page: 'detail'; id: string }
  | { page: 'login' }
  | { page: 'register' }
  | { page: 'bookings' }
  | { page: 'events'; search?: Record<string, string> }
  | { page: 'event-detail'; id: string }
  | { page: 'owner-dashboard' }
  | { page: 'admin-dashboard' };

export default function App() {
  const [pageState, setPageState] = useState<PageState>({ page: 'home' });

  const navigate = useCallback((page: string, params?: Record<string, string>) => {
    window.scrollTo(0, 0);
    switch (page) {
      case 'home':
        setPageState({ page: 'home', search: params });
        break;
      case 'detail':
        setPageState({ page: 'detail', id: params!.id });
        break;
      case 'login':
        setPageState({ page: 'login' });
        break;
      case 'register':
        setPageState({ page: 'register' });
        break;
      case 'bookings':
        setPageState({ page: 'bookings' });
        break;
      case 'events':
        setPageState({ page: 'events', search: params });
        break;
      case 'event-detail':
        setPageState({ page: 'event-detail', id: params!.id });
        break;
      case 'owner-dashboard':
        setPageState({ page: 'owner-dashboard' });
        break;
      case 'admin-dashboard':
        setPageState({ page: 'admin-dashboard' });
        break;
      default:
        setPageState({ page: 'home' });
    }
  }, []);

  const renderPage = () => {
    switch (pageState.page) {
      case 'home':
        return <HomePage onNavigate={navigate} searchParams={pageState.search} />;
      case 'detail':
        return <PropertyDetailPage id={pageState.id} onNavigate={navigate} />;
      case 'login':
        return <AuthPage mode="login" onNavigate={navigate} />;
      case 'register':
        return <AuthPage mode="register" onNavigate={navigate} />;
      case 'bookings':
        return <MyBookingsPage onNavigate={navigate} />;
      case 'events':
        return <EventsPage onNavigate={navigate} searchParams={pageState.search} />;
      case 'event-detail':
        return <EventDetailPage id={pageState.id} onNavigate={navigate} />;
      case 'owner-dashboard':
        return <OwnerDashboardPage onNavigate={navigate} />;
      case 'admin-dashboard':
        return <AdminDashboardPage onNavigate={navigate} />;
    }
  };

  const showBack = pageState.page === 'detail' || pageState.page === 'event-detail';

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Navbar
          onNavigate={(p) => navigate(p)}
          currentPage={pageState.page}
          showBack={showBack}
        />
        <main style={{ flex: 1 }}>
          <Suspense fallback={<div style={{ padding: '4rem', textAlign: 'center', color: 'var(--warm-gray)' }}>読み込み中...</div>}>
            {renderPage()}
          </Suspense>
        </main>
      </AuthProvider>
    </QueryClientProvider>
  );
}
