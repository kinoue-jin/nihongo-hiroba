import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { MemoryRouter } from 'react-router-dom';
import { EventCalendar } from '../EventCalendar';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      // Map translation keys to Japanese text for testing
      const translations: Record<string, string> = {
        'calendar.title': 'イベントカレンダー',
        'common.loading': '読み込み中...',
      }
      return translations[key] || key
    },
    i18n: { language: 'ja' }
  })
}))

// Mock @tanstack/react-query
vi.mock('@tanstack/react-query', () => ({
  QueryClient: class {
    invalidateQueries = vi.fn()
  },
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => children,
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useQuery: ({ queryKey }: { queryKey: string[] }) => {
    if (queryKey[0] === 'events') {
      return { data: [], isLoading: false }
    }
    if (queryKey[0] === 'sessions') {
      return { data: [], isLoading: false }
    }
    return { data: [], isLoading: false }
  },
}))

// Mock supabase
vi.mock('../../../lib/apiClient', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockResolvedValue({
        data: [],
        error: null
      })
    })
  }
}))

// Mock FullCalendar
vi.mock('@fullcalendar/react', () => ({
  default: vi.fn().mockReturnValue(null)
}));

vi.mock('@fullcalendar/daygrid', () => ({
  default: {}
}));

vi.mock('@fullcalendar/timegrid', () => ({
  default: {}
}));

vi.mock('@fullcalendar/list', () => ({
  default: {}
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: Infinity,
        retry: false
      }
    }
  });

  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>
        {children}
      </MemoryRouter>
    </QueryClientProvider>
  );
};

describe('EventCalendar', () => {
  it('renders the calendar title', () => {
    const Wrapper = createWrapper();
    render(<EventCalendar />, { wrapper: Wrapper });

    expect(screen.getByText('イベントカレンダー')).toBeInTheDocument();
  });

  it('renders legend items', () => {
    const Wrapper = createWrapper();
    render(<EventCalendar />, { wrapper: Wrapper });

    expect(screen.getByText('イベント')).toBeInTheDocument();
    expect(screen.getByText('学習セッション')).toBeInTheDocument();
  });
});
