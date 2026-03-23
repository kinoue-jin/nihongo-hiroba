import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { ProtectedRoute } from '../../../components/ProtectedRoute'

const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return { ...actual, useNavigate: () => mockNavigate }
})

// Mock @tanstack/react-query
vi.mock('@tanstack/react-query', () => ({
  QueryClient: class {
    invalidateQueries = vi.fn()
  },
  QueryClientProvider: ({ children }: { children: React.ReactNode }) => children,
  useQueryClient: () => ({ invalidateQueries: vi.fn() }),
  useQuery: () => ({ data: null, isLoading: false }),
}))

// Mock apiClient
vi.mock('../../../lib/apiClient', () => ({
  fastapi: {
    get: vi.fn().mockResolvedValue({ ok: false }),
  },
}))

function TestWrapper({ children, initialPath = '/' }: { children: React.ReactNode; initialPath?: string }) {
  const queryClient = new QueryClient()
  return (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route path="/" element={<div>Home Page</div>} />
          <Route path="/admin" element={children} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
}

describe('ProtectedRoute', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders children when user is authenticated with correct role', async () => {
    // Override the useQuery mock for this test
    vi.mock('@tanstack/react-query', () => ({
      QueryClient: class {
        invalidateQueries = vi.fn()
      },
      QueryClientProvider: ({ children }: { children: React.ReactNode }) => children,
      useQueryClient: () => ({ invalidateQueries: vi.fn() }),
      useQuery: () => ({
        data: { role: 'admin' },
        isLoading: false
      }),
    }))

    render(
      <TestWrapper initialPath="/admin">
        <ProtectedRoute allowedRoles={['admin']}>Admin Content</ProtectedRoute>
      </TestWrapper>
    )

    await screen.findByText('Admin Content')
    expect(screen.getByText('Admin Content')).toBeTruthy()
  })
})
