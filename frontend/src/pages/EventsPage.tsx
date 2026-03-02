import { useState, type FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { eventApi } from '../lib/api';
import { tEventTitle, tEventLocation } from '../lib/content-i18n';
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
  { value: '' },
  { value: '文化体験' },
  { value: 'アウトドア' },
  { value: '食' },
  { value: 'ワークショップ' },
  { value: '祭り' },
  { value: 'その他' },
];

function formatEventDate(dateStr: string, lang: string): string {
  const d = new Date(dateStr);
  if (lang === 'ja') {
    const dow = ['日', '月', '火', '水', '木', '金', '土'][d.getDay()];
    const month = d.getMonth() + 1;
    const day = d.getDate();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${month}/${day}（${dow}）${hours}:${minutes}`;
  }
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short', hour: '2-digit', minute: '2-digit' });
}

export function EventsPage({ onNavigate, searchParams }: EventsPageProps) {
  const { t, i18n } = useTranslation();
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
        <h1 className="events-page-title">{t('events.title')}</h1>
        <p className="events-page-sub">
          {t('events.subtitle')}
        </p>
      </div>

      {/* FILTERS */}
      <div className="events-filters">
        <form className="events-search-row" onSubmit={handleSearch}>
          <input
            type="text"
            className="events-search-input"
            placeholder={t('events.searchPlaceholder')}
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
          <select
            className="events-city-select"
            value={city}
            onChange={(e) => { setCity(e.target.value); setPage(1); }}
          >
            <option value="">{t('events.allAreas')}</option>
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
              {cat.value === '' ? t('events.allCategories') : t(`events.categories.${cat.value}`)}
            </button>
          ))}
        </div>
      </div>

      {/* CONTENT */}
      {isLoading ? (
        <div className="events-loading">{t('common.loading')}</div>
      ) : events.length === 0 ? (
        <div className="events-empty">
          {t('events.noResults')}
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
                      <span className="event-card-category">{t(`events.categories.${event.category}`) || event.category}</span>
                    )}
                  </div>
                  <div className="event-card-body">
                    <p className="event-card-date">{formatEventDate(event.date, i18n.language)}</p>
                    <h3 className="event-card-title">{tEventTitle(event.title, i18n.language)}</h3>
                    <p className="event-card-location">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                        <circle cx="12" cy="10" r="3" />
                      </svg>
                      {tEventLocation(event.location, i18n.language)}
                    </p>
                    <div className="event-card-footer">
                      {event.price === 0 ? (
                        <span className="event-card-price free">{t('events.free')}</span>
                      ) : (
                        <span className="event-card-price">
                          ¥{event.price.toLocaleString()}
                        </span>
                      )}
                      {remaining <= 0 ? (
                        <span className="event-card-slots" style={{ color: 'var(--warm-gray)' }}>
                          {t('events.full')}
                        </span>
                      ) : (
                        <span className={`event-card-slots${isFew ? ' few' : ''}`}>
                          {t('events.remaining', { count: remaining })}
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
                {t('common.previous')}
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
                {t('common.next')}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
