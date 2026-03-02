import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { bookingApi } from '../lib/api';
import { useAuth } from '../lib/auth-context';
import '../styles/bookings.css';

interface MyBookingsPageProps {
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

interface Booking {
  id: string;
  checkIn: string;
  checkOut: string;
  guests: number;
  totalPrice: number;
  status: string;
  createdAt: string;
  cancelledAt: string | null;
  room: {
    name: string;
    accommodation: {
      id: string;
      name: string;
      city: string;
      prefecture: string;
      coverImage: string;
    };
  };
}

const STATUS_MAP: Record<string, { label: string; cls: string }> = {
  CONFIRMED: { label: '確定済み', cls: 'status-confirmed' },
  CANCELLED: { label: 'キャンセル済', cls: 'status-cancelled' },
  COMPLETED: { label: '滞在済み', cls: 'status-completed' },
  PENDING: { label: '決済待ち', cls: 'status-pending' },
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr);
  const dow = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${dow}）`;
}

function getNights(checkIn: string, checkOut: string) {
  return Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000);
}

export function MyBookingsPage({ onNavigate }: MyBookingsPageProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [cancelTarget, setCancelTarget] = useState<Booking | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelResult, setCancelResult] = useState<{ refundRate: number; refundAmount: number } | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['bookings'],
    queryFn: () => bookingApi.list(),
    enabled: !!user,
  });

  if (!user) {
    return (
      <div className="bookings-login">
        <p>予約を確認するにはログインしてください</p>
        <button className="bookings-empty-btn" onClick={() => onNavigate('login')}>ログイン</button>
      </div>
    );
  }

  const bookings: Booking[] = data?.data ?? [];
  const now = new Date();

  const upcoming = bookings.filter(
    (b) => (b.status === 'CONFIRMED' || b.status === 'PENDING') && new Date(b.checkIn) >= now
  );
  const past = bookings.filter(
    (b) => b.status === 'COMPLETED' || b.status === 'CANCELLED' || new Date(b.checkOut) < now
  );
  const displayed = tab === 'upcoming' ? upcoming : past;

  const handleCancel = async () => {
    if (!cancelTarget) return;
    setCancelling(true);
    try {
      const result = await bookingApi.cancel(cancelTarget.id);
      setCancelResult({ refundRate: result.refundRate, refundAmount: result.refundAmount });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      refetch();
    } catch (err: any) {
      alert(err.message || 'キャンセルに失敗しました');
    } finally {
      setCancelling(false);
    }
  };

  const closeCancelModal = () => {
    setCancelTarget(null);
    setCancelResult(null);
  };

  return (
    <div className="bookings-page">
      <div className="page-header">
        <h1 className="page-title">マイ予約</h1>
        <p className="page-sub">
          現在の予約: {upcoming.length}件 ／ 過去の予約: {past.length}件
        </p>
      </div>

      {/* TABS */}
      <div className="tabs">
        <button
          className={`tab${tab === 'upcoming' ? ' active' : ''}`}
          onClick={() => setTab('upcoming')}
        >
          予定・確定済み
        </button>
        <button
          className={`tab${tab === 'past' ? ' active' : ''}`}
          onClick={() => setTab('past')}
        >
          過去の予約
        </button>
      </div>

      {isLoading ? (
        <div className="bookings-empty">読み込み中...</div>
      ) : displayed.length === 0 ? (
        <div className="bookings-empty">
          {tab === 'upcoming' ? '予定の予約はありません' : '過去の予約はありません'}
          {tab === 'upcoming' && (
            <div>
              <button className="bookings-empty-btn" onClick={() => onNavigate('home')}>宿を探す</button>
            </div>
          )}
        </div>
      ) : (
        <div>
          {displayed.map((b) => {
            const status = STATUS_MAP[b.status] || STATUS_MAP.PENDING;
            const nights = getNights(b.checkIn, b.checkOut);

            return (
              <div key={b.id} className="bk-card">
                <div className="bk-img">
                  <img
                    src={b.room.accommodation.coverImage}
                    alt={b.room.accommodation.name}
                  />
                </div>
                <div className="bk-body">
                  <span className={`status-badge ${status.cls}`}>{status.label}</span>
                  <p className="bk-region">{b.room.accommodation.prefecture} · {b.room.accommodation.city}</p>
                  <h3 className="bk-name">{b.room.accommodation.name}</h3>
                  <p className="bk-dates">
                    {formatDate(b.checkIn)} → {formatDate(b.checkOut)} · {nights}泊 · {b.guests}名
                  </p>
                  <p className="bk-price">¥{b.totalPrice.toLocaleString()}</p>
                </div>
                <div className="bk-actions">
                  <button
                    className="action-btn btn-primary"
                    onClick={() => onNavigate('detail', { id: b.room.accommodation.id })}
                  >
                    予約詳細を見る
                  </button>
                  {(b.status === 'CONFIRMED' || b.status === 'PENDING') && (
                    <button
                      className="action-btn btn-danger"
                      onClick={() => setCancelTarget(b)}
                    >
                      キャンセルする
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CANCEL MODAL */}
      {cancelTarget && (
        <div className="cancel-modal-overlay" onClick={closeCancelModal}>
          <div className="cancel-modal" onClick={(e) => e.stopPropagation()}>
            <button className="cancel-modal-close" onClick={closeCancelModal}>×</button>

            {cancelResult ? (
              <>
                <h2>キャンセル完了</h2>
                <table className="refund-table">
                  <thead>
                    <tr><th>項目</th><th>金額</th></tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>宿泊料金合計</td>
                      <td>¥{cancelTarget.totalPrice.toLocaleString()}</td>
                    </tr>
                    <tr className="highlight">
                      <td>返金額（{Math.round(cancelResult.refundRate * 100)}%）</td>
                      <td>¥{cancelResult.refundAmount.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
                <div className="cancel-modal-actions">
                  <button className="modal-keep" onClick={closeCancelModal}>閉じる</button>
                </div>
              </>
            ) : (
              <>
                <h2>キャンセルの確認</h2>
                <p>
                  「{cancelTarget.room.accommodation.name}」のキャンセルを実行します。
                  キャンセルポリシーに従い、下記の返金が適用されます。
                </p>
                <table className="refund-table">
                  <thead>
                    <tr><th>項目</th><th>金額</th></tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>宿泊料金合計</td>
                      <td>¥{cancelTarget.totalPrice.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
                <div className="cancel-modal-actions">
                  <button className="modal-keep" onClick={closeCancelModal}>予約を維持する</button>
                  <button
                    className="modal-cancel-confirm"
                    onClick={handleCancel}
                    disabled={cancelling}
                  >
                    {cancelling ? '処理中...' : 'キャンセルを実行'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
