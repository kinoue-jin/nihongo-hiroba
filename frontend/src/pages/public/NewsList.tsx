import { useTranslation } from 'react-i18next';
import { Link } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/apiClient';
import type { News } from '../../types/api';

export function NewsList() {
  const { t } = useTranslation();

  const { data: news, isLoading } = useQuery({
    queryKey: ['news'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .eq('is_published', true)
        .order('published_at', { ascending: false });
      if (error) throw error;
      return data as News[];
    }
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">{t('news.title')}</h1>

      {isLoading ? (
        <p className="text-center text-gray-500 py-8">{t('common.loading')}</p>
      ) : news && news.length > 0 ? (
        <div data-testid="news-list" className="space-y-6">
          {news.map((item) => (
            <Link
              key={item.id}
              to="/news/$newsId"
              params={{ newsId: item.id ?? '' }}
              data-testid="news-item"
              className="block bg-white border border-gray-200 rounded-lg p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-center gap-4 mb-3">
                <time className="text-sm text-gray-500">
                  {item.published_at ? new Date(item.published_at).toLocaleDateString('ja-JP', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  }) : ''}
                </time>
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                {item.title}
              </h2>
              <p className="text-gray-600 line-clamp-3">{item.body}</p>
              <span className="mt-4 inline-block text-indigo-600 hover:text-indigo-800">
                {t('news.readMore')} →
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <p className="text-center text-gray-500 py-8">{t('news.noNews')}</p>
      )}
    </div>
  );
}
