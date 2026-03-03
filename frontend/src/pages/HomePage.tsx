import { useState, useRef, useEffect, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { useInfiniteQuery } from '@tanstack/react-query';
import { accommodationApi } from '../lib/api';
import { translateAmenity } from '../lib/amenity-i18n';
import { tPrefecture, tCity, tName } from '../lib/content-i18n';
import '../styles/home.css';

const PAGE_SIZE = 6;

interface HomePageProps {
  onNavigate: (page: string, params?: Record<string, string>) => void;
  searchParams?: Record<string, string>;
}

interface AccommodationCard {
  id: string;
  name: string;
  city: string;
  prefecture: string;
  coverImage: string;
  amenities: string[];
  minPrice: number | null;
  maxCapacity: number | null;
}

const REGION_HEROES: Record<string, { nameKey: string; image: string }> = {
  hokkaido: { nameKey: 'home.regions.hokkaido.landmark', image: 'https://images.unsplash.com/photo-1534678275982-a3989afe85e6?w=1200' },
  tohoku:   { nameKey: 'home.regions.tohoku.landmark',   image: 'https://images.unsplash.com/photo-1670736990625-ac75a09397cd?w=1200' },
  hokuriku: { nameKey: 'home.regions.hokuriku.landmark',  image: 'https://images.unsplash.com/photo-1559430819-b07798465e35?w=1200' },
  shikoku:  { nameKey: 'home.regions.shikoku.landmark',   image: 'https://images.unsplash.com/photo-1700325347467-8767c512ecd1?w=1200' },
  kyushu:   { nameKey: 'home.regions.kyushu.landmark',    image: 'https://images.unsplash.com/photo-1699073141845-5c6436fde432?w=1200' },
};

const REGION_KEYS = Object.keys(REGION_HEROES);

export function HomePage({ onNavigate, searchParams }: HomePageProps) {
  const { t, i18n } = useTranslation();
  const [location, setLocation] = useState(searchParams?.location ?? '');
  const [checkIn, setCheckIn] = useState(searchParams?.checkIn ?? '');
  const [checkOut, setCheckOut] = useState(searchParams?.checkOut ?? '');
  const [guests, setGuests] = useState(2);
  const [children, setChildren] = useState(0);
  const [activeRegion, setActiveRegion] = useState('hokkaido');
  const [guestDropdownOpen, setGuestDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState<Record<string, string>>(
    searchParams ? Object.fromEntries(Object.entries(searchParams).filter(([, v]) => v)) : {}
  );

  const currentHero = REGION_HEROES[activeRegion];
  const today = new Date().toISOString().split('T')[0];
  const sentinelRef = useRef<HTMLDivElement>(null);
  const guestDropdownRef = useRef<HTMLDivElement>(null);
  const checkInRef = useRef<HTMLInputElement>(null);
  const checkOutRef = useRef<HTMLInputElement>(null);

  // Close guest dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (guestDropdownRef.current && !guestDropdownRef.current.contains(e.target as Node)) {
        setGuestDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteQuery({
    queryKey: ['accommodations', searchQuery],
    queryFn: ({ pageParam = 1 }) => {
      const params: Record<string, string> = {
        ...searchQuery,
        page: String(pageParam),
        limit: String(PAGE_SIZE),
      };
      return accommodationApi.list(params);
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage: any) => {
      const { page, totalPages } = lastPage.pagination;
      return page < totalPages ? page + 1 : undefined;
    },
  });

  const accommodations: AccommodationCard[] = data?.pages.flatMap((p: any) => p.data) ?? [];

  const fetchRef = useRef(fetchNextPage);
  const hasNextRef = useRef(hasNextPage);
  const fetchingRef = useRef(isFetchingNextPage);
  useEffect(() => { fetchRef.current = fetchNextPage; }, [fetchNextPage]);
  useEffect(() => { hasNextRef.current = hasNextPage; }, [hasNextPage]);
  useEffect(() => { fetchingRef.current = isFetchingNextPage; }, [isFetchingNextPage]);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextRef.current && !fetchingRef.current) {
          fetchRef.current();
        }
      },
      { rootMargin: '200px' },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    setGuestDropdownOpen(false);
    const params: Record<string, string> = {};
    if (location) params.location = location;
    if (checkIn) params.checkIn = checkIn;
    if (checkOut) params.checkOut = checkOut;
    if (guests) params.guests = String(guests);
    if (children) params.children = String(children);
    setSearchQuery(params);
  };

  const updateGuests = (delta: number) => {
    setGuests((g) => Math.max(1, Math.min(10, g + delta)));
  };

  const updateChildren = (delta: number) => {
    setChildren((c) => Math.max(0, Math.min(10, c + delta)));
  };

  return (
    <>
      {/* ── HERO ── */}
      <section className="hero">
        <div className="hero-bg" key={activeRegion}>
          <img src={currentHero.image} alt={t(currentHero.nameKey)} />
          <div className="hero-overlay" />
        </div>

        <div className="hero-content">
          <p className="eyebrow">{t('home.eyebrow')}</p>
          <h1 className="hero-title">
            {t('home.heroTitle1')}<br />
            {t('home.heroTitle2')}<em>{t('home.heroTitle3')}</em>
          </h1>
          <p className="hero-subtitle">{t('home.heroSubtitle')}</p>

          {/* Agoda-style vertical search card */}
          <form className="search-card" onSubmit={handleSearch}>
            {/* Destination */}
            <div className="sc-field">
              <label className="sc-label">{t('home.searchDestination')}</label>
              <div className="sc-input-wrap">
                <svg className="sc-icon" width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
                <select
                  className="sc-input sc-select"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                >
                  <option value="">{t('home.allAreas')}</option>
                  {REGION_KEYS.map((r) => (
                    <option key={r} value={t(`home.regions.${r}.name`)}>{t(`home.regions.${r}.name`)}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Dates row */}
            <div className="sc-dates-row">
              <div className="sc-date-field" onClick={() => checkInRef.current?.showPicker()}>
                <svg className="sc-icon" width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <div>
                  <div className="sc-date-label">{t('home.checkIn')}</div>
                  <input
                    ref={checkInRef}
                    type="date"
                    className="sc-date-input"
                    min={today}
                    value={checkIn}
                    onChange={(e) => {
                      setCheckIn(e.target.value);
                      if (checkOut && e.target.value >= checkOut) setCheckOut('');
                    }}
                  />
                </div>
              </div>
              <div className="sc-date-divider" />
              <div className="sc-date-field" onClick={() => checkOutRef.current?.showPicker()}>
                <svg className="sc-icon" width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg>
                <div>
                  <div className="sc-date-label">{t('home.checkOut')}</div>
                  <input
                    ref={checkOutRef}
                    type="date"
                    className="sc-date-input"
                    min={checkIn || today}
                    value={checkOut}
                    onChange={(e) => setCheckOut(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* Guests */}
            <div className="sc-field sc-field--guests" ref={guestDropdownRef}>
              <div className="sc-input-wrap" onClick={() => setGuestDropdownOpen(!guestDropdownOpen)} role="button" tabIndex={0}>
                <svg className="sc-icon" width="18" height="18" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                <span className="sc-guests-text">{t('home.guestsDropdownLabel', { adults: guests, children })}</span>
                <svg className="sc-chevron" width="12" height="12" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
              </div>
              {guestDropdownOpen && (
                <div className="guests-dropdown">
                  <div className="guests-row">
                    <span className="guests-label">{t('home.adults')}</span>
                    <div className="guests-ctrl">
                      <button type="button" className="guests-btn" onClick={() => updateGuests(-1)}>-</button>
                      <span className="guests-count">{guests}</span>
                      <button type="button" className="guests-btn" onClick={() => updateGuests(1)}>+</button>
                    </div>
                  </div>
                  <div className="guests-row">
                    <span className="guests-label">{t('home.children')}</span>
                    <div className="guests-ctrl">
                      <button type="button" className="guests-btn" onClick={() => updateChildren(-1)}>-</button>
                      <span className="guests-count">{children}</span>
                      <button type="button" className="guests-btn" onClick={() => updateChildren(1)}>+</button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <button type="submit" className="search-btn">{t('home.searchButton')}</button>
          </form>
        </div>

        {/* Region pills */}
        <div className="region-pills">
          {REGION_KEYS.map((r) => (
            <button
              key={r}
              className={`pill${activeRegion === r ? ' active' : ''}`}
              onClick={() => setActiveRegion(r)}
            >
              {t(`home.regions.${r}.name`)}
            </button>
          ))}
        </div>
      </section>

      {/* ── TRUST / STATS ── */}
      <section className="trust-section">
        <h2 className="trust-heading">{t('home.trustHeading')}</h2>
        <div className="trust-stats">
          <div className="trust-stat">
            <span className="trust-stat-num">1,240+</span>
            <span className="trust-stat-label">{t('home.statsProperties')}</span>
          </div>
          <div className="trust-stat">
            <span className="trust-stat-num">5</span>
            <span className="trust-stat-label">{t('home.statsRegions')}</span>
          </div>
          <div className="trust-stat">
            <span className="trust-stat-num">15</span>
            <span className="trust-stat-label">{t('home.statsPrefectures')}</span>
          </div>
          <div className="trust-stat">
            <span className="trust-stat-num">10+</span>
            <span className="trust-stat-label">{t('home.statsExperiences')}</span>
          </div>
        </div>
      </section>

      {/* ── POPULAR DESTINATIONS ── */}
      <section className="destinations-section">
        <h2 className="section-title">{t('home.popularDestinations')}</h2>
        <div className="destinations-grid">
          {REGION_KEYS.map((r) => (
            <button
              key={r}
              className="destination-card"
              onClick={() => {
                setLocation(t(`home.regions.${r}.name`));
                setSearchQuery({ location: t(`home.regions.${r}.name`) });
              }}
            >
              <div className="destination-img">
                <img src={REGION_HEROES[r].image} alt={t(`home.regions.${r}.name`)} />
                <div className="destination-overlay" />
              </div>
              <div className="destination-info">
                <h3 className="destination-name">{t(`home.regions.${r}.name`)}</h3>
                <p className="destination-landmark">{t(REGION_HEROES[r].nameKey)}</p>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* ── FEATURED LISTINGS ── */}
      <section className="section-listings">
        <div className="section-header">
          <h2 className="section-title">{t('home.featured')}</h2>
        </div>
        <div className="listings-grid">
          {accommodations.map((a) => (
            <button
              key={a.id}
              className="listing-card"
              onClick={() => onNavigate('detail', { id: a.id })}
            >
              <div className="listing-img">
                <img className="listing-img-inner" src={a.coverImage} alt={a.name} />
                {a.minPrice && (
                  <span className="listing-price-badge">
                    ¥{a.minPrice.toLocaleString()}{i18n.language === 'ja' ? '〜' : '+'}
                  </span>
                )}
                {a.amenities[0] && (
                  <span className="listing-badge">{translateAmenity(a.amenities[0], i18n.language)}</span>
                )}
              </div>
              <div className="listing-body">
                <p className="listing-region">{tPrefecture(a.prefecture, i18n.language)} · {tCity(a.city, i18n.language)}</p>
                <h3 className="listing-name">{tName(a.name, i18n.language)}</h3>
                <div className="listing-meta">
                  <span>{t('home.maxGuests', { count: a.maxCapacity ?? 0 })}</span>
                </div>
                <div className="listing-price">
                  <span className="price-num">¥{a.minPrice?.toLocaleString() ?? '—'}{i18n.language === 'ja' ? '〜' : '+'}</span>
                  <span className="price-unit">{t('home.perNightUnit')}</span>
                </div>
              </div>
            </button>
          ))}
        </div>
        <div ref={sentinelRef} style={{ height: 1 }} />
        {isFetchingNextPage && (
          <p style={{ textAlign: 'center', padding: '32px 0', color: 'var(--warm-gray)', fontSize: 14 }}>
            {t('common.loading')}
          </p>
        )}
        {accommodations.length > 0 && !hasNextPage && (
          <p style={{ textAlign: 'center', padding: '24px 0', color: 'var(--warm-gray)', fontSize: 12, letterSpacing: '0.05em' }}>
            {t('home.allLoaded')}
          </p>
        )}
        {accommodations.length === 0 && data && (
          <p style={{ textAlign: 'center', padding: '40px 0', color: 'var(--warm-gray)', fontSize: 14 }}>
            {t('home.noResults')}
          </p>
        )}
      </section>

      {/* ── FOOTER ── */}
      <footer className="site-footer">
        <div className="footer-logo">Trip<span>Local</span></div>
        <p className="footer-copy">{t('home.footerCopy')}</p>
      </footer>
    </>
  );
}
