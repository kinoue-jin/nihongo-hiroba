import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from '@tanstack/react-router';
import { useTranslation } from 'react-i18next';
import { fastapi } from '../../lib/apiClient';

interface EventType {
  id: string;
  label: string;
  value: string;
}

interface ApiEvent {
  id: string;
  title: string;
  event_type_id: string;
  date: string;
  start_time: string;
  end_time: string;
  venue: string;
  max_capacity: number | null;
  actual_attendees: number | null;
  host_member_id: string;
}

const EVENT_TYPE_FILTERS = [
  { label: '全て', value: 'all' },
  { label: 'ふるさとを語ろう', value: 'hometown' },
  { label: '文化講座', value: 'culture' },
  { label: '昼食会', value: 'lunch' },
  { label: '野外レク', value: 'outdoor' },
  { label: 'こども学習塾', value: 'kids' },
  { label: '文章を書こう', value: 'writing' },
  { label: 'その他', value: 'other' },
];

export function EventList() {
  const { t } = useTranslation();
  const [selectedType, setSelectedType] = useState<string>('all');

  const { data: events = [], isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const response = await fastapi.get('/events/');
      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }
      return await response.json() as ApiEvent[];
    },
  });

  const { data: eventTypes = [] } = useQuery({
    queryKey: ['masterItems', 'event_type'],
    queryFn: async () => {
      const response = await fastapi.get('/master/?group_key=event_type&is_active=true');
      if (!response.ok) {
        throw new Error('Failed to fetch event types');
      }
      return await response.json() as EventType[];
    },
  });

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':');
    return `${hours}:${minutes}`;
  };

  const getEventTypeLabel = (typeId: string) => {
    const type = eventTypes.find((t) => t.id === typeId);
    return type?.label || 'その他';
  };

  const filteredEvents = events.filter((event) => {
    if (selectedType === 'all') return true;
    const type = eventTypes.find((t) => t.id === event.event_type_id);
    return type?.value === selectedType;
  });

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">{t('events.title')}</h1>

      {/* Filter Buttons */}
      <div className="flex flex-wrap gap-2 mb-8">
        {EVENT_TYPE_FILTERS.map((filter) => (
          <button
            key={filter.value}
            onClick={() => setSelectedType(filter.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
              selectedType === filter.value
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            {filter.label}
          </button>
        ))}
      </div>

      {/* Events List */}
      {isLoading ? (
        <div className="text-center py-12">
          <p className="text-gray-500">{t('common.loading') || '読み込み中...'}</p>
        </div>
      ) : filteredEvents.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500">{t('events.noEvents')}</p>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredEvents.map((event) => (
            <div
              key={event.id}
              className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow"
            >
              <div className="p-6">
                {/* Event Type Badge */}
                <div className="mb-3">
                  <span className="inline-block px-3 py-1 text-xs font-medium bg-indigo-100 text-indigo-800 rounded-full">
                    {getEventTypeLabel(event.event_type_id)}
                  </span>
                </div>

                {/* Title */}
                <h3 className="text-xl font-bold text-gray-900 mb-3 line-clamp-2">
                  {event.title}
                </h3>

                {/* Date & Time */}
                <div className="mb-2">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">{t('events.date')}:</span>{' '}
                    {formatDate(event.date)} {formatTime(event.start_time)} - {formatTime(event.end_time)}
                  </p>
                </div>

                {/* Venue */}
                <div className="mb-2">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">{t('events.venue')}:</span> {event.venue}
                  </p>
                </div>

                {/* Capacity */}
                <div className="mb-4">
                  <p className="text-sm text-gray-600">
                    <span className="font-medium">{t('events.capacity')}:</span>{' '}
                    {event.max_capacity ? `${event.max_capacity}人` : '制限なし'}
                    {event.actual_attendees != null && (
                      <span className="text-gray-500 ml-2">
                        ({t('events.attendees')}: {event.actual_attendees}人)
                      </span>
                    )}
                  </p>
                </div>

                {/* Detail Button */}
                <Link
                  to="/events/$eventId"
                  params={{ eventId: event.id }}
                  className="block w-full text-center px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 transition-colors"
                >
                  詳細を見る
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
