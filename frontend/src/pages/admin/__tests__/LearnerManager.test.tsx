import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { LearnerManager } from '../LearnerManager'

vi.mock('@tanstack/react-query', () => ({
  QueryClient: class {
    invalidateQueries = vi.fn()
  },
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => children,
  useQueryClient: () => ({
    invalidateQueries: vi.fn()
  }),
  useQuery: ({ queryKey }: { queryKey: string[] }) => {
    if (queryKey[0] === 'learners') {
      return {
        data: [
          { id: '1', nickname: 'テスト1', email: 'test1@example.com', invitation_status: 'active', origin_country: 'USA', arrived_japan: '2020-01-01' },
          { id: '2', nickname: 'テスト2', email: 'test2@example.com', invitation_status: 'pending', origin_country: 'UK', arrived_japan: '2021-06-15' },
        ],
        isLoading: false,
      }
    }
    return { data: null, isLoading: false }
  },
  useMutation: () => ({
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    isSuccess: false,
  }),
}))

vi.mock('../../../lib/apiClient', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    order: vi.fn().mockReturnThis(),
    insert: vi.fn().mockResolvedValue({ data: null, error: null }),
    update: vi.fn().mockResolvedValue({ data: null, error: null }),
    delete: vi.fn().mockResolvedValue({ data: null, error: null }),
  },
  fastapi: {
    post: vi.fn().mockResolvedValue({ ok: true, json: async () => ({}) }),
  },
}))

function TestWrapper({ children }: { children: React.ReactNode }) {
  return (
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  )
}

describe('LearnerManager', () => {
  it('renders learner manager title', () => {
    render(<TestWrapper><LearnerManager /></TestWrapper>)
    expect(screen.getByText('学習者管理')).toBeTruthy()
  })

  it('renders invitation form', () => {
    render(<TestWrapper><LearnerManager /></TestWrapper>)
    expect(screen.getByText('新規招待')).toBeTruthy()
    expect(screen.getByPlaceholderText('招待するメールアドレス')).toBeTruthy()
  })

  it('renders learner list', async () => {
    render(<TestWrapper><LearnerManager /></TestWrapper>)

    await waitFor(() => {
      expect(screen.getByText('test1@example.com')).toBeTruthy()
      expect(screen.getByText('test2@example.com')).toBeTruthy()
    })
  })

  it('shows status badges', async () => {
    render(<TestWrapper><LearnerManager /></TestWrapper>)

    await waitFor(() => {
      expect(screen.getAllByText('アクティブ').length).toBeGreaterThan(0)
      expect(screen.getAllByText('保留中').length).toBeGreaterThan(0)
    })
  })
})
