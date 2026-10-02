import type { ReactElement } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAppSelector } from '../store'

export function RequireAuth({ children }: { children: ReactElement }) {
  const session = useAppSelector((state) => state.auth.session)
  const location = useLocation()

  if (!session) {
    return <Navigate to="/connexion" replace state={{ from: location.pathname }} />
  }
  return children
}
