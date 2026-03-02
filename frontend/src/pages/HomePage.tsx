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
  const [searchQuery, setSearchQuery] = useState<Record<string, string>>(
    searchParams ? Object.fromEntries(Object.entries(searchParams).filter(([, v]) => v)) : {}
  );

  const currentHero = REGION_HEROES[activeRegion];
  const today = new Date().toISOString().split('T')[0];
  const sentinelRef = useRef<HTMLDivElement>(null);

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
      {/* HERO */}
      <section className="hero">
        <div className="hero-left">
          <p className="eyebrow">{t('home.eyebrow')}</p>
          <h1 className="hero-title">
            {t('home.heroTitle1')}<br />
            {t('home.heroTitle2')}<em>{t('home.heroTitle3')}</em>
          </h1>
          <p className="hero-desc">
            {t('home.heroDesc')}
          </p>

          {/* SEARCH CARD */}
          <form className="search-card" onSubmit={handleSearch}>
            <div className="search-row">
              <div className="field-group full">
                <label className="search-label">{t('home.searchDestination')}</label>
                <input
                  type="text"
                  className="field-input"
                  placeholder={t('home.searchDestinationPlaceholder')}
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            </div>
            <div className="search-row">
              <div className="field-group">
                <label className="search-label">{t('home.checkIn')}</label>
                <input
                  type="date"
                  className="field-input"
                  min={today}
                  value={checkIn}
                  onChange={(e) => {
                    setCheckIn(e.target.value);
                    if (checkOut && e.target.value >= checkOut) setCheckOut('');
                  }}
                />
              </div>
              <div className="field-group">
                <label className="search-label">{t('home.checkOut')}</label>
                <input
                  type="date"
                  className="field-input"
                  min={checkIn || today}
                  value={checkOut}
                  onChange={(e) => setCheckOut(e.target.value)}
                />
              </div>
            </div>
            <div className="field-group" style={{ marginBottom: 0 }}>
              <label className="search-label">{t('home.guests')}</label>
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
            <button type="submit" className="search-btn">{t('home.searchButton')}</button>
          </form>
        </div>

        <div className="hero-right">
          <div className="hero-img-main" key={activeRegion}>
            <img
              src={currentHero.image}
              alt={t(currentHero.nameKey)}
            />
            <div className="hero-caption">
              <span className="hero-caption-name">{t(currentHero.nameKey)}</span>
              <span className="hero-caption-region">{t(`home.regions.${activeRegion}.name`)}</span>
            </div>
          </div>
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
          <div className="hero-tag">
            <div className="hero-tag-num">1,240+</div>
            <div className="hero-tag-txt">{t('home.totalProperties')}</div>
          </div>
        </div>
      </section>

      {/* LISTINGS */}
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
                {a.amenities[0] && (
                  <span className="listing-badge">{translateAmenity(a.amenities[0], i18n.language)}</span>
                )}
              </div>
              <p className="listing-region">{tPrefecture(a.prefecture, i18n.language)} · {tCity(a.city, i18n.language)}</p>
              <h3 className="listing-name">{tName(a.name, i18n.language)}</h3>
              <div className="listing-meta">
                <span>{t('home.maxGuests', { count: a.maxCapacity ?? 0 })}</span>
              </div>
              <div className="listing-price">
                <span className="price-num">¥{a.minPrice?.toLocaleString() ?? '—'}{i18n.language === 'ja' ? '〜' : '+'}</span>
                <span className="price-unit">{t('home.perNightUnit')}</span>
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

      {/* FOOTER */}
      <footer className="site-footer">
        <div className="footer-logo">Trip<span>Local</span></div>
        <p className="footer-copy">{t('home.footerCopy')}</p>
      </footer>
    </>
  );
}
