import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Top } from '../Top';

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      // Map translation keys to Japanese text for testing
      const translations: Record<string, string> = {
        'top.title': 'にほんごひろば',
        'top.subtitle': '日本語学習者と日本人メンバーの交流の場',
        'nav.events': 'イベント',
        'top.about': 'について',
        'top.recentNews': '最新のお知らせ',
        'top.viewMore': 'もっと見る',
        'news.noNews': 'まだお知らせはありません',
        'top.upcomingEvents': '今後のイベント',
        'top.noEvents': 'まだイベントはありません',
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
    if (queryKey[0] === 'news') {
      return { data: [], isLoading: false }
    }
    if (queryKey[0] === 'events') {
      return { data: [], isLoading: false }
    }
    return { data: [], isLoading: false }
  },
}))

// Mock @tanstack/react-router
vi.mock('@tanstack/react-router', () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
  useRouter: () => ({ navigate: vi.fn() }),
}))

// Mock supabase
vi.mock('../../../lib/apiClient', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockResolvedValue({
        data: [],
        error: null
      })
    })
  }
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
      {children}
    </QueryClientProvider>
  );
};

describe('Top', () => {
  it('renders the hero section', () => {
    const Wrapper = createWrapper();
    render(<Top />, { wrapper: Wrapper });

    expect(screen.getByText('にほんごひろば')).toBeInTheDocument();
    expect(screen.getByText(/日本語学習者と日本人メンバーの交流の場/)).toBeInTheDocument();
  });

  it('renders section headings', () => {
    const Wrapper = createWrapper();
    render(<Top />, { wrapper: Wrapper });

    expect(screen.getByText('最新のお知らせ')).toBeInTheDocument();
  });

  it('renders navigation links', () => {
    const Wrapper = createWrapper();
    render(<Top />, { wrapper: Wrapper });

    expect(screen.getByText('イベント')).toBeInTheDocument();
  });
});
