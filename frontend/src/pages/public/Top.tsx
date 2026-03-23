import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/apiClient';
import type { News, Event } from '../../types/api';

export function Top() {
  const { t } = useTranslation();

  const { data: news } = useQuery({
    queryKey: ['news'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .eq('is_published', true)
        .order('published_at', { ascending: false })
        .limit(5);
      if (error) throw error;
      return data as News[];
    }
  });

  const { data: events } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .order('date', { ascending: true })
        .limit(5);
      if (error) throw error;
      return data as Event[];
    }
  });

  return (
    <div data-testid="main-content" className="bg-white">
      {/* Hero Section */}
      <section className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
          <h1 className="text-5xl font-bold mb-6">{t('top.title')}</h1>
          <p className="text-xl text-indigo-100 mb-8 max-w-2xl mx-auto">
            {t('top.subtitle')}
          </p>
          <div className="flex justify-center gap-4">
            <Link
              to="/events"
              className="px-6 py-3 bg-white text-indigo-600 font-semibold rounded-lg hover:bg-indigo-50 transition-colors"
            >
              {t('nav.events')}
            </Link>
            <Link
              to="/about"
              className="px-6 py-3 border-2 border-white text-white font-semibold rounded-lg hover:bg-white/10 transition-colors"
            >
              {t('top.about')}
            </Link>
          </div>
        </div>
      </section>

      {/* Recent News */}
      <section data-testid="news-section" className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div data-testid="news-list" className="flex justify-between items-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900">{t('top.recentNews')}</h2>
          <Link
            to="/news"
            className="text-indigo-600 hover:text-indigo-800 font-medium"
          >
            {t('top.viewMore')} →
          </Link>
        </div>
        {news && news.length > 0 ? (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {news.map((item) => (
              <Link
                key={item.id}
                to="/news/$newsId"
                params={{ newsId: item.id ?? '' }}
                className="block bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
              >
                <time className="text-sm text-gray-500">
                  {item.published_at ? new Date(item.published_at).toLocaleDateString('ja-JP') : ''}
                </time>
                <h3 className="mt-2 text-xl font-semibold text-gray-900 line-clamp-2">
                  {item.title}
                </h3>
                <p className="mt-3 text-gray-600 line-clamp-3">{item.body}</p>
                <span className="mt-4 inline-block text-indigo-600 hover:text-indigo-800">
                  {t('news.readMore')}
                </span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center py-8">{t('news.noNews')}</p>
        )}
      </section>

      {/* Upcoming Events */}
      <section className="bg-gray-50 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold text-gray-900">{t('top.upcomingEvents')}</h2>
            <Link
              to="/events"
              className="text-indigo-600 hover:text-indigo-800 font-medium"
            >
              {t('top.viewMore')} →
            </Link>
          </div>
          {events && events.length > 0 ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => (
                <Link
                  key={event.id}
                  to="/events/$eventId"
                  params={{ eventId: event.id ?? '' }}
                  className="block bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
                >
                  <time className="text-sm text-indigo-600 font-medium">
                    {event.date ? new Date(event.date).toLocaleDateString('ja-JP', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    }) : ''}
                  </time>
                  <h3 className="mt-2 text-xl font-semibold text-gray-900">
                    {event.title}
                  </h3>
                  <p className="mt-2 text-gray-600">
                    {event.start_time} - {event.end_time}
                  </p>
                  <p className="mt-1 text-gray-500 text-sm">{event.venue}</p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">{t('events.noEvents')}</p>
          )}
        </div>
      </section>

      {/* About Preview */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-3xl font-bold text-gray-900 mb-6">{t('top.about')}</h2>
          <p className="text-lg text-gray-600 mb-8">
            にほんごひろばは、日本語学習者と日本人メンバーが 함께学ぶ交流の場です。
             다양한イベントを通じて、異文化間の理解を深めましょう。
          </p>
          <Link
            to="/about"
            className="inline-block px-6 py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors"
          >
            {t('top.about')} →
          </Link>
        </div>
      </section>
    </div>
  );
}
