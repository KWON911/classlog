import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../lib/hooks/useAuth'

export function ProtectedRoute() {
  const { session, loading } = useAuth()

  if (loading) {
    return <p className="p-6">로딩 중...</p>
  }

  if (!session) {
    return <Navigate to="/login" replace />
  }

  return <Outlet />
}
