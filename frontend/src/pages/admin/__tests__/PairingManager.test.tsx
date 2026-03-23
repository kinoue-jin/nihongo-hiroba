import { describe, it, expect, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { MemoryRouter } from 'react-router-dom'
import { PairingManager } from '../PairingManager'

vi.mock('@tanstack/react-query', () => ({
  QueryClient: class {
    invalidateQueries = vi.fn()
  },
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => children,
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useQuery: ({ queryKey, enabled }: { queryKey: string[]; enabled?: boolean }) => {
    if (queryKey[0] === 'pairingSessions') {
      return {
        data: [
          { id: 's1', date: '2024-01-15', venue: 'Library', class_type_id: 'c1' },
          { id: 's2', date: '2024-01-22', venue: 'Community Center', class_type_id: 'c2' },
        ],
        isLoading: false,
      }
    }
    if (queryKey[0] === 'registeredMembers' && enabled) {
      return {
        data: [
          { id: 'm1', name: 'メンバー1', registered_at: '2024-01-10' },
          { id: 'm2', name: 'メンバー2', registered_at: '2024-01-11' },
        ],
        isLoading: false,
      }
    }
    if (queryKey[0] === 'registeredLearners' && enabled) {
      return {
        data: [
          { id: 'l1', nickname: '学習者1', registered_at: '2024-01-09' },
          { id: 'l2', nickname: '学習者2', registered_at: '2024-01-08' },
        ],
        isLoading: false,
      }
    }
    return { data: null, isLoading: false }
  },
  useMutation: () => ({
    mutate: vi.fn(),
    isPending: false,
  }),
}))

vi.mock('../../../lib/apiClient', () => ({
  supabase: {
    from: vi.fn().mockReturnThis(),
    select: vi.fn().mockReturnThis(),
    eq: vi.fn().mockReturnThis(),
    order: vi.fn().mockResolvedValue({ data: [] }),
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

describe('PairingManager', () => {
  it('renders pairing manager title', () => {
    render(<TestWrapper><PairingManager /></TestWrapper>)
    expect(screen.getByText('ペアリング管理')).toBeTruthy()
  })

  it('renders session selector', () => {
    render(<TestWrapper><PairingManager /></TestWrapper>)
    expect(screen.getByText('セッションを選択')).toBeTruthy()
  })

  it('shows sessions in dropdown', async () => {
    render(<TestWrapper><PairingManager /></TestWrapper>)

    await waitFor(() => {
      expect(screen.getByText('2024-01-15 - Library')).toBeTruthy()
    })
  })
})
