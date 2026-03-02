import { useState, useCallback } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './lib/auth-context';
import { Navbar } from './components/Navbar';
import { HomePage } from './pages/HomePage';
import { PropertyDetailPage } from './pages/PropertyDetailPage';
import { AuthPage } from './pages/AuthPage';
import { MyBookingsPage } from './pages/MyBookingsPage';
import './index.css';

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
  | { page: 'bookings' };

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
    }
  };

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Navbar
          onNavigate={(p) => navigate(p)}
          currentPage={pageState.page}
          showBack={pageState.page === 'detail'}
        />
        <main style={{ flex: 1 }}>{renderPage()}</main>
      </AuthProvider>
    </QueryClientProvider>
  );
}
