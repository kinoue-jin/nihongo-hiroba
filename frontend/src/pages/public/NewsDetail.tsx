import { useParams, Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/apiClient';
import type { News } from '../../types/api';

export function NewsDetail() {
  const { newsId } = useParams({ from: '/news/$newsId' });
  const { t } = useTranslation();

  const { data: news, isLoading } = useQuery({
    queryKey: ['news', newsId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .eq('id', newsId)
        .single();
      if (error) throw error;
      return data as News;
    }
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-center text-gray-500">{t('common.loading')}</p>
      </div>
    );
  }

  if (!news) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-center text-gray-500">{t('news.noNews')}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        to="/news"
        className="inline-block mb-6 text-indigo-600 hover:text-indigo-800"
      >
        ← {t('news.title')}
      </Link>

      <article className="bg-white rounded-lg shadow-lg p-8">
        <header className="mb-8 pb-8 border-b border-gray-200">
          <time className="text-sm text-gray-500">
            {new Date(news.published_at).toLocaleDateString('ja-JP', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </time>
          <h1 data-testid="news-detail-title" className="mt-4 text-3xl font-bold text-gray-900">
            {news.title}
          </h1>
        </header>

        <div data-testid="news-detail-body" className="prose prose-indigo max-w-none">
          <p className="whitespace-pre-wrap text-gray-700 leading-relaxed">
            {news.body}
          </p>
        </div>
      </article>
    </div>
  );
}
