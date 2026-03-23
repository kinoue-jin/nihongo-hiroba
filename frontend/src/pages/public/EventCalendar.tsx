import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { lazy, Suspense, useMemo } from 'react';
import { supabase } from '../../lib/apiClient';
import type { Event, ScheduleSession } from '../../types/api';

// Lazy load FullCalendar
const FullCalendarComponent = lazy(() => import('@fullcalendar/react'));
// FullCalendar plugins are PluginDef objects, not React components
const dayGridPlugin = lazy(() =>
  import('@fullcalendar/daygrid').then(m => ({ default: m.default as any }))
);
const timeGridPlugin = lazy(() =>
  import('@fullcalendar/timegrid').then(m => ({ default: m.default as any }))
);
const listPlugin = lazy(() =>
  import('@fullcalendar/list').then(m => ({ default: m.default as any }))
);

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

export function EventCalendar() {
  const { t } = useTranslation();

  const { data: events = [] } = useQuery({
    queryKey: ['events'],
    queryFn: async () => {
      const { data, error } = await supabase.from('events').select('*');
      if (error) throw error;
      return data as Event[];
    }
  });

  const { data: sessions = [] } = useQuery({
    queryKey: ['sessions'],
    queryFn: async () => {
      const { data, error } = await supabase.from('schedule_sessions').select('*');
      if (error) throw error;
      return data as ScheduleSession[];
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
  }), [calendarEvents, dayGridPlugin, timeGridPlugin, listPlugin]);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-8">{t('calendar.title')}</h1>

      <div data-testid="calendar-container" className="bg-white rounded-lg shadow p-6">
        <Suspense fallback={
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500">{t('common.loading')}</p>
          </div>
        }>
          <FullCalendarComponent data-testid="calendar-toolbar" {...calendarOptions} />
        </Suspense>
      </div>

      {/* Legend */}
      <div className="mt-6 flex flex-wrap gap-6 text-sm">
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
