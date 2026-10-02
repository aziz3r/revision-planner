import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { login } from '../store/authSlice'
import { useAppDispatch, useAppSelector } from '../store'
import { ErrorBanner } from '../components/ErrorBanner'

export default function LoginPage() {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { session, loading, error } = useAppSelector((state) => state.auth)
  const [identifier, setIdentifier] = useState('demo@revision-planner.local')
  const [password, setPassword] = useState('Demo1234!')

  if (session) return <Navigate to="/" replace />

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const result = await dispatch(login({ identifier, password }))
    if (login.fulfilled.match(result)) navigate('/', { replace: true })
  }

  return (
    <div className="auth-wrap">
      <div className="card">
        <div className="card-header"><h2>{t('auth.loginTitle')}</h2></div>
        <div className="card-body">
          <ErrorBanner message={error} />
          <form onSubmit={onSubmit}>
            <div className="field">
              <label htmlFor="identifier">{t('auth.email')}</label>
              <input
                id="identifier" type="email" autoComplete="username" required
                value={identifier} onChange={(e) => setIdentifier(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="password">{t('auth.password')}</label>
              <input
                id="password" type="password" autoComplete="current-password" required
                value={password} onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            <button type="submit" className="btn primary" disabled={loading} style={{ width: '100%' }}>
              {loading ? t('common.loading') : t('auth.submitLogin')}
            </button>
          </form>
          <p className="small muted center" style={{ marginTop: 14 }}>{t('auth.demoHint')}</p>
          <p className="small center">
            {t('auth.toRegister')} <Link to="/inscription">{t('auth.registerTitle')}</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
