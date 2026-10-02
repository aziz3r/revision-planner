import { useTranslation } from 'react-i18next'

interface Props {
  message: string | null
  onRetry?: (() => void) | undefined
}

/** Affiche une erreur de chargement en laissant une porte de sortie a l'usager. */
export function ErrorBanner({ message, onRetry }: Props) {
  const { t } = useTranslation()
  if (!message) return null

  return (
    <div className="alert error" role="alert">
      <strong>{t('common.error')} : </strong>
      {message}
      {onRetry && (
        <>
          {' '}
          <button type="button" className="btn small" onClick={onRetry}>
            {t('common.retry')}
          </button>
        </>
      )}
    </div>
  )
}
