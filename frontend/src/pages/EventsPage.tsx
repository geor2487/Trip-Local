import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { eventApi } from '../lib/api';
import '../styles/events.css';

interface EventsPageProps {
  onNavigate: (page: string, params?: Record<string, string>) => void;
  searchParams?: Record<string, string>;
}

interface EventCard {
  id: string;
  title: string;
  coverImage: string;
  category: string;
  city: string;
  prefecture: string;
  location: string;
  date: string;
  price: number;
  capacity: number;
  registrationCount: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const CATEGORIES = [
  { value: '', label: 'すべて' },
  { value: '文化体験', label: '文化体験' },
  { value: 'アウトドア', label: 'アウトドア' },
  { value: '食', label: '食' },
  { value: 'ワークショップ', label: 'ワークショップ' },
  { value: '祭り', label: '祭り' },
  { value: 'その他', label: 'その他' },
];

function formatEventDate(dateStr: string): string {
  const d = new Date(dateStr);
  const dow = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];
  const month = d.getMonth() + 1;
  const day = d.getDate();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${month}/${day}（${dow}）${hours}:${minutes}`;
}

export function EventsPage({ onNavigate, searchParams }: EventsPageProps) {
  const [keyword, setKeyword] = useState(searchParams?.keyword ?? '');
  const [city, setCity] = useState(searchParams?.city ?? '');
  const [category, setCategory] = useState(searchParams?.category ?? '');
  const [page, setPage] = useState(1);

  // Build query params from current filter state
  const queryParams: Record<string, string> = {};
  if (keyword) queryParams.keyword = keyword;
  if (city) queryParams.city = city;
  if (category) queryParams.category = category;
  queryParams.page = String(page);

  const { data, isLoading } = useQuery({
    queryKey: ['events', queryParams],
    queryFn: () => eventApi.list(queryParams),
  });

  const events: EventCard[] = data?.data ?? [];
  const pagination: Pagination | undefined = data?.pagination;

  // Extract unique cities from results for the city filter dropdown
  const cities: string[] = data?.cities ?? [];

  const handleSearch = (e: FormEvent) => {
    e.preventDefault();
    setPage(1);
  };

  const handleCategoryChange = (value: string) => {
    setCategory(value);
    setPage(1);
  };

  return (
    <div className="events-page">
      {/* HEADER */}
      <div className="events-page-header">
        <h1 className="events-page-title">体験イベント</h1>
        <p className="events-page-sub">
          地域の文化・自然・食を五感で楽しむ体験プログラム
        </p>
      </div>

      {/* FILTERS */}
      <div className="events-filters">
        <form className="events-search-row" onSubmit={handleSearch}>
          <input
            type="text"
            className="events-search-input"
            placeholder="キーワードで探す（例: 陶芸、ハイキング、味噌作り...）"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <select
            className="events-city-select"
            value={city}
            onChange={(e) => { setCity(e.target.value); setPage(1); }}
          >
            <option value="">全エリア</option>
            {cities.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </form>

        {/* CATEGORY CHIPS */}
        <div className="events-chips">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.value}
              className={`events-chip${category === cat.value ? ' active' : ''}`}
              onClick={() => handleCategoryChange(cat.value)}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENT */}
      {isLoading ? (
        <div className="events-loading">読み込み中...</div>
      ) : events.length === 0 ? (
        <div className="events-empty">
          条件に一致するイベントが見つかりません
        </div>
      ) : (
        <>
          {/* EVENT CARDS */}
          <div className="events-grid">
            {events.map((event) => {
              const remaining = event.capacity - event.registrationCount;
              const isFew = remaining > 0 && remaining <= 5;

              return (
                <button
                  key={event.id}
                  className="event-card"
                  onClick={() => onNavigate('event-detail', { id: event.id })}
                >
                  <div className="event-card-img">
                    <img
                      src={event.coverImage}
                      alt={event.title}
                    />
                    {event.category && (
                      <span className="event-card-category">{event.category}</span>
                    )}
                  </div>
                  <div className="event-card-body">
                    <p className="event-card-date">{formatEventDate(event.date)}</p>
                    <h3 className="event-card-title">{event.title}</h3>
                    <p className="event-card-location">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      {event.location}
                    </p>
                    <div className="event-card-footer">
                      {event.price === 0 ? (
                        <span className="event-card-price free">無料</span>
                      ) : (
                        <span className="event-card-price">
                          ¥{event.price.toLocaleString()}
                        </span>
                      )}
                      {remaining <= 0 ? (
                        <span className="event-card-slots" style={{ color: 'var(--warm-gray)' }}>
                          満席
                        </span>
                      ) : (
                        <span className={`event-card-slots${isFew ? ' few' : ''}`}>
                          残り{remaining}席
                        </span>
                      )}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          {/* PAGINATION */}
          {pagination && pagination.totalPages > 1 && (
            <div className="events-pagination">
              <button
                className="events-page-btn"
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
              >
                前へ
              </button>
              {Array.from({ length: pagination.totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  className={`events-page-btn${p === page ? ' active' : ''}`}
                  onClick={() => setPage(p)}
                >
                  {p}
                </button>
              ))}
              <button
                className="events-page-btn"
                disabled={page >= pagination.totalPages}
                onClick={() => setPage((p) => p + 1)}
              >
                次へ
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
