import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { LearnerMyPage } from '../LearnerMyPage'

// Mock @tanstack/react-query - must include ALL exports used by the component
vi.mock('@tanstack/react-query', () => ({
  QueryClient: class {
    invalidateQueries = vi.fn()
  },
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => children,
  useQuery: () => {
    // Return loading state initially for all queries
    return { data: undefined, isLoading: true }
  },
  useMutation: () => ({
    mutate: vi.fn(),
    isPending: false,
    isError: false,
    isSuccess: false,
  }),
}))

// Mock apiClient
vi.mock('../../../lib/apiClient', () => ({
  supabase: {
    auth: {
      getSession: vi.fn().mockResolvedValue({ data: { session: { access_token: 'test' } } }),
      signOut: vi.fn().mockResolvedValue({ error: null }),
    },
  },
  fastapi: {
    get: vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({}),
    }),
  },
}))

function TestWrapper({ children }: { children: React.ReactNode }) {
  const queryClient = new QueryClient()
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  )
}

describe('LearnerMyPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    render(<TestWrapper><LearnerMyPage /></TestWrapper>)
    // Just verify the component renders (shows loading spinner)
    expect(document.querySelector('.animate-spin')).toBeTruthy()
  })
})
