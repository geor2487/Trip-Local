import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { eventApi } from '../lib/api';
import { useAuth } from '../lib/auth-context';
import '../styles/events.css';

interface EventDetailPageProps {
  id: string;
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

interface EventDetail {
  id: string;
  title: string;
  description: string;
  coverImage: string;
  category: string;
  date: string;
  endDate?: string;
  location: string;
  city: string;
  prefecture: string;
  price: number;
  capacity: number;
  registrationCount: number;
  organizer: {
    id: string;
    name: string;
  };
}

interface Registration {
  id: string;
  eventId: string;
  status: string;
}

function formatFullDate(dateStr: string): string {
  const d = new Date(dateStr);
  const dow = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${year}年${month}月${day}日（${dow}）${hours}:${minutes}`;
}

export function EventDetailPage({ id, onNavigate }: EventDetailPageProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [ticketCode, setTicketCode] = useState<string | null>(null);
  const [registrationError, setRegistrationError] = useState('');

  // Fetch event detail
  const { data: event, isLoading } = useQuery<EventDetail>({
    queryKey: ['event', id],
    queryFn: () => eventApi.get(id),
  });

  // Fetch user's registrations to check if already registered
  const { data: myRegsData } = useQuery({
    queryKey: ['myRegistrations'],
    queryFn: () => eventApi.myRegistrations(),
    enabled: !!user,
  });

  const myRegistrations: Registration[] = myRegsData?.data ?? [];
  const existingRegistration = myRegistrations.find(
    (r) => r.eventId === id && r.status !== 'CANCELLED'
  );
  const isRegistered = !!existingRegistration;

  // Register mutation
  const registerMutation = useMutation({
    mutationFn: () => eventApi.register(id),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['event', id] });
      queryClient.invalidateQueries({ queryKey: ['myRegistrations'] });
      setShowConfirmModal(false);
      setRegistrationError('');

      if (data.ticketCode) {
        // Free event: show ticket code
        setTicketCode(data.ticketCode);
      } else if (data.clientSecret) {
        // Paid event: would redirect to Stripe (placeholder)
        setTicketCode(null);
        // For now, just show success
      }
    },
    onError: (err: Error) => {
      setRegistrationError(err.message || '申し込みに失敗しました');
    },
  });

  const handleRegisterClick = () => {
    if (!user) {
      onNavigate('login');
      return;
    }
    setRegistrationError('');
    setShowConfirmModal(true);
  };

  const handleConfirmRegister = () => {
    registerMutation.mutate();
  };

  // Loading state
  if (isLoading) {
    return (
      <div style={{ padding: '120px 40px', textAlign: 'center', color: 'var(--warm-gray)' }}>
        読み込み中...
      </div>
    );
  }

  // Not found
  if (!event) {
    return (
      <div style={{ padding: '120px 40px', textAlign: 'center', color: 'var(--warm-gray)' }}>
        イベントが見つかりません
      </div>
    );
  }

  const remaining = event.capacity - event.registrationCount;
  const isSoldOut = remaining <= 0;
  const fillPercent = event.capacity > 0
    ? Math.min(100, (event.registrationCount / event.capacity) * 100)
    : 0;
  const isWarning = remaining > 0 && remaining <= 5;
  const isFree = event.price === 0;

  // Success state after free registration with ticket code
  if (ticketCode) {
    return (
      <div className="event-success">
        <div className="event-success-icon">
          <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2>申し込みが完了しました</h2>
        <p>以下のチケットコードを当日ご提示ください。</p>
        <div className="event-success-ticket">
          <div className="event-ticket-label">チケットコード</div>
          <div className="event-ticket-value">{ticketCode}</div>
        </div>
        <p>{event.title}</p>
        <p style={{ color: 'var(--ink)' }}>{formatFullDate(event.date)}</p>
        <div className="event-success-actions">
          <button
            className="event-success-btn-primary"
            onClick={() => onNavigate('events')}
          >
            イベント一覧に戻る
          </button>
          <button
            className="event-success-btn-outline"
            onClick={() => onNavigate('home')}
          >
            トップに戻る
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="event-detail">
      {/* COVER IMAGE */}
      <div className="event-detail-cover">
        <img src={event.coverImage} alt={event.title} />
      </div>

      {/* MAIN CONTENT */}
      <div className="event-detail-main">
        {/* LEFT COLUMN */}
        <div>
          {event.category && (
            <span className="event-detail-category">{event.category}</span>
          )}
          <h1 className="event-detail-title">{event.title}</h1>

          {/* META INFO */}
          <div className="event-detail-meta">
            {/* Date */}
            <div className="event-meta-item">
              <svg className="event-meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                <line x1="16" y1="2" x2="16" y2="6" />
                <line x1="8" y1="2" x2="8" y2="6" />
                <line x1="3" y1="10" x2="21" y2="10" />
              </svg>
              <div>
                <div className="event-meta-label">日時</div>
                <div>{formatFullDate(event.date)}</div>
                {event.endDate && (
                  <div style={{ fontSize: 13, color: 'var(--warm-gray)', marginTop: 2 }}>
                    〜 {formatFullDate(event.endDate)}
                  </div>
                )}
              </div>
            </div>

            {/* Location */}
            <div className="event-meta-item">
              <svg className="event-meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <div>
                <div className="event-meta-label">場所</div>
                <div>{event.location}</div>
                <div style={{ fontSize: 13, color: 'var(--warm-gray)', marginTop: 2 }}>
                  {event.prefecture} {event.city}
                </div>
              </div>
            </div>

            {/* Price */}
            <div className="event-meta-item">
              <svg className="event-meta-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23" />
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
              </svg>
              <div>
                <div className="event-meta-label">参加費</div>
                <div>{isFree ? '無料' : `¥${event.price.toLocaleString()}`}</div>
              </div>
            </div>
          </div>

          <hr className="event-detail-divider" />

          {/* ORGANIZER */}
          {event.organizer && (
            <>
              <div className="event-organizer">
                <div className="event-organizer-avatar">
                  {event.organizer.name.charAt(0)}
                </div>
                <div>
                  <div className="event-organizer-name">{event.organizer.name}</div>
                  <div className="event-organizer-role">主催者</div>
                </div>
              </div>
              <hr className="event-detail-divider" />
            </>
          )}

          {/* DESCRIPTION */}
          <p className="event-detail-desc">{event.description}</p>
        </div>

        {/* RIGHT COLUMN — BOOKING SIDEBAR */}
        <div>
          <div className="event-booking-card">
            {/* PRICE */}
            {isFree ? (
              <div className="event-booking-price free">無料</div>
            ) : (
              <div className="event-booking-price">¥{event.price.toLocaleString()}</div>
            )}
            <div className="event-booking-price-label">
              {isFree ? '参加費無料のイベントです' : '1名あたりの参加費'}
            </div>

            {/* CAPACITY BAR */}
            <div className="capacity-section">
              <div className="capacity-label">
                <span className="capacity-label-remaining">
                  残り {Math.max(0, remaining)} / {event.capacity} 席
                </span>
                {isSoldOut && (
                  <span style={{ fontSize: 12, color: 'var(--warm-gray)' }}>満席</span>
                )}
              </div>
              <div className="capacity-bar">
                <div
                  className={`capacity-bar-fill${isSoldOut ? ' full' : isWarning ? ' warning' : ''}`}
                  style={{ width: `${fillPercent}%` }}
                />
              </div>
            </div>

            {/* REGISTER BUTTON */}
            {isRegistered ? (
              <>
                <button className="event-register-btn registered" disabled>
                  申込み済み
                </button>
                <div className="event-register-status">
                  このイベントに申込み済みです
                </div>
              </>
            ) : isSoldOut ? (
              <>
                <button className="event-register-btn" disabled>
                  満席
                </button>
                <p className="event-register-note">
                  現在キャンセル待ちは受け付けていません
                </p>
              </>
            ) : (
              <>
                <button
                  className="event-register-btn"
                  onClick={handleRegisterClick}
                >
                  {!user ? 'ログインして申し込む' : '参加申し込み'}
                </button>
                <p className="event-register-note">
                  {isFree ? '無料イベント — 決済は不要です' : '申込み後に決済画面へ進みます'}
                </p>
              </>
            )}

            {registrationError && (
              <p className="event-error">{registrationError}</p>
            )}
          </div>
        </div>
      </div>

      {/* CONFIRM MODAL */}
      {showConfirmModal && (
        <div className="event-modal-overlay" onClick={() => setShowConfirmModal(false)}>
          <div className="event-modal" onClick={(e) => e.stopPropagation()}>
            <button
              className="event-modal-close"
              onClick={() => setShowConfirmModal(false)}
            >
              ×
            </button>

            <h2>参加申し込みの確認</h2>
            <p>以下のイベントに申し込みます。</p>

            <div className="event-modal-summary">
              <div className="event-modal-summary-row">
                <span className="label">イベント</span>
                <span>{event.title}</span>
              </div>
              <div className="event-modal-summary-row">
                <span className="label">日時</span>
                <span>{formatFullDate(event.date)}</span>
              </div>
              <div className="event-modal-summary-row">
                <span className="label">場所</span>
                <span>{event.location}</span>
              </div>
              <div className="event-modal-summary-row total">
                <span>参加費</span>
                <span>{isFree ? '無料' : `¥${event.price.toLocaleString()}`}</span>
              </div>
            </div>

            {!isFree && (
              <p style={{ fontSize: 12, color: 'var(--warm-gray)' }}>
                ※ 確認後、決済画面へ進みます（Stripe）
              </p>
            )}

            {registrationError && (
              <p className="event-error">{registrationError}</p>
            )}

            <div className="event-modal-actions">
              <button
                className="event-modal-cancel"
                onClick={() => setShowConfirmModal(false)}
              >
                キャンセル
              </button>
              <button
                className="event-modal-confirm"
                onClick={handleConfirmRegister}
                disabled={registerMutation.isPending}
              >
                {registerMutation.isPending
                  ? '処理中...'
                  : isFree
                    ? '申し込みを確定'
                    : '決済に進む'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
