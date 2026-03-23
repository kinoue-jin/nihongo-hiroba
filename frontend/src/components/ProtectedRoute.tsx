import { Navigate, useLocation } from '@tanstack/react-router'
import { useQuery } from '@tanstack/react-query'
import { fastapi } from '../lib/apiClient'

interface UserRole {
  role: 'admin' | 'staff' | 'learner' | 'member'
}

async function fetchUserRole(): Promise<UserRole | null> {
  try {
    const res = await fastapi.get('/auth/me')
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

interface ProtectedRouteProps {
  children: React.ReactNode
  allowedRoles?: Array<'admin' | 'staff' | 'learner' | 'member'>
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const location = useLocation()

  const { data: user, isLoading } = useQuery({
    queryKey: ['userRole'],
    queryFn: fetchUserRole,
    retry: false,
  })

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/" replace />
  }

  return <>{children}</>
}
