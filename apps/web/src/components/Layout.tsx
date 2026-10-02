import { NavLink, Outlet } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { logout } from '../store/authSlice'
import { useAppDispatch, useAppSelector } from '../store'
import { Toaster } from './Toaster'

export function Layout() {
  const { t, i18n } = useTranslation()
  const dispatch = useAppDispatch()
  const session = useAppSelector((state) => state.auth.session)

  return (
    <div className="app-shell">
      <header className="topbar">
        <span className="brand">{t('app.title')}</span>
        <nav>
          <NavLink to="/" end>{t('nav.dashboard')}</NavLink>
          <NavLink to="/examens">{t('nav.exams')}</NavLink>
          <NavLink to="/disponibilites">{t('nav.availability')}</NavLink>
        </nav>
        <div className="actions">
          <button
            type="button"
            className="btn small"
            onClick={() => void i18n.changeLanguage(i18n.language.startsWith('fr') ? 'en' : 'fr')}
          >
            {i18n.language.startsWith('fr') ? 'EN' : 'FR'}
          </button>
          {session && (
            <button type="button" className="btn small" onClick={() => dispatch(logout())}>
              {t('nav.logout')}
            </button>
          )}
        </div>
      </header>
      <main>
        <Outlet />
      </main>
      <Toaster />
    </div>
  )
}
