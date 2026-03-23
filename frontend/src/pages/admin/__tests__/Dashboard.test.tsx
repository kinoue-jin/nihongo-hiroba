import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { Dashboard } from '../Dashboard'

// Mock @tanstack/react-query
vi.mock('@tanstack/react-query', () => ({
  QueryClient: class {
    invalidateQueries = vi.fn()
  },
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => children,
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useQuery: () => ({ data: null, isLoading: true }),
}))

// Mock apiClient
vi.mock('../../../lib/apiClient', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({ data: [], error: null })
        })
      })
    })
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

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading state', () => {
    render(<TestWrapper><Dashboard /></TestWrapper>)
    expect(document.querySelector('.animate-pulse')).toBeTruthy()
  })
})
