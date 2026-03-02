import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { adminApi } from '../lib/api';
import { useAuth } from '../lib/auth-context';
import { tPrefecture, tCity, tName, tEventTitle } from '../lib/content-i18n';
import '../styles/admin.css';

// ---------- Types ----------

interface AdminDashboardPageProps {
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

interface AdminStats {
  users: number;
  accommodations: number;
  events: number;
  bookings: number;
  revenue: number;
  byStatus: Record<string, number>;
}

interface User {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  createdAt: string;
}

interface Accommodation {
  id: string;
  name: string;
  status: string;
  city: string;
  prefecture: string;
  owner: { id: string; name: string };
}

interface Event {
  id: string;
  title: string;
  status: string;
  date: string;
  capacity: number;
  registrationCount: number;
  organizer: { id: string; name: string };
}

interface Booking {
  id: string;
  checkIn: string;
  checkOut: string;
  status: string;
  totalPrice: number;
  guest: { id: string; name: string };
  accommodation: { id: string; name: string };
}

// ---------- Constants ----------

type TabKey = 'users' | 'accommodations' | 'events' | 'bookings';

const TAB_KEYS: { key: TabKey; labelKey: string }[] = [
  { key: 'users', labelKey: 'admin.tabs.users' },
  { key: 'accommodations', labelKey: 'admin.tabs.accommodations' },
  { key: 'events', labelKey: 'admin.tabs.events' },
  { key: 'bookings', labelKey: 'admin.tabs.bookings' },
];

const ROLE_OPTIONS = ['USER', 'OWNER', 'ORGANIZER', 'ADMIN'];

const ACCOMMODATION_STATUS_OPTIONS = [
  'PENDING_REVIEW',
  'PUBLISHED',
  'SUSPENDED',
  'REJECTED',
];

const STATUS_BADGE_CLS: Record<string, string> = {
  // Green
  PUBLISHED:  'badge-green',
  CONFIRMED:  'badge-green',
  SUCCEEDED:  'badge-green',
  ACTIVE:     'badge-green',
  // Amber
  PENDING:         'badge-amber',
  PENDING_REVIEW:  'badge-amber',
  DRAFT:           'badge-amber',
  // Red
  CANCELLED:  'badge-red',
  SUSPENDED:  'badge-red',
  FAILED:     'badge-red',
  REJECTED:   'badge-red',
  // Gray / Blue
  COMPLETED:  'badge-blue',
  REFUNDED:   'badge-gray',
};

const PAGE_SIZE = 10;

// ---------- Helpers ----------

function formatCurrency(n: number) {
  return `¥${n.toLocaleString()}`;
}

// ---------- Sub-components ----------

function PaginationBar({
  pagination,
  onPageChange,
}: {
  pagination: Pagination | undefined;
  onPageChange: (page: number) => void;
}) {
  const { t } = useTranslation();

  if (!pagination || pagination.totalPages <= 1) return null;

  const { page, totalPages, total, limit } = pagination;
  const start = (page - 1) * limit + 1;
  const end = Math.min(page * limit, total);

  const pages: number[] = [];
  const maxVisible = 5;
  let startPage = Math.max(1, page - Math.floor(maxVisible / 2));
  const endPage = Math.min(totalPages, startPage + maxVisible - 1);
  if (endPage - startPage + 1 < maxVisible) {
    startPage = Math.max(1, endPage - maxVisible + 1);
  }
  for (let i = startPage; i <= endPage; i++) pages.push(i);

  return (
    <div className="admin-pagination">
      <span className="admin-pagination-info">
        {t('admin.pagination.showing', { total, start, end })}
      </span>
      <div className="admin-pagination-btns">
        <button
          className="page-btn"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          {t('admin.pagination.previous')}
        </button>
        {pages.map((p) => (
          <button
            key={p}
            className={`page-btn${p === page ? ' active' : ''}`}
            onClick={() => onPageChange(p)}
          >
            {p}
          </button>
        ))}
        <button
          className="page-btn"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          {t('admin.pagination.next')}
        </button>
      </div>
    </div>
  );
}

// ---------- Users Tab ----------

function UsersTab() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [confirmTarget, setConfirmTarget] = useState<User | null>(null);

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString(i18n.language, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }

  function statusBadge(status: string) {
    const cls = STATUS_BADGE_CLS[status] || 'badge-gray';
    const label = t(`admin.statuses.${status}`, { defaultValue: status });
    return <span className={`admin-badge ${cls}`}>{label}</span>;
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'users', page],
    queryFn: () =>
      adminApi.users({ page: String(page), limit: String(PAGE_SIZE) }),
  });

  const roleMutation = useMutation({
    mutationFn: ({ id, role }: { id: string; role: string }) =>
      adminApi.updateUserRole(id, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
  });

  const deactivateMutation = useMutation({
    mutationFn: (id: string) => adminApi.deactivateUser(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setConfirmTarget(null);
    },
  });

  if (isLoading) return <div className="admin-loading">{t('common.loading')}</div>;
  if (error) return <div className="admin-error">{t('admin.users.fetchError')}</div>;

  const users: User[] = data?.data ?? [];
  const pagination: Pagination | undefined = data?.pagination;

  return (
    <>
      {users.length === 0 ? (
        <div className="admin-empty">{t('admin.users.notFound')}</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('admin.users.name')}</th>
                <th>{t('admin.users.email')}</th>
                <th>{t('admin.users.role')}</th>
                <th>{t('admin.users.status')}</th>
                <th>{t('admin.users.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{tName(u.name, i18n.language)}</td>
                  <td className="cell-email">{u.email}</td>
                  <td>
                    <select
                      className="admin-select"
                      value={u.role}
                      disabled={roleMutation.isPending}
                      onChange={(e) =>
                        roleMutation.mutate({ id: u.id, role: e.target.value })
                      }
                    >
                      {ROLE_OPTIONS.map((r) => (
                        <option key={r} value={r}>
                          {t(`admin.roles.${r}`, { defaultValue: r })}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <span className="active-dot" />
                    <span
                      className={`active-dot ${u.isActive ? 'is-active' : 'is-inactive'}`}
                    />
                    {u.isActive ? t('admin.users.active') : t('admin.users.inactive')}
                  </td>
                  <td>
                    {u.isActive && (
                      <button
                        className="admin-btn admin-btn-danger admin-btn-sm"
                        onClick={() => setConfirmTarget(u)}
                        disabled={deactivateMutation.isPending}
                      >
                        {t('admin.users.deactivate')}
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <PaginationBar pagination={pagination} onPageChange={setPage} />
        </div>
      )}

      {confirmTarget && (
        <div
          className="admin-confirm-overlay"
          onClick={() => setConfirmTarget(null)}
        >
          <div className="admin-confirm" onClick={(e) => e.stopPropagation()}>
            <h3>{t('admin.users.deactivateTitle')}</h3>
            <p>
              {t('admin.users.deactivateConfirm', { name: tName(confirmTarget.name, i18n.language), email: confirmTarget.email })}
            </p>
            <div className="admin-confirm-actions">
              <button
                className="confirm-cancel"
                onClick={() => setConfirmTarget(null)}
              >
                {t('common.cancel')}
              </button>
              <button
                className="confirm-action"
                disabled={deactivateMutation.isPending}
                onClick={() => deactivateMutation.mutate(confirmTarget.id)}
              >
                {deactivateMutation.isPending ? t('admin.users.processing') : t('admin.users.deactivateAction')}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ---------- Accommodations Tab ----------

function AccommodationsTab() {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  function statusBadge(status: string) {
    const cls = STATUS_BADGE_CLS[status] || 'badge-gray';
    const label = t(`admin.statuses.${status}`, { defaultValue: status });
    return <span className={`admin-badge ${cls}`}>{label}</span>;
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'accommodations', page],
    queryFn: () =>
      adminApi.accommodations({
        page: String(page),
        limit: String(PAGE_SIZE),
      }),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      adminApi.updateAccommodationStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'accommodations'] });
      queryClient.invalidateQueries({ queryKey: ['admin', 'stats'] });
    },
  });

  if (isLoading) return <div className="admin-loading">{t('common.loading')}</div>;
  if (error) return <div className="admin-error">{t('admin.accommodations.fetchError')}</div>;

  const accommodations: Accommodation[] = data?.data ?? [];
  const pagination: Pagination | undefined = data?.pagination;

  return (
    <>
      {accommodations.length === 0 ? (
        <div className="admin-empty">{t('admin.accommodations.notFound')}</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('admin.accommodations.name')}</th>
                <th>{t('admin.accommodations.owner')}</th>
                <th>{t('admin.accommodations.status')}</th>
                <th>{t('admin.accommodations.area')}</th>
              </tr>
            </thead>
            <tbody>
              {accommodations.map((a) => (
                <tr key={a.id}>
                  <td>{tName(a.name, i18n.language)}</td>
                  <td>{a.owner?.name ? tName(a.owner.name, i18n.language) : '-'}</td>
                  <td>
                    <select
                      className="admin-select"
                      value={a.status}
                      disabled={statusMutation.isPending}
                      onChange={(e) =>
                        statusMutation.mutate({
                          id: a.id,
                          status: e.target.value,
                        })
                      }
                    >
                      {ACCOMMODATION_STATUS_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {t(`admin.statuses.${s}`, { defaultValue: s })}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    {tPrefecture(a.prefecture, i18n.language)} {tCity(a.city, i18n.language)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <PaginationBar pagination={pagination} onPageChange={setPage} />
        </div>
      )}
    </>
  );
}

// ---------- Events Tab ----------

function EventsTab() {
  const { t, i18n } = useTranslation();
  const [page, setPage] = useState(1);

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString(i18n.language, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }

  function statusBadge(status: string) {
    const cls = STATUS_BADGE_CLS[status] || 'badge-gray';
    const label = t(`admin.statuses.${status}`, { defaultValue: status });
    return <span className={`admin-badge ${cls}`}>{label}</span>;
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'events', page],
    queryFn: () =>
      adminApi.events({ page: String(page), limit: String(PAGE_SIZE) }),
  });

  if (isLoading) return <div className="admin-loading">{t('common.loading')}</div>;
  if (error) return <div className="admin-error">{t('admin.eventsTab.fetchError')}</div>;

  const events: Event[] = data?.data ?? [];
  const pagination: Pagination | undefined = data?.pagination;

  return (
    <>
      {events.length === 0 ? (
        <div className="admin-empty">{t('admin.eventsTab.notFound')}</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('admin.eventsTab.title')}</th>
                <th>{t('admin.eventsTab.organizer')}</th>
                <th>{t('admin.eventsTab.status')}</th>
                <th>{t('admin.eventsTab.date')}</th>
                <th>{t('admin.eventsTab.capacity')}</th>
                <th>{t('admin.eventsTab.registrations')}</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <tr key={ev.id}>
                  <td>{tEventTitle(ev.title, i18n.language)}</td>
                  <td>{ev.organizer?.name ? tName(ev.organizer.name, i18n.language) : '-'}</td>
                  <td>{statusBadge(ev.status)}</td>
                  <td>{formatDate(ev.date)}</td>
                  <td>{ev.capacity}{t('admin.eventsTab.peopleSuffix')}</td>
                  <td>{ev.registrationCount}{t('admin.eventsTab.peopleSuffix')}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <PaginationBar pagination={pagination} onPageChange={setPage} />
        </div>
      )}
    </>
  );
}

// ---------- Bookings Tab ----------

function BookingsTab() {
  const { t, i18n } = useTranslation();
  const [page, setPage] = useState(1);

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    return d.toLocaleDateString(i18n.language, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  }

  function statusBadge(status: string) {
    const cls = STATUS_BADGE_CLS[status] || 'badge-gray';
    const label = t(`admin.statuses.${status}`, { defaultValue: status });
    return <span className={`admin-badge ${cls}`}>{label}</span>;
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'bookings', page],
    queryFn: () =>
      adminApi.bookings({ page: String(page), limit: String(PAGE_SIZE) }),
  });

  if (isLoading) return <div className="admin-loading">{t('common.loading')}</div>;
  if (error) return <div className="admin-error">{t('admin.bookingsTab.fetchError')}</div>;

  const bookings: Booking[] = data?.data ?? [];
  const pagination: Pagination | undefined = data?.pagination;

  return (
    <>
      {bookings.length === 0 ? (
        <div className="admin-empty">{t('admin.bookingsTab.notFound')}</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>{t('admin.bookingsTab.guest')}</th>
                <th>{t('admin.bookingsTab.accommodation')}</th>
                <th>{t('admin.bookingsTab.checkIn')}</th>
                <th>{t('admin.bookingsTab.checkOut')}</th>
                <th>{t('admin.bookingsTab.status')}</th>
                <th className="th-amount">{t('admin.bookingsTab.amount')}</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td>{b.guest?.name ? tName(b.guest.name, i18n.language) : '-'}</td>
                  <td>{b.accommodation?.name ? tName(b.accommodation.name, i18n.language) : '-'}</td>
                  <td>{formatDate(b.checkIn)}</td>
                  <td>{formatDate(b.checkOut)}</td>
                  <td>{statusBadge(b.status)}</td>
                  <td className="cell-amount">{formatCurrency(b.totalPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <PaginationBar pagination={pagination} onPageChange={setPage} />
        </div>
      )}
    </>
  );
}

// ---------- Main Component ----------

export function AdminDashboardPage({ onNavigate }: AdminDashboardPageProps) {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<TabKey>('users');

  const {
    data: stats,
    isLoading: statsLoading,
    error: statsError,
  } = useQuery<AdminStats>({
    queryKey: ['admin', 'stats'],
    queryFn: () => adminApi.stats(),
    enabled: !!user && user.role === 'ADMIN',
  });

  if (!user || user.role !== 'ADMIN') {
    return (
      <div className="admin-page">
        <div className="admin-loading">
          {t('admin.noPermission')}
          <div style={{ marginTop: 16 }}>
            <button
              className="admin-btn"
              style={{
                background: 'var(--ink)',
                color: '#fff',
                padding: '10px 24px',
                fontSize: 14,
              }}
              onClick={() => onNavigate('home')}
            >
              {t('common.backToHome')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="admin-page">
      {/* Header */}
      <div className="admin-header">
        <h1 className="admin-title">{t('admin.title')}</h1>
        <p className="admin-sub">{t('admin.subtitle')}</p>
      </div>

      {/* Stats Cards */}
      {statsLoading ? (
        <div className="admin-loading">{t('admin.statsLoading')}</div>
      ) : statsError ? (
        <div className="admin-error">{t('admin.statsError')}</div>
      ) : stats ? (
        <div className="admin-stats">
          <div className="stat-card">
            <div className="stat-label">{t('admin.stats.users')}</div>
            <div className="stat-value">{stats.users.toLocaleString()}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">{t('admin.stats.accommodations')}</div>
            <div className="stat-value">
              {stats.accommodations.toLocaleString()}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">{t('admin.stats.events')}</div>
            <div className="stat-value">{stats.events.toLocaleString()}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">{t('admin.stats.bookings')}</div>
            <div className="stat-value">{stats.bookings.toLocaleString()}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">{t('admin.stats.revenue')}</div>
            <div className="stat-value revenue">
              {formatCurrency(stats.revenue)}
            </div>
          </div>
        </div>
      ) : null}

      {/* Tabs */}
      <div className="admin-tabs">
        {TAB_KEYS.map((tab) => (
          <button
            key={tab.key}
            className={`admin-tab${activeTab === tab.key ? ' active' : ''}`}
            onClick={() => setActiveTab(tab.key)}
          >
            {t(tab.labelKey)}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'users' && <UsersTab />}
      {activeTab === 'accommodations' && <AccommodationsTab />}
      {activeTab === 'events' && <EventsTab />}
      {activeTab === 'bookings' && <BookingsTab />}
    </div>
  );
}
