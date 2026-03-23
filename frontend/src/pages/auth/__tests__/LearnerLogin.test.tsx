import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { LearnerLogin } from '../LearnerLogin'

const mockNavigate = vi.fn()
vi.mock('@tanstack/react-router', () => ({
  useNavigate: () => mockNavigate,
}))

vi.mock('../../../lib/apiClient', () => ({
  supabase: {
    auth: {
      signInWithPassword: vi.fn(),
    },
  },
}))

describe('LearnerLogin', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders login form', () => {
    render(<MemoryRouter><LearnerLogin /></MemoryRouter>)
    expect(screen.getByText('学習者ログイン')).toBeTruthy()
    expect(screen.getByLabelText('メールアドレス')).toBeTruthy()
    expect(screen.getByLabelText('パスワード')).toBeTruthy()
  })

  it('shows error message on login failure', async () => {
    const { supabase } = await import('../../../lib/apiClient')
    ;(supabase.auth.signInWithPassword as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      error: { message: 'Invalid credentials' },
    })

    render(<MemoryRouter><LearnerLogin /></MemoryRouter>)
    fireEvent.change(screen.getByLabelText('メールアドレス'), { target: { value: 'test@example.com' } })
    fireEvent.change(screen.getByLabelText('パスワード'), { target: { value: 'wrong' } })
    fireEvent.click(screen.getByText('ログイン'))

    await waitFor(() => {
      expect(screen.getByText('Invalid credentials')).toBeTruthy()
    })
  })

  it('navigates to mypage on successful login', async () => {
    const { supabase } = await import('../../../lib/apiClient')
    ;(supabase.auth.signInWithPassword as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      error: null,
    })

    render(<MemoryRouter><LearnerLogin /></MemoryRouter>)
    fireEvent.change(screen.getByLabelText('メールアドレス'), { target: { value: 'test@example.com' } })
    fireEvent.change(screen.getByLabelText('パスワード'), { target: { value: 'password' } })
    fireEvent.click(screen.getByText('ログイン'))

    await waitFor(() => {
      expect(mockNavigate).toHaveBeenCalledWith({ to: '/learner/mypage' })
    })
  })
})
