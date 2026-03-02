import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { accommodationApi } from '../lib/api';
import '../styles/home.css';

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

interface RegionHero {
  name: string;
  image: string;
}

const REGION_HEROES: Record<string, RegionHero> = {
  '北海道': { name: '小樽運河', image: 'https://images.unsplash.com/photo-1534678275982-a3989afe85e6?w=1200' },
  '東北':   { name: '銀山温泉', image: 'https://images.unsplash.com/photo-1670736990625-ac75a09397cd?w=1200' },
  '北陸':   { name: '白川郷',   image: 'https://images.unsplash.com/photo-1559430819-b07798465e35?w=1200' },
  '四国':   { name: '道後温泉', image: 'https://images.unsplash.com/photo-1700325347467-8767c512ecd1?w=1200' },
  '九州':   { name: '高千穂峡', image: 'https://images.unsplash.com/photo-1699073141845-5c6436fde432?w=1200' },
};

const REGIONS = Object.keys(REGION_HEROES);

export function HomePage({ onNavigate, searchParams }: HomePageProps) {
  const [location, setLocation] = useState(searchParams?.location ?? '');
  const [checkIn, setCheckIn] = useState(searchParams?.checkIn ?? '');
  const [checkOut, setCheckOut] = useState(searchParams?.checkOut ?? '');
  const [guests, setGuests] = useState(2);
  const [activeRegion, setActiveRegion] = useState('北海道');
  const [searchQuery, setSearchQuery] = useState<Record<string, string>>(
    searchParams ? Object.fromEntries(Object.entries(searchParams).filter(([, v]) => v)) : {}
  );

  const currentHero = REGION_HEROES[activeRegion];
  const today = new Date().toISOString().split('T')[0];

  const { data } = useQuery({
    queryKey: ['accommodations', searchQuery],
    queryFn: () => accommodationApi.list(Object.keys(searchQuery).length > 0 ? searchQuery : undefined),
  });

  const accommodations: AccommodationCard[] = data?.data ?? [];

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    const params: Record<string, string> = {};
    if (location) params.location = location;
    if (checkIn) params.checkIn = checkIn;
    if (checkOut) params.checkOut = checkOut;
    if (guests) params.guests = String(guests);
    setSearchQuery(params);
  };

  const updateGuests = (delta: number) => {
    setGuests((g) => Math.max(1, Math.min(10, g + delta)));
  };

  return (
    <>
      {/* HERO */}
      <section className="hero">
        <div className="hero-left">
          <p className="eyebrow">Japan's local stays</p>
          <h1 className="hero-title">
            知らなかった<br />
            日本と、<em>出会う</em>
          </h1>
          <p className="hero-desc">
            有名観光地では味わえない、地域の暮らしに根ざした宿泊体験を。
            全国の個性豊かな宿から、ひとつの場所を。
          </p>

          {/* SEARCH CARD */}
          <form className="search-card" onSubmit={handleSearch}>
            <div className="search-row">
              <div className="field-group full">
                <label className="search-label">目的地・エリア</label>
                <input
                  type="text"
                  className="field-input"
                  placeholder="例) 京都、落合、白川町..."
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
              </div>
            </div>
            <div className="search-row">
              <div className="field-group">
                <label className="search-label">チェックイン</label>
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
                <label className="search-label">チェックアウト</label>
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
              <label className="search-label">宿泊人数</label>
              <div className="guests-row">
                <span className="guests-label">大人</span>
                <div className="guests-ctrl">
                  <button type="button" className="guests-btn" onClick={() => updateGuests(-1)}>−</button>
                  <span className="guests-count">{guests}</span>
                  <button type="button" className="guests-btn" onClick={() => updateGuests(1)}>＋</button>
                </div>
              </div>
            </div>
            <button type="submit" className="search-btn">宿泊先を探す</button>
          </form>
        </div>

        <div className="hero-right">
          <div className="hero-img-main" key={activeRegion}>
            <img
              src={currentHero.image}
              alt={currentHero.name}
            />
            <div className="hero-caption">
              <span className="hero-caption-name">{currentHero.name}</span>
              <span className="hero-caption-region">{activeRegion}</span>
            </div>
          </div>
          <div className="region-pills">
            {REGIONS.map((r) => (
              <button
                key={r}
                className={`pill${activeRegion === r ? ' active' : ''}`}
                onClick={() => setActiveRegion(r)}
              >
                {r}
              </button>
            ))}
          </div>
          <div className="hero-tag">
            <div className="hero-tag-num">1,240+</div>
            <div className="hero-tag-txt">全国の登録宿泊施設</div>
          </div>
        </div>
      </section>

      {/* LISTINGS */}
      <section className="section-listings">
        <div className="section-header">
          <h2 className="section-title">注目の宿泊施設</h2>
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
                  <span className="listing-badge">{a.amenities[0]}</span>
                )}
              </div>
              <p className="listing-region">{a.prefecture} · {a.city}</p>
              <h3 className="listing-name">{a.name}</h3>
              <div className="listing-meta">
                <span>最大{a.maxCapacity}名</span>
              </div>
              <div className="listing-price">
                <span className="price-num">¥{a.minPrice?.toLocaleString() ?? '—'}</span>
                <span className="price-unit">/ 泊〜</span>
              </div>
            </button>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="site-footer">
        <div className="footer-logo">Trip<span>Local</span></div>
        <p className="footer-copy">© 2026 TripLocal, Inc. — 日本の地域旅行をもっと身近に</p>
      </footer>
    </>
  );
}
