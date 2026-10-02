import { useTranslation } from 'react-i18next'
import type { Plan } from '@revision-planner/core'

interface Props {
  plan: Plan
  busy: boolean
  onConfirm: () => void
  onCancel: () => void
}

/**
 * Previsualisation du planning avant enregistrement.
 *
 * L'etudiant voit ce qui va etre cree, ainsi que les sessions que le moteur
 * n'a pas pu placer et pourquoi. La version precedente ecrivait directement
 * en base puis affichait un `alert('Plan genere')`, sans montrer le resultat
 * ni signaler les echecs partiels.
 */
export function PlanPreview({ plan, busy, onConfirm, onCancel }: Props) {
  const { t, i18n } = useTranslation()
  const formatter = new Intl.DateTimeFormat(i18n.language, {
    weekday: 'short',
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })

  return (
    <section className="card" style={{ marginTop: 20 }} aria-labelledby="preview-title">
      <div className="card-header">
        <h2 id="preview-title">{t('preview.title')}</h2>
        <div className="actions">
          <button type="button" className="btn" onClick={onCancel} disabled={busy}>
            {t('preview.cancel')}
          </button>
          <button
            type="button"
            className="btn primary"
            onClick={onConfirm}
            disabled={busy || plan.sessions.length === 0}
          >
            {busy ? t('common.loading') : t('preview.confirm')}
          </button>
        </div>
      </div>
      <div className="card-body">
        <div className="stat-row">
          <div className="stat">
            <div className="value">{Math.round((plan.diagnostics.requestedMinutes / 60) * 10) / 10} h</div>
            <div className="label">{t('preview.requested')}</div>
          </div>
          <div className="stat">
            <div className="value">{Math.round((plan.diagnostics.scheduledMinutes / 60) * 10) / 10} h</div>
            <div className="label">{t('preview.scheduled')}</div>
          </div>
          <div className="stat">
            <div className="value">{plan.sessions.length}</div>
            <div className="label">{t('dashboard.sessions', { count: plan.sessions.length })}</div>
          </div>
        </div>

        {plan.diagnostics.unscheduled.length > 0 && (
          <div className="alert warn" role="alert">
            <strong>{t('preview.warnings')}</strong>
            <ul style={{ margin: '6px 0 0', paddingLeft: 20 }}>
              {plan.diagnostics.unscheduled.map((item) => (
                <li key={`${item.examId}-${item.reason}`}>
                  {item.examName} — {t(`unscheduled.${item.reason}`, { count: item.missing })}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="session-list">
          {plan.sessions.map((session) => (
            <div className="session-item" key={`${session.examId}-${session.index}`}>
              <time dateTime={session.start.toISOString()}>{formatter.format(session.start)}</time>
              <span style={{ flex: 1 }}>{session.examName}</span>
              <span className="small muted">
                {t('preview.session', { index: session.index, total: session.total })}
              </span>
              <span className="badge">{t('preview.daysBefore', { days: session.daysBeforeExam })}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
