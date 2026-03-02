import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { adminApi } from '../lib/api';
import { useAuth } from '../lib/auth-context';
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

const TABS: { key: TabKey; label: string }[] = [
  { key: 'users', label: 'ユーザー管理' },
  { key: 'accommodations', label: '施設管理' },
  { key: 'events', label: 'イベント管理' },
  { key: 'bookings', label: '予約一覧' },
];

const ROLE_OPTIONS = ['USER', 'OWNER', 'ORGANIZER', 'ADMIN'];

const ACCOMMODATION_STATUS_OPTIONS = [
  'PENDING_REVIEW',
  'PUBLISHED',
  'SUSPENDED',
  'REJECTED',
];

const STATUS_BADGE: Record<string, { label: string; cls: string }> = {
  // Green
  PUBLISHED:  { label: '公開中', cls: 'badge-green' },
  CONFIRMED:  { label: '確定', cls: 'badge-green' },
  SUCCEEDED:  { label: '成功', cls: 'badge-green' },
  ACTIVE:     { label: '有効', cls: 'badge-green' },
  // Amber
  PENDING:         { label: '保留中', cls: 'badge-amber' },
  PENDING_REVIEW:  { label: '審査待ち', cls: 'badge-amber' },
  DRAFT:           { label: '下書き', cls: 'badge-amber' },
  // Red
  CANCELLED:  { label: 'キャンセル', cls: 'badge-red' },
  SUSPENDED:  { label: '停止中', cls: 'badge-red' },
  FAILED:     { label: '失敗', cls: 'badge-red' },
  REJECTED:   { label: '却下', cls: 'badge-red' },
  // Gray / Blue
  COMPLETED:  { label: '完了', cls: 'badge-blue' },
  REFUNDED:   { label: '返金済', cls: 'badge-gray' },
};

const ROLE_LABELS: Record<string, string> = {
  USER: 'ユーザー',
  OWNER: 'オーナー',
  ORGANIZER: '主催者',
  ADMIN: '管理者',
};

const PAGE_SIZE = 10;

// ---------- Helpers ----------

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  return `${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}/${String(d.getDate()).padStart(2, '0')}`;
}

function formatCurrency(n: number) {
  return `¥${n.toLocaleString()}`;
}

function statusBadge(status: string) {
  const info = STATUS_BADGE[status] || { label: status, cls: 'badge-gray' };
  return <span className={`admin-badge ${info.cls}`}>{info.label}</span>;
}

// ---------- Sub-components ----------

function PaginationBar({
  pagination,
  onPageChange,
}: {
  pagination: Pagination | undefined;
  onPageChange: (page: number) => void;
}) {
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
        {total}件中 {start}-{end}件を表示
      </span>
      <div className="admin-pagination-btns">
        <button
          className="page-btn"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          前へ
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
          次へ
        </button>
      </div>
    </div>
  );
}

// ---------- Users Tab ----------

function UsersTab() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [confirmTarget, setConfirmTarget] = useState<User | null>(null);

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

  if (isLoading) return <div className="admin-loading">読み込み中...</div>;
  if (error) return <div className="admin-error">ユーザー情報の取得に失敗しました</div>;

  const users: User[] = data?.data ?? [];
  const pagination: Pagination | undefined = data?.pagination;

  return (
    <>
      {users.length === 0 ? (
        <div className="admin-empty">ユーザーが見つかりません</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ユーザー名</th>
                <th>メール</th>
                <th>ロール</th>
                <th>ステータス</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.name}</td>
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
                          {ROLE_LABELS[r] || r}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    <span className="active-dot" />
                    <span
                      className={`active-dot ${u.isActive ? 'is-active' : 'is-inactive'}`}
                    />
                    {u.isActive ? '有効' : '無効'}
                  </td>
                  <td>
                    {u.isActive && (
                      <button
                        className="admin-btn admin-btn-danger admin-btn-sm"
                        onClick={() => setConfirmTarget(u)}
                        disabled={deactivateMutation.isPending}
                      >
                        無効化
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
            <h3>ユーザーの無効化</h3>
            <p>
              「{confirmTarget.name}」({confirmTarget.email})
              を無効化しますか？このユーザーはログインできなくなります。
            </p>
            <div className="admin-confirm-actions">
              <button
                className="confirm-cancel"
                onClick={() => setConfirmTarget(null)}
              >
                キャンセル
              </button>
              <button
                className="confirm-action"
                disabled={deactivateMutation.isPending}
                onClick={() => deactivateMutation.mutate(confirmTarget.id)}
              >
                {deactivateMutation.isPending ? '処理中...' : '無効化する'}
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
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

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

  if (isLoading) return <div className="admin-loading">読み込み中...</div>;
  if (error) return <div className="admin-error">施設情報の取得に失敗しました</div>;

  const accommodations: Accommodation[] = data?.data ?? [];
  const pagination: Pagination | undefined = data?.pagination;

  return (
    <>
      {accommodations.length === 0 ? (
        <div className="admin-empty">施設が見つかりません</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>施設名</th>
                <th>オーナー</th>
                <th>ステータス</th>
                <th>地域</th>
              </tr>
            </thead>
            <tbody>
              {accommodations.map((a) => (
                <tr key={a.id}>
                  <td>{a.name}</td>
                  <td>{a.owner?.name ?? '-'}</td>
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
                          {STATUS_BADGE[s]?.label || s}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td>
                    {a.prefecture} {a.city}
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
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'events', page],
    queryFn: () =>
      adminApi.events({ page: String(page), limit: String(PAGE_SIZE) }),
  });

  if (isLoading) return <div className="admin-loading">読み込み中...</div>;
  if (error) return <div className="admin-error">イベント情報の取得に失敗しました</div>;

  const events: Event[] = data?.data ?? [];
  const pagination: Pagination | undefined = data?.pagination;

  return (
    <>
      {events.length === 0 ? (
        <div className="admin-empty">イベントが見つかりません</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>タイトル</th>
                <th>主催者</th>
                <th>ステータス</th>
                <th>日付</th>
                <th>定員</th>
                <th>申込数</th>
              </tr>
            </thead>
            <tbody>
              {events.map((ev) => (
                <tr key={ev.id}>
                  <td>{ev.title}</td>
                  <td>{ev.organizer?.name ?? '-'}</td>
                  <td>{statusBadge(ev.status)}</td>
                  <td>{formatDate(ev.date)}</td>
                  <td>{ev.capacity}名</td>
                  <td>{ev.registrationCount}名</td>
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
  const [page, setPage] = useState(1);

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin', 'bookings', page],
    queryFn: () =>
      adminApi.bookings({ page: String(page), limit: String(PAGE_SIZE) }),
  });

  if (isLoading) return <div className="admin-loading">読み込み中...</div>;
  if (error) return <div className="admin-error">予約情報の取得に失敗しました</div>;

  const bookings: Booking[] = data?.data ?? [];
  const pagination: Pagination | undefined = data?.pagination;

  return (
    <>
      {bookings.length === 0 ? (
        <div className="admin-empty">予約が見つかりません</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ゲスト</th>
                <th>宿泊施設</th>
                <th>チェックイン</th>
                <th>チェックアウト</th>
                <th>ステータス</th>
                <th className="th-amount">金額</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((b) => (
                <tr key={b.id}>
                  <td>{b.guest?.name ?? '-'}</td>
                  <td>{b.accommodation?.name ?? '-'}</td>
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
          この画面にアクセスする権限がありません。
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
              トップに戻る
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
        <h1 className="admin-title">管理ダッシュボード</h1>
        <p className="admin-sub">事務局管理画面 — TripLocal</p>
      </div>

      {/* Stats Cards */}
      {statsLoading ? (
        <div className="admin-loading">統計を読み込み中...</div>
      ) : statsError ? (
        <div className="admin-error">統計情報の取得に失敗しました</div>
      ) : stats ? (
        <div className="admin-stats">
          <div className="stat-card">
            <div className="stat-label">ユーザー数</div>
            <div className="stat-value">{stats.users.toLocaleString()}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">施設数</div>
            <div className="stat-value">
              {stats.accommodations.toLocaleString()}
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-label">イベント数</div>
            <div className="stat-value">{stats.events.toLocaleString()}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">予約数</div>
            <div className="stat-value">{stats.bookings.toLocaleString()}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">総売上</div>
            <div className="stat-value revenue">
              {formatCurrency(stats.revenue)}
            </div>
          </div>
        </div>
      ) : null}

      {/* Tabs */}
      <div className="admin-tabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`admin-tab${activeTab === t.key ? ' active' : ''}`}
            onClick={() => setActiveTab(t.key)}
          >
            {t.label}
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
