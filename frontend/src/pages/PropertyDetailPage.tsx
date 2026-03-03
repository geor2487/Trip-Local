import { useState, useMemo, useRef, useEffect } from 'react';
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

const SECTION_KEYS = ['overview', 'amenities', 'rooms', 'calendar'] as const;

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
  const [activeSection, setActiveSection] = useState<string>('overview');

  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth() + 1);

  // Section refs for scroll tracking
  const overviewRef = useRef<HTMLDivElement>(null);
  const amenitiesRef = useRef<HTMLDivElement>(null);
  const roomsRef = useRef<HTMLDivElement>(null);
  const calendarRef = useRef<HTMLDivElement>(null);

  const sectionRefs = useMemo(() => ({
    overview: overviewRef,
    amenities: amenitiesRef,
    rooms: roomsRef,
    calendar: calendarRef,
  }), []);

  // IntersectionObserver for section nav auto-highlighting
  useEffect(() => {
    const refs = [overviewRef, amenitiesRef, roomsRef, calendarRef];
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const key = SECTION_KEYS.find((k) => sectionRefs[k]?.current === entry.target);
            if (key) setActiveSection(key);
          }
        }
      },
      { rootMargin: '-120px 0px -60% 0px' },
    );
    refs.forEach((ref) => { if (ref.current) observer.observe(ref.current); });
    return () => observer.disconnect();
  }, [sectionRefs]);

  const scrollToSection = (key: string) => {
    const ref = sectionRefs[key as keyof typeof sectionRefs];
    ref?.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

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

  // Derive property highlights from amenities
  const highlights: { icon: string; label: string }[] = [];
  const amenities = (accom?.amenities as string[]) || [];
  if (amenities.some(a => ['Wi-Fi'].includes(a))) highlights.push({ icon: '📶', label: t('detail.highlightWifi') });
  if (amenities.some(a => ['露天風呂', '大浴場'].includes(a))) highlights.push({ icon: '♨', label: t('detail.highlightOnsen') });
  if (amenities.some(a => ['朝食付き', '自家製朝食', '懐石料理'].includes(a))) highlights.push({ icon: '🍳', label: t('detail.highlightBreakfast') });
  if (amenities.some(a => ['駐車場'].includes(a))) highlights.push({ icon: '🅿', label: t('detail.highlightParking') });
  if (amenities.some(a => ['送迎'].includes(a))) highlights.push({ icon: '🚗', label: t('detail.highlightTransfer') });
  if (amenities.some(a => ['オーシャンビュー'].includes(a))) highlights.push({ icon: '🌊', label: t('detail.highlightOceanView') });
  if (amenities.some(a => ['庭園', '縁側'].includes(a))) highlights.push({ icon: '🌳', label: t('detail.highlightGarden') });

  // Fake review score for UX demo (would come from API in production)
  const reviewScore = 8.4;
  const reviewCount = 47;

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
      {/* ── BREADCRUMB ── */}
      <div className="breadcrumb">
        <button className="breadcrumb-link" onClick={() => onNavigate('home')}>{t('detail.breadcrumbHome')}</button>
        <span className="breadcrumb-sep">&gt;</span>
        <span className="breadcrumb-link">{tPrefecture(accom.prefecture, i18n.language)}</span>
        <span className="breadcrumb-sep">&gt;</span>
        <span className="breadcrumb-current">{tName(accom.name, i18n.language)}</span>
      </div>

      {/* ── IMAGE GALLERY ── */}
      <div className="img-hero">
        {images.slice(0, 4).map((img, i) => (
          <div key={i} className="img-cell">
            <img src={img} alt={`${accom.name} ${i + 1}`} />
          </div>
        ))}
        {images.length >= 5 ? (
          <div className="img-cell img-cell--overlay">
            <img src={images[4]} alt={`${accom.name} 5`} />
            <span className="img-overlay-text">
              <svg className="img-overlay-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {t('detail.viewAllPhotosCount', { count: images.length })}
            </span>
          </div>
        ) : (
          Array.from({ length: 5 - images.length }).map((_, i) => (
            <div key={`ph-${i}`} className="img-cell" style={{ background: 'linear-gradient(160deg, #c8d4c0, #6b8f6b)' }} />
          ))
        )}
      </div>

      {/* ── SECTION NAV ── */}
      <nav className="section-nav">
        {SECTION_KEYS.map((key) => (
          <button
            key={key}
            className={`section-nav-item${activeSection === key ? ' active' : ''}`}
            onClick={() => scrollToSection(key)}
          >
            {t(`detail.section${key.charAt(0).toUpperCase() + key.slice(1)}` as any)}
          </button>
        ))}
      </nav>

      {/* ── MAIN CONTENT ── */}
      <div className="detail-main">
        {/* LEFT COLUMN */}
        <div>
          {/* Overview */}
          <div ref={overviewRef}>
            <div className="detail-header">
              <p className="detail-region">
                <svg className="detail-region-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                {tPrefecture(accom.prefecture, i18n.language)} · {tCity(accom.city, i18n.language)}
              </p>
              <div className="detail-title-row">
                <h1 className="detail-title">{tName(accom.name, i18n.language)}</h1>
                <div className="review-badge">
                  <span className="review-badge-score">{reviewScore}</span>
                  <div className="review-badge-info">
                    <span className="review-badge-label">{reviewScore >= 8 ? t('detail.reviewExcellent') : t('detail.reviewGood')}</span>
                    <span className="review-badge-count">{t('detail.reviewCount', { count: reviewCount })}</span>
                  </div>
                </div>
              </div>
              <div className="detail-meta">
                <span>{t('detail.maxGuests', { count: rooms.reduce((max, r) => Math.max(max, r.capacity), 0) })}</span>
                <span>{t('detail.roomCount', { count: rooms.length })}</span>
              </div>
            </div>

            {/* ── HIGHLIGHTS ── */}
            {highlights.length > 0 && (
              <div className="highlights-row">
                {highlights.slice(0, 4).map((h, i) => (
                  <div key={i} className="highlight-chip">
                    <span className="highlight-icon">{h.icon}</span>
                    <span>{h.label}</span>
                  </div>
                ))}
              </div>
            )}

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
          </div>

          <hr className="divider" />

          {/* Amenities */}
          <div ref={amenitiesRef}>
            <h3 className="detail-section-title">{t('detail.amenities')}</h3>
            <div className="amenities-grid">
              {(accom.amenities as string[]).map((a: string) => (
                <div key={a} className="amenity">
                  <span className="amenity-icon">{AMENITY_ICONS[a] || '✦'}</span>
                  {translateAmenity(a, i18n.language)}
                </div>
              ))}
            </div>
          </div>

          <hr className="divider" />

          {/* Cancellation Policy */}
          <div className="cancel-policy">
            <h4>
              <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              {t('detail.cancellationPolicy')}
            </h4>
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

          <hr className="divider" />

          {/* Rooms */}
          <div ref={roomsRef}>
            <h3 className="detail-section-title">{t('detail.selectRoom')}</h3>
            <div className="rooms-table">
              <div className="rooms-table-header">
                <span>{t('detail.roomType')}</span>
                <span>{t('detail.roomBenefits')}</span>
                <span>{t('detail.roomPriceHeader')}</span>
                <span></span>
              </div>
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className={`room-row${selectedRoom === room.id ? ' selected' : ''}`}
                >
                  <div className="room-row-name">
                    <div className="room-name">{tRoom(room.name, i18n.language)}</div>
                    <div className="room-cap">
                      <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
                      {t('detail.roomCapacity', { count: room.capacity })}
                    </div>
                  </div>
                  <div className="room-row-benefits">
                    <span className="room-benefit">{t('detail.benefitFreeCancellation')}</span>
                    {amenities.some(a => ['朝食付き', '自家製朝食'].includes(a)) && (
                      <span className="room-benefit benefit-highlight">{t('detail.benefitBreakfast')}</span>
                    )}
                  </div>
                  <div className="room-row-price">
                    <span className="room-price-main">¥{room.pricePerNight.toLocaleString()}</span>
                    <span className="room-price-unit">{t('detail.perNightShort')}</span>
                    <span className="room-price-tax">{t('detail.taxIncluded')}</span>
                  </div>
                  <div className="room-row-action">
                    <button
                      className={`room-select-btn${selectedRoom === room.id ? ' active' : ''}`}
                      onClick={() => setSelectedRoom(room.id)}
                    >
                      {selectedRoom === room.id ? t('detail.roomSelected') : t('detail.roomSelectBtn')}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <hr className="divider" />

          {/* Calendar */}
          <div ref={calendarRef} className="calendar-section">
            <h3 className="detail-section-title">{t('detail.availability')}</h3>
            <div className="calendar-mini">
              <div className="cal-header">
                <button className="cal-nav-btn" onClick={prevMonth}>‹</button>
                <span className="cal-header-title">{i18n.language === 'ja' ? `${calYear}年 ${calMonth}月` : new Date(calYear, calMonth - 1).toLocaleDateString('en-US', { year: 'numeric', month: 'long' })}</span>
                <button className="cal-nav-btn" onClick={nextMonth}>›</button>
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

        {/* RIGHT COLUMN — Booking Sidebar */}
        <div>
          <div className="booking-card-sidebar">
            <div className="sidebar-deal-badge">{t('detail.dealBadge')}</div>

            {selectedRoomObj ? (
              <div className="booking-price-row">
                <span className="booking-price">¥{selectedRoomObj.pricePerNight.toLocaleString()}</span>
                <span className="booking-price-unit">{t('detail.perNightShort')}</span>
              </div>
            ) : (
              <div className="booking-price-row">
                <span className="booking-price" style={{ fontSize: 16, color: 'var(--warm-gray)' }}>{t('detail.selectRoomPrompt')}</span>
              </div>
            )}

            <div className="sidebar-urgency">
              <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
              {t('detail.urgencyMessage')}
            </div>

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

            <div className="booking-note">
              <svg className="booking-note-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
              {t('detail.noCharge')}
            </div>

            {bookError && (
              <p style={{ fontSize: 13, color: 'var(--error)', marginBottom: 16, textAlign: 'center' }}>{bookError}</p>
            )}

            {nights > 0 && selectedRoomObj && (
              <div className="price-breakdown">
                <div className="price-row">
                  <span className="label-dotted">¥{selectedRoomObj.pricePerNight.toLocaleString()} × {t('detail.nightsCount', { count: nights })}</span>
                  <span>¥{totalPrice.toLocaleString()}</span>
                </div>
                <div className="price-row">
                  <span>{t('detail.serviceFee')}</span>
                  <span>¥0</span>
                </div>
                <div className="price-row">
                  <span>{t('detail.taxesFees')}</span>
                  <span>{t('detail.included')}</span>
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
