import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { accommodationApi, bookingApi } from '../lib/api';
import { useAuth } from '../lib/auth-context';
import '../styles/detail.css';

interface Props {
  id: string;
  onNavigate: (page: string, params?: Record<string, string>) => void;
}

interface Room {
  id: string;
  name: string;
  capacity: number;
  pricePerNight: number;
}

interface AvailabilityDay {
  date: string;
  available: boolean;
  remainingRooms: number;
}

const AMENITY_ICONS: Record<string, string> = {
  'Wi-Fi': '📶', '駐車場': '🅿', '朝食付き': '🍳', '囲炉裏': '🔥',
  '縁側': '🏡', '庭園': '🌳', 'BBQ': '🔥', 'オーシャンビュー': '🌊',
  'テラス': '☀', 'キッチン': '🍽', '露天風呂': '♨', '大浴場': '🛁',
  '懐石料理': '🍱', '送迎': '🚗', 'ラウンジ': '☕', '農業体験': '🌾',
  '自家製朝食': '🍚', '餅つき体験': '🎍',
};

export function PropertyDetailPage({ id, onNavigate }: Props) {
  const { user } = useAuth();
  const [selectedRoom, setSelectedRoom] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(2);
  const [booking, setBooking] = useState(false);
  const [bookError, setBookError] = useState('');
  const [bookSuccess, setBookSuccess] = useState(false);

  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth() + 1);

  const { data: accom, isLoading } = useQuery({
    queryKey: ['accommodation', id],
    queryFn: () => accommodationApi.get(id),
  });

  const { data: availData } = useQuery({
    queryKey: ['availability', id, calYear, calMonth],
    queryFn: () => accommodationApi.availability(id, calYear, calMonth),
  });

  const availMap = useMemo(() => {
    const m = new Map<string, AvailabilityDay>();
    if (availData?.data) {
      for (const d of availData.data) m.set(d.date, d);
    }
    return m;
  }, [availData]);

  const rooms: Room[] = accom?.rooms ?? [];
  const images: string[] = accom?.images ?? [];
  const selectedRoomObj = rooms.find((r) => r.id === selectedRoom);
  const today = new Date().toISOString().split('T')[0];

  const nights = useMemo(() => {
    if (!checkIn || !checkOut) return 0;
    return Math.max(0, Math.ceil((new Date(checkOut).getTime() - new Date(checkIn).getTime()) / 86400000));
  }, [checkIn, checkOut]);

  const totalPrice = selectedRoomObj ? selectedRoomObj.pricePerNight * nights : 0;

  const handleBook = async () => {
    if (!user) { onNavigate('login'); return; }
    if (!selectedRoom || nights < 1) return;
    setBooking(true);
    setBookError('');
    try {
      await bookingApi.create({ roomId: selectedRoom, checkIn, checkOut, guests });
      setBookSuccess(true);
    } catch (err: any) {
      setBookError(err.message || '予約に失敗しました');
    } finally {
      setBooking(false);
    }
  };

  // Calendar helpers
  const daysInMonth = new Date(calYear, calMonth, 0).getDate();
  const firstDow = new Date(calYear, calMonth - 1, 1).getDay();
  const prevMonth = () => { if (calMonth === 1) { setCalYear(calYear - 1); setCalMonth(12); } else setCalMonth(calMonth - 1); };
  const nextMonth = () => { if (calMonth === 12) { setCalYear(calYear + 1); setCalMonth(1); } else setCalMonth(calMonth + 1); };

  if (isLoading) return <div style={{ padding: '120px 40px', textAlign: 'center', color: 'var(--warm-gray)' }}>読み込み中...</div>;
  if (!accom) return <div style={{ padding: '120px 40px', textAlign: 'center', color: 'var(--warm-gray)' }}>施設が見つかりません</div>;

  if (bookSuccess) {
    return (
      <div className="booking-success" style={{ marginTop: 80 }}>
        <div className="success-icon">
          <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="success-title">予約を受け付けました</h2>
        <p className="success-desc">決済が完了すると予約が確定されます。</p>
        <div className="success-actions">
          <button className="success-btn-primary" onClick={() => onNavigate('bookings')}>マイ予約を確認</button>
          <button className="success-btn-outline" onClick={() => onNavigate('home')}>トップに戻る</button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* IMAGE GRID */}
      <div className="img-hero">
        {images.slice(0, 5).map((img, i) => (
          <div key={i} className="img-cell">
            <img src={img} alt={`${accom.name} ${i + 1}`} />
          </div>
        ))}
        {images.length < 5 && Array.from({ length: 5 - images.length }).map((_, i) => (
          <div key={`ph-${i}`} className="img-cell" style={{ background: 'linear-gradient(160deg, #d4c4a8, #8b6f47)' }} />
        ))}
      </div>

      {/* MAIN */}
      <div className="detail-main">
        {/* LEFT */}
        <div>
          <div className="detail-header">
            <p className="detail-region">{accom.prefecture} · {accom.city}</p>
            <h1 className="detail-title">{accom.name}</h1>
            <div className="detail-meta">
              <span>最大{rooms.reduce((max, r) => Math.max(max, r.capacity), 0)}名</span>
              <span>{rooms.length}部屋</span>
            </div>
          </div>

          <hr className="divider" />

          {accom.owner && (
            <div className="host-row">
              <div className="host-avatar" />
              <div>
                <div className="host-name">{accom.owner.name} さんのお宿</div>
                <div className="host-sub">オーナー</div>
              </div>
            </div>
          )}

          <p className="desc">{accom.description}</p>

          <hr className="divider" />

          <h3 className="detail-section-title">設備・アメニティ</h3>
          <div className="amenities-grid">
            {(accom.amenities as string[]).map((a: string) => (
              <div key={a} className="amenity">
                <span className="amenity-icon">{AMENITY_ICONS[a] || '✦'}</span>
                {a}
              </div>
            ))}
          </div>

          <hr className="divider" />

          {/* ROOMS */}
          <h3 className="detail-section-title">お部屋を選ぶ</h3>
          <div className="rooms-list">
            {rooms.map((room) => (
              <button
                key={room.id}
                className={`room-option${selectedRoom === room.id ? ' selected' : ''}`}
                onClick={() => setSelectedRoom(room.id)}
              >
                <div>
                  <div className="room-name">{room.name}</div>
                  <div className="room-cap">定員 {room.capacity}名</div>
                </div>
                <div className="room-price">
                  ¥{room.pricePerNight.toLocaleString()}
                  <span className="room-price-unit"> / 泊</span>
                </div>
              </button>
            ))}
          </div>

          <hr className="divider" />

          {/* CALENDAR */}
          <div className="calendar-section">
            <h3 className="detail-section-title">空き状況</h3>
            <div className="calendar-mini">
              <div className="cal-header">
                <button className="cal-nav-btn" onClick={prevMonth}>◁</button>
                <span className="cal-header-title">{calYear}年 {calMonth}月</span>
                <button className="cal-nav-btn" onClick={nextMonth}>▷</button>
              </div>
              <div className="cal-grid">
                {['日', '月', '火', '水', '木', '金', '土'].map((d) => (
                  <div key={d} className="cal-day-head">{d}</div>
                ))}
                {Array.from({ length: firstDow }).map((_, i) => <div key={`e-${i}`} />)}
                {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
                  const dateStr = `${calYear}-${String(calMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
                  const avail = availMap.get(dateStr);
                  const isPast = dateStr < today;
                  const isToday = dateStr === today;
                  const isAvailable = avail ? avail.available : !isPast;

                  return (
                    <div
                      key={day}
                      className={`cal-day${isToday ? ' today' : ''}${isPast ? ' disabled' : ''}${isAvailable && !isPast ? ' available' : ''}`}
                    >
                      {day}
                      {avail && !isPast && (
                        <div className="cal-remain">{isAvailable ? `残${avail.remainingRooms}` : '満'}</div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT */}
        <div>
          {/* Cancel Policy */}
          <div className="cancel-policy">
            <h4>キャンセルポリシー</h4>
            <ul className="cancel-policy-list">
              <li className="cancel-policy-item">
                <span>7日前まで</span>
                <span className="refund-full">全額返金</span>
              </li>
              <li className="cancel-policy-item">
                <span>3〜6日前</span>
                <span className="refund-half">50% 返金</span>
              </li>
              <li className="cancel-policy-item">
                <span>2日前〜当日</span>
                <span className="refund-none">返金なし</span>
              </li>
            </ul>
          </div>

          {/* Booking Card */}
          <div className="booking-card-sidebar">
            {selectedRoomObj ? (
              <div className="booking-price-row">
                <span className="booking-price">¥{selectedRoomObj.pricePerNight.toLocaleString()}</span>
                <span className="booking-price-unit">/ 泊</span>
              </div>
            ) : (
              <div className="booking-price-row">
                <span className="booking-price" style={{ fontSize: 16, color: 'var(--warm-gray)' }}>お部屋を選択してください</span>
              </div>
            )}

            <div className="booking-fields">
              <div className="bfield">
                <div className="bfield-label">チェックイン</div>
                <input type="date" value={checkIn} min={today} onChange={(e) => setCheckIn(e.target.value)} />
              </div>
              <div className="bfield">
                <div className="bfield-label">チェックアウト</div>
                <input type="date" value={checkOut} min={checkIn || today} onChange={(e) => setCheckOut(e.target.value)} />
              </div>
            </div>

            <div className="bguests">
              <div>
                <div className="bguests-label">宿泊人数</div>
                <div style={{ fontSize: 14, marginTop: 3 }}>大人 {guests}名</div>
              </div>
              <div className="bguests-ctrl">
                <button className="bguests-btn" onClick={() => setGuests((g) => Math.max(1, g - 1))}>−</button>
                <span>{guests}</span>
                <button className="bguests-btn" onClick={() => setGuests((g) => Math.min(selectedRoomObj?.capacity ?? 6, g + 1))}>＋</button>
              </div>
            </div>

            <button
              className="book-btn"
              disabled={booking || !selectedRoom || nights < 1}
              onClick={handleBook}
            >
              {booking ? '処理中...' : !user ? 'ログインして予約' : '予約リクエストを送る'}
            </button>
            <p className="booking-note">確定まで請求はありません</p>

            {bookError && (
              <p style={{ fontSize: 13, color: 'var(--rust)', marginBottom: 16 }}>{bookError}</p>
            )}

            {nights > 0 && selectedRoomObj && (
              <div className="price-breakdown">
                <div className="price-row">
                  <span className="label-dotted">¥{selectedRoomObj.pricePerNight.toLocaleString()} × {nights}泊</span>
                  <span>¥{totalPrice.toLocaleString()}</span>
                </div>
                <div className="price-row total">
                  <span>合計（税込）</span>
                  <span>¥{totalPrice.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
