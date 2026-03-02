import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { bookingApi } from '../lib/api';
import { useAuth } from '../lib/auth-context';
import { tPrefecture, tCity, tName } from '../lib/content-i18n';
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

const STATUS_CLS: Record<string, string> = {
  CONFIRMED: 'status-confirmed',
  CANCELLED: 'status-cancelled',
  COMPLETED: 'status-completed',
  PENDING: 'status-pending',
};

function formatDate(dateStr: string, lang: string) {
  const d = new Date(dateStr);
  if (lang === 'ja') {
    const dow = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];
    return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日（${dow}）`;
  }
  return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', weekday: 'short' });
}

function getNights(checkIn: string, checkOut: string) {
  return Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000);
}

export function MyBookingsPage({ onNavigate }: MyBookingsPageProps) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const getStatusLabel = (status: string) => t(`bookings.status.${status}`) || status;
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
        <p>{t('bookings.loginRequired')}</p>
        <button className="bookings-empty-btn" onClick={() => onNavigate('login')}>{t('common.login')}</button>
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
      alert(err.message || t('bookings.cancelError'));
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
        <h1 className="page-title">{t('bookings.title')}</h1>
        <p className="page-sub">
          {t('bookings.summary', { upcoming: upcoming.length, past: past.length })}
        </p>
      </div>

      {/* TABS */}
      <div className="tabs">
        <button
          className={`tab${tab === 'upcoming' ? ' active' : ''}`}
          onClick={() => setTab('upcoming')}
        >
          {t('bookings.upcoming')}
        </button>
        <button
          className={`tab${tab === 'past' ? ' active' : ''}`}
          onClick={() => setTab('past')}
        >
          {t('bookings.past')}
        </button>
      </div>

      {isLoading ? (
        <div className="bookings-empty">{t('common.loading')}</div>
      ) : displayed.length === 0 ? (
        <div className="bookings-empty">
          {tab === 'upcoming' ? t('bookings.noUpcoming') : t('bookings.noPast')}
          {tab === 'upcoming' && (
            <div>
              <button className="bookings-empty-btn" onClick={() => onNavigate('home')}>{t('bookings.findStays')}</button>
            </div>
          )}
        </div>
      ) : (
        <div>
          {displayed.map((b) => {
            const statusCls = STATUS_CLS[b.status] || STATUS_CLS.PENDING;
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
                  <span className={`status-badge ${statusCls}`}>{getStatusLabel(b.status)}</span>
                  <p className="bk-region">{tPrefecture(b.room.accommodation.prefecture, i18n.language)} · {tCity(b.room.accommodation.city, i18n.language)}</p>
                  <h3 className="bk-name">{tName(b.room.accommodation.name, i18n.language)}</h3>
                  <p className="bk-dates">
                    {formatDate(b.checkIn, i18n.language)} → {formatDate(b.checkOut, i18n.language)} · {t('bookings.nightsAndGuests', { nights, guests: b.guests })}
                  </p>
                  <p className="bk-price">¥{b.totalPrice.toLocaleString()}</p>
                </div>
                <div className="bk-actions">
                  <button
                    className="action-btn btn-primary"
                    onClick={() => onNavigate('detail', { id: b.room.accommodation.id })}
                  >
                    {t('bookings.viewDetail')}
                  </button>
                  {(b.status === 'CONFIRMED' || b.status === 'PENDING') && (
                    <button
                      className="action-btn btn-danger"
                      onClick={() => setCancelTarget(b)}
                    >
                      {t('bookings.cancelButton')}
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
                <h2>{t('bookings.cancelComplete')}</h2>
                <table className="refund-table">
                  <thead>
                    <tr><th>{t('bookings.tableItem')}</th><th>{t('bookings.tableAmount')}</th></tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{t('bookings.totalAccommodation')}</td>
                      <td>¥{cancelTarget.totalPrice.toLocaleString()}</td>
                    </tr>
                    <tr className="highlight">
                      <td>{t('bookings.refundLabel', { rate: Math.round(cancelResult.refundRate * 100) })}</td>
                      <td>¥{cancelResult.refundAmount.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
                <div className="cancel-modal-actions">
                  <button className="modal-keep" onClick={closeCancelModal}>{t('common.close')}</button>
                </div>
              </>
            ) : (
              <>
                <h2>{t('bookings.cancelTitle')}</h2>
                <p>
                  {t('bookings.cancelDesc', { name: cancelTarget.room.accommodation.name })}
                </p>
                <table className="refund-table">
                  <thead>
                    <tr><th>{t('bookings.tableItem')}</th><th>{t('bookings.tableAmount')}</th></tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>{t('bookings.totalAccommodation')}</td>
                      <td>¥{cancelTarget.totalPrice.toLocaleString()}</td>
                    </tr>
                  </tbody>
                </table>
                <div className="cancel-modal-actions">
                  <button className="modal-keep" onClick={closeCancelModal}>{t('bookings.keepBooking')}</button>
                  <button
                    className="modal-cancel-confirm"
                    onClick={handleCancel}
                    disabled={cancelling}
                  >
                    {cancelling ? t('common.processing') : t('bookings.confirmCancel')}
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
