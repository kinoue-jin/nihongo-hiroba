import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { Login } from '../Login'

const mockNavigate = vi.fn()
const mockFastapiPost = vi.fn()
const mockSetSession = vi.fn().mockResolvedValue({ error: null })

// Mock localStorage
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn(),
}
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock('../../../lib/apiClient', () => ({
  supabase: {
    auth: {
      setSession: (...args: unknown[]) => mockSetSession(...args),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
  },
  fastapi: {
    post: (...args: unknown[]) => mockFastapiPost(...args),
  },
}))

describe('Login', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders login form with correct title', () => {
    render(<MemoryRouter><Login /></MemoryRouter>)
    expect(screen.getByRole('heading', { name: 'にほんごひろば ログイン' })).toBeTruthy()
    expect(screen.getByLabelText('メールアドレス')).toBeTruthy()
    expect(screen.getByLabelText('パスワード')).toBeTruthy()
  })

  it('shows error message on login failure', async () => {
    mockFastapiPost.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ detail: 'Invalid credentials' }),
    })

    render(<MemoryRouter><Login /></MemoryRouter>)
    fireEvent.change(screen.getByLabelText('メールアドレス'), { target: { value: 'test@example.com' } })
    fireEvent.change(screen.getByLabelText('パスワード'), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByTestId('login-button'))

    await waitFor(() => {
      expect(mockFastapiPost).toHaveBeenCalled()
      expect(screen.getByText('Invalid credentials')).toBeTruthy()
    })
  })

  it('navigates to mypage on successful learner login', async () => {
    mockFastapiPost.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: 'test-token',
        token_type: 'bearer',
        expires_in: 3600,
        user: { id: '1', email: 'test@example.com', role: 'learner' },
      }),
    })

    render(<MemoryRouter><Login /></MemoryRouter>)
    fireEvent.change(screen.getByLabelText('メールアドレス'), { target: { value: 'test@example.com' } })
    fireEvent.change(screen.getByLabelText('パスワード'), { target: { value: 'password' } })
    fireEvent.click(screen.getByTestId('login-button'))

    await waitFor(() => {
      expect(mockFastapiPost).toHaveBeenCalled()
    })
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({ to: '/learner/mypage' })
    })
  })

  it('navigates to admin/dashboard on successful staff login', async () => {
    mockFastapiPost.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: 'test-token',
        token_type: 'bearer',
        expires_in: 3600,
        user: { id: '1', email: 'staff@example.com', role: 'staff' },
      }),
    })

    render(<MemoryRouter><Login /></MemoryRouter>)
    fireEvent.change(screen.getByLabelText('メールアドレス'), { target: { value: 'staff@example.com' } })
    fireEvent.change(screen.getByLabelText('パスワード'), { target: { value: 'password' } })
    fireEvent.click(screen.getByTestId('login-button'))

    await waitFor(() => {
      expect(mockFastapiPost).toHaveBeenCalled()
    })
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({ to: '/admin/dashboard' })
    })
  })

  it('navigates to admin/dashboard on successful admin login', async () => {
    mockFastapiPost.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        access_token: 'test-token',
        token_type: 'bearer',
        expires_in: 3600,
        user: { id: '1', email: 'admin@example.com', role: 'admin' },
      }),
    })

    render(<MemoryRouter><Login /></MemoryRouter>)
    fireEvent.change(screen.getByLabelText('メールアドレス'), { target: { value: 'admin@example.com' } })
    fireEvent.change(screen.getByLabelText('パスワード'), { target: { value: 'password' } })
    fireEvent.click(screen.getByTestId('login-button'))

    await waitFor(() => {
      expect(mockFastapiPost).toHaveBeenCalled()
    })
    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({ to: '/admin/dashboard' })
    })
  })
})
