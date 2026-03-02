import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { accommodationApi, bookingApi } from '../lib/api';
import { useAuth } from '../lib/auth-context';
import { translateAmenity } from '../lib/amenity-i18n';
import { tPrefecture, tCity, tName, tDesc, tRoom } from '../lib/content-i18n';
import { stripePromise } from '../lib/stripe';
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

function CheckoutForm({ onSuccess, onError }: { onSuccess: () => void; onError: (msg: string) => void }) {
  const { t } = useTranslation();
  const stripe = useStripe();
  const elements = useElements();
  const [paying, setPaying] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setPaying(true);
    const { error } = await stripe.confirmPayment({
      elements,
      redirect: 'if_required',
    });
    if (error) {
      onError(error.message || t('detail.paymentError'));
      setPaying(false);
    } else {
      onSuccess();
    }
  };

  return (
    <form onSubmit={handleSubmit} className="checkout-form">
      <h4 className="checkout-form-title">{t('detail.paymentSection')}</h4>
      <PaymentElement />
      <button type="submit" className="book-btn" disabled={!stripe || paying} style={{ marginTop: 16 }}>
        {paying ? t('common.processing') : t('detail.payButton')}
      </button>
    </form>
  );
}

const AMENITY_ICONS: Record<string, string> = {
  'Wi-Fi': '📶', '駐車場': '🅿', '朝食付き': '🍳', '囲炉裏': '🔥',
  '縁側': '🏡', '庭園': '🌳', 'BBQ': '🔥', 'オーシャンビュー': '🌊',
  'テラス': '☀', 'キッチン': '🍽', '露天風呂': '♨', '大浴場': '🛁',
  '懐石料理': '🍱', '送迎': '🚗', 'ラウンジ': '☕', '農業体験': '🌾',
  '自家製朝食': '🍚', '餅つき体験': '🎍',
};


export function PropertyDetailPage({ id, onNavigate }: Props) {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const [selectedRoom, setSelectedRoom] = useState('');
  const [checkIn, setCheckIn] = useState('');
  const [checkOut, setCheckOut] = useState('');
  const [guests, setGuests] = useState(2);
  const [children, setChildren] = useState(0);
  const [booking, setBooking] = useState(false);
  const [bookError, setBookError] = useState('');
  const [bookSuccess, setBookSuccess] = useState(false);
  const [clientSecret, setClientSecret] = useState<string | null>(null);

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
      const data = await bookingApi.create({ roomId: selectedRoom, checkIn, checkOut, guests });
      if (data.clientSecret) {
        setClientSecret(data.clientSecret);
      } else {
        setBookSuccess(true);
      }
    } catch (err: any) {
      setBookError(err.message || t('detail.bookingError'));
    } finally {
      setBooking(false);
    }
  };

  // Calendar helpers
  const daysInMonth = new Date(calYear, calMonth, 0).getDate();
  const firstDow = new Date(calYear, calMonth - 1, 1).getDay();
  const prevMonth = () => { if (calMonth === 1) { setCalYear(calYear - 1); setCalMonth(12); } else setCalMonth(calMonth - 1); };
  const nextMonth = () => { if (calMonth === 12) { setCalYear(calYear + 1); setCalMonth(1); } else setCalMonth(calMonth + 1); };

  const dayNames = i18n.language === 'ja' ? ['日', '月', '火', '水', '木', '金', '土'] : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (isLoading) return <div style={{ padding: '120px 40px', textAlign: 'center', color: 'var(--warm-gray)' }}>{t('common.loading')}</div>;
  if (!accom) return <div style={{ padding: '120px 40px', textAlign: 'center', color: 'var(--warm-gray)' }}>{t('detail.notFound')}</div>;

  if (bookSuccess) {
    return (
      <div className="booking-success" style={{ marginTop: 80 }}>
        <div className="success-icon">
          <svg width="28" height="28" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="success-title">{t('detail.bookingSuccess')}</h2>
        <p className="success-desc">{t('detail.bookingSuccessDesc')}</p>
        <div className="success-actions">
          <button className="success-btn-primary" onClick={() => onNavigate('bookings')}>{t('detail.viewBookings')}</button>
          <button className="success-btn-outline" onClick={() => onNavigate('home')}>{t('detail.backToHome')}</button>
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
            <p className="detail-region">{tPrefecture(accom.prefecture, i18n.language)} · {tCity(accom.city, i18n.language)}</p>
            <h1 className="detail-title">{tName(accom.name, i18n.language)}</h1>
            <div className="detail-meta">
              <span>{t('detail.maxGuests', { count: rooms.reduce((max, r) => Math.max(max, r.capacity), 0) })}</span>
              <span>{t('detail.roomCount', { count: rooms.length })}</span>
            </div>
          </div>

          <hr className="divider" />

          {accom.owner && (
            <div className="host-row">
              <div className="host-avatar" />
              <div>
                <div className="host-name">{t('detail.hostTitle', { name: tName(accom.owner.name, i18n.language) })}</div>
                <div className="host-sub">{t('detail.hostRole')}</div>
              </div>
            </div>
          )}

          <p className="desc">{tDesc(accom.description, i18n.language)}</p>

          <hr className="divider" />

          <h3 className="detail-section-title">{t('detail.amenities')}</h3>
          <div className="amenities-grid">
            {(accom.amenities as string[]).map((a: string) => (
              <div key={a} className="amenity">
                <span className="amenity-icon">{AMENITY_ICONS[a] || '✦'}</span>
                {translateAmenity(a, i18n.language)}
              </div>
            ))}
          </div>

          <hr className="divider" />

          {/* ROOMS */}
          <h3 className="detail-section-title">{t('detail.selectRoom')}</h3>
          <div className="rooms-list">
            {rooms.map((room) => (
              <button
                key={room.id}
                className={`room-option${selectedRoom === room.id ? ' selected' : ''}`}
                onClick={() => setSelectedRoom(room.id)}
              >
                <div>
                  <div className="room-name">{tRoom(room.name, i18n.language)}</div>
                  <div className="room-cap">{t('detail.roomCapacity', { count: room.capacity })}</div>
                </div>
                <div className="room-price">
                  ¥{room.pricePerNight.toLocaleString()}{i18n.language === 'ja' ? '〜' : '+'}
                </div>
              </button>
            ))}
          </div>

          <hr className="divider" />

          {/* CALENDAR */}
          <div className="calendar-section">
            <h3 className="detail-section-title">{t('detail.availability')}</h3>
            <div className="calendar-mini">
              <div className="cal-header">
                <button className="cal-nav-btn" onClick={prevMonth}>◁</button>
                <span className="cal-header-title">{i18n.language === 'ja' ? `${calYear}年 ${calMonth}月` : new Date(calYear, calMonth - 1).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</span>
                <button className="cal-nav-btn" onClick={nextMonth}>▷</button>
              </div>
              <div className="cal-grid">
                {dayNames.map((d) => (
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
                        <div className="cal-remain">{isAvailable ? t('detail.remainingShort', { count: avail.remainingRooms }) : t('detail.fullShort')}</div>
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
            <h4>{t('detail.cancellationPolicy')}</h4>
            <ul className="cancel-policy-list">
              <li className="cancel-policy-item">
                <span>{t('detail.cancel7days')}</span>
                <span className="refund-full">{t('detail.refundFull')}</span>
              </li>
              <li className="cancel-policy-item">
                <span>{t('detail.cancel3to6days')}</span>
                <span className="refund-half">{t('detail.refundHalf')}</span>
              </li>
              <li className="cancel-policy-item">
                <span>{t('detail.cancel2days')}</span>
                <span className="refund-none">{t('detail.refundNone')}</span>
              </li>
            </ul>
          </div>

          {/* Booking Card */}
          <div className="booking-card-sidebar">
            {selectedRoomObj ? (
              <div className="booking-price-row">
                <span className="booking-price">¥{selectedRoomObj.pricePerNight.toLocaleString()}{i18n.language === 'ja' ? '〜' : '+'}</span>
              </div>
            ) : (
              <div className="booking-price-row">
                <span className="booking-price" style={{ fontSize: 16, color: 'var(--warm-gray)' }}>{t('detail.selectRoomPrompt')}</span>
              </div>
            )}

            <div className="booking-fields">
              <div className="bfield">
                <div className="bfield-label">{t('detail.checkIn')}</div>
                <input type="date" value={checkIn} min={today} onChange={(e) => setCheckIn(e.target.value)} />
              </div>
              <div className="bfield">
                <div className="bfield-label">{t('detail.checkOut')}</div>
                <input type="date" value={checkOut} min={checkIn || today} onChange={(e) => setCheckOut(e.target.value)} />
              </div>
            </div>

            <div className="bguests">
              <div>
                <div className="bguests-label">{t('detail.guestsLabel')}</div>
                <div style={{ fontSize: 14, marginTop: 3 }}>{t('detail.adultsCount', { count: guests })}</div>
              </div>
              <div className="bguests-ctrl">
                <button className="bguests-btn" onClick={() => setGuests((g) => Math.max(1, g - 1))}>-</button>
                <span>{guests}</span>
                <button className="bguests-btn" onClick={() => setGuests((g) => Math.min(selectedRoomObj?.capacity ?? 6, g + 1))}>+</button>
              </div>
            </div>

            <div className="bguests">
              <div>
                <div style={{ fontSize: 14 }}>{t('detail.childrenCount', { count: children })}</div>
              </div>
              <div className="bguests-ctrl">
                <button className="bguests-btn" onClick={() => setChildren((c) => Math.max(0, c - 1))}>-</button>
                <span>{children}</span>
                <button className="bguests-btn" onClick={() => setChildren((c) => Math.min(5, c + 1))}>+</button>
              </div>
            </div>

            {clientSecret && stripePromise ? (
              <Elements stripe={stripePromise} options={{ clientSecret }}>
                <CheckoutForm
                  onSuccess={() => setBookSuccess(true)}
                  onError={(msg) => setBookError(msg)}
                />
              </Elements>
            ) : (
              <button
                className="book-btn"
                disabled={booking || !selectedRoom || nights < 1}
                onClick={handleBook}
              >
                {booking ? t('common.processing') : !user ? t('detail.loginToReserve') : t('detail.reserveButton')}
              </button>
            )}

            {bookError && (
              <p style={{ fontSize: 13, color: 'var(--rust)', marginBottom: 16 }}>{bookError}</p>
            )}

            {nights > 0 && selectedRoomObj && (
              <div className="price-breakdown">
                <div className="price-row">
                  <span className="label-dotted">¥{selectedRoomObj.pricePerNight.toLocaleString()} × {t('detail.nightsCount', { count: nights })}</span>
                  <span>¥{totalPrice.toLocaleString()}</span>
                </div>
                <div className="price-row total">
                  <span>{t('detail.totalIncTax')}</span>
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
