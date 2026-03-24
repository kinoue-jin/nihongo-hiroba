import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { supabase } from '../../lib/apiClient'
import { fastapi } from '../../lib/apiClient'

interface LoginResponse {
  access_token: string
  token_type: string
  expires_in: number
  user: {
    id: string
    email: string
    role: string
  }
}

export function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const response = await fastapi.post('/auth/login', { email, password })

      if (!response.ok) {
        const errorData = await response.json()
        setError(errorData.detail || 'ログインに失敗しました')
        return
      }

      const data: LoginResponse = await response.json()

      // Store JWT token in localStorage for API client
      localStorage.setItem('access_token', data.access_token)
      localStorage.setItem('user_role', data.user.role)
      localStorage.setItem('user_id', data.user.id)
      localStorage.setItem('user_email', data.user.email)

      // Try to set Supabase session (may fail if no session exists)
      try {
        await supabase.auth.setSession({
          access_token: data.access_token,
          refresh_token: '',
        })
      } catch {
        // Supabase session setting failed, but JWT is saved in localStorage
        // API calls will use JWT from localStorage via getAuthHeader()
      }

      // Redirect based on role
      if (data.user.role === 'learner') {
        navigate({ to: '/learner/mypage' })
      } else {
        navigate({ to: '/admin/dashboard' })
      }
    } catch (err) {
      console.error('Login error:', err)
      setError('ログインに失敗しました')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow">
        <div className="text-center">
          <h2 className="text-2xl font-bold">にほんごひろば ログイン</h2>
          <p className="text-gray-600 text-sm mt-2">メールアドレスとパスワードを入力</p>
        </div>
        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded">{error}</div>
        )}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              メールアドレス
            </label>
            <input
              id="email"
              data-testid="email-input"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded border px-3 py-2"
              required
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium">
              パスワード
            </label>
            <input
              id="password"
              data-testid="password-input"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded border px-3 py-2"
              required
            />
          </div>
          <button
            type="submit"
            data-testid="login-button"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {isLoading ? 'ログイン中...' : 'ログイン'}
          </button>
        </form>
      </div>
    </div>
  )
}
