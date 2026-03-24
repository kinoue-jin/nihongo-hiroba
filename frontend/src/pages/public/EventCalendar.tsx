import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { lazy, Suspense, useMemo } from 'react';
import { fastapi } from '../../lib/apiClient';

// Lazy load FullCalendar wrapper component only
const FullCalendarComponent = lazy(() => import('@fullcalendar/react'));
// FullCalendar plugins - direct imports (PluginDef objects, not React components)
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';

interface CalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  allDay?: boolean;
  url?: string;
  backgroundColor?: string;
  borderColor?: string;
}

interface ApiEvent {
  id: string;
  title: string;
  date: string;
  start_time: string;
  end_time: string;
}

interface ApiSession {
  id: string;
  date: string;
  start_time: string;
  end_time: string;
  is_cancelled: boolean;
}

export function EventCalendar() {
  const { t } = useTranslation();

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const response = await fastapi.get('/events/');
      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }
      return await response.json() as ApiEvent[];
    }
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const response = await fastapi.get('/sessions/');
      if (!response.ok) {
        throw new Error('Failed to fetch sessions');
      }
      return await response.json() as ApiSession[];
    }
  });

  const calendarEvents = useMemo<CalendarEvent[]>(() => {
    const eventItems: CalendarEvent[] = [
      ...events.map((event) => ({
        id: `event-${event.id}`,
        title: event.title,
        start: `${event.date}T${event.start_time}`,
        end: `${event.date}T${event.end_time}`,
        allDay: false,
        url: `/events/${event.id}`,
        backgroundColor: '#4f46e5',
        borderColor: '#4f46e5'
      })),
      ...sessions
        .filter((session) => !session.is_cancelled)
        .map((session) => ({
          id: `session-${session.id}`,
          title: `学習セッション`,
          start: `${session.date}T${session.start_time}`,
          end: `${session.date}T${session.end_time}`,
          allDay: false,
          backgroundColor: '#10b981',
          borderColor: '#10b981'
        }))
    ];
    return eventItems;
  }, [events, sessions]);

  const calendarOptions = useMemo(() => ({
    plugins: [dayGridPlugin, timeGridPlugin, listPlugin] as any,
    initialView: 'dayGridMonth',
    headerToolbar: {
      left: 'prev,next today',
      center: 'title',
      right: 'dayGridMonth,timeGridWeek,listWeek'
    },
    events: calendarEvents,
    eventClick: (info: { event: { url?: string } }) => {
      if (info.event.url) {
        window.location.href = info.event.url;
      }
    },
    locale: 'ja',
    buttonText: {
      today: '今日',
      month: '月',
      week: '週',
      list: 'リスト'
    }
  }), [calendarEvents]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 pb-24">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">{t('calendar.title')}</h1>

      <div data-testid="calendar-container" className="bg-white rounded-lg shadow p-6 mb-8">
        <Suspense fallback={
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500">{t('common.loading')}</p>
          </div>
        }>
          <div>
            <FullCalendarComponent {...calendarOptions} />
          </div>
        </Suspense>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-6 text-sm">
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-indigo-600"></span>
          <span className="text-gray-600">イベント</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-4 h-4 rounded bg-emerald-500"></span>
          <span className="text-gray-600">学習セッション</span>
        </div>
      </div>
    </div>
  );
}
