import { useState, type FormEvent } from 'react'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { register } from '../store/authSlice'
import { useAppDispatch, useAppSelector } from '../store'
import { ErrorBanner } from '../components/ErrorBanner'

export default function RegisterPage() {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const navigate = useNavigate()
  const { session, loading, error } = useAppSelector((state) => state.auth)
  const [form, setForm] = useState({ username: '', email: '', password: '' })

  if (session) return <Navigate to="/" replace />

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    const result = await dispatch(register(form))
    if (register.fulfilled.match(result)) navigate('/', { replace: true })
  }

  return (
    <div className="auth-wrap">
      <div className="card">
        <div className="card-header"><h2>{t('auth.registerTitle')}</h2></div>
        <div className="card-body">
          <ErrorBanner message={error} />
          <form onSubmit={onSubmit}>
            <div className="field">
              <label htmlFor="username">{t('auth.username')}</label>
              <input
                id="username" required minLength={3} value={form.username}
                onChange={(e) => setForm({ ...form, username: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="email">{t('auth.email')}</label>
              <input
                id="email" type="email" required value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>
            <div className="field">
              <label htmlFor="new-password">{t('auth.password')}</label>
              <input
                id="new-password" type="password" required minLength={8} autoComplete="new-password"
                value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
            <button type="submit" className="btn primary" disabled={loading} style={{ width: '100%' }}>
              {loading ? t('common.loading') : t('auth.submitRegister')}
            </button>
          </form>
          <p className="small center" style={{ marginTop: 14 }}>
            {t('auth.toLogin')} <Link to="/connexion">{t('auth.loginTitle')}</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
