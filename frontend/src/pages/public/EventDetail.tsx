import { useParams, Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../../lib/apiClient';
import type { Event } from '../../types/api';

export function EventDetail() {
  const { eventId } = useParams({ from: '/events/$eventId' });
  const { t } = useTranslation();

  const { data: event, isLoading } = useQuery({
    queryKey: ['events', eventId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('events')
        .select('*')
        .eq('id', eventId)
        .single();
      if (error) throw error;
      return data as Event;
    }
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-center text-gray-500">{t('common.loading')}</p>
      </div>
    );
  }

  if (!event) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <p className="text-center text-gray-500">{t('events.noEvents')}</p>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <Link
        to="/events"
        className="inline-block mb-6 text-indigo-600 hover:text-indigo-800"
      >
        ← {t('events.title')}
      </Link>

      <article className="bg-white rounded-lg shadow-lg p-8">
        <header className="mb-8 pb-8 border-b border-gray-200">
          <time className="text-sm text-indigo-600 font-medium">
            {new Date(event.date).toLocaleDateString('ja-JP', {
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            })}
          </time>
          <h1 className="mt-4 text-3xl font-bold text-gray-900">
            {event.title}
          </h1>
        </header>

        <dl className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div>
            <dt className="text-sm font-medium text-gray-500">{t('events.date')}</dt>
            <dd className="mt-1 text-lg text-gray-900">
              {new Date(event.date).toLocaleDateString('ja-JP', {
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </dd>
          </div>

          <div>
            <dt className="text-sm font-medium text-gray-500">時間</dt>
            <dd className="mt-1 text-lg text-gray-900">
              {event.start_time} - {event.end_time}
            </dd>
          </div>

          <div>
            <dt className="text-sm font-medium text-gray-500">{t('events.venue')}</dt>
            <dd className="mt-1 text-lg text-gray-900">{event.venue}</dd>
          </div>

          {event.max_capacity && (
            <div>
              <dt className="text-sm font-medium text-gray-500">{t('events.capacity')}</dt>
              <dd className="mt-1 text-lg text-gray-900">
                {event.actual_attendees ?? 0} / {event.max_capacity}
              </dd>
            </div>
          )}
        </dl>
      </article>
    </div>
  );
}
