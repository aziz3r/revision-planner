import { useEffect, useMemo, useState } from 'react'
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction'
import { useTranslation } from 'react-i18next'
import type { Plan } from '@revision-planner/core'
import { fetchExams } from '../store/examsSlice'
import { fetchStudent } from '../store/referenceSlice'
import { notify } from '../store/toastSlice'
import { useAppDispatch, useAppSelector } from '../store'
import { ErrorBanner } from '../components/ErrorBanner'
import { toPlannerConfig } from '../features/planner/mapping'
import { deleteSessionsOf, previewPlan, savePlan } from '../features/planner/persist'
import { PlanPreview } from './PlanPreview'

const FALLBACK_COLOR = '#4f46e5'

export default function DashboardPage() {
  const { t, i18n } = useTranslation()
  const dispatch = useAppDispatch()
  const { items: exams, loading, error } = useAppSelector((state) => state.exams)
  const student = useAppSelector((state) => state.reference.student)
  const [plan, setPlan] = useState<Plan | null>(null)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    void dispatch(fetchExams())
    void dispatch(fetchStudent())
  }, [dispatch])

  const events = useMemo(
    () =>
      exams.flatMap((exam) => {
        const color = exam.subject?.color ?? FALLBACK_COLOR
        const examEvent = {
          id: `exam-${exam.documentId}`,
          title: `${exam.name} (${t('exams.title')})`,
          start: exam.date,
          backgroundColor: color,
          borderColor: color,
        }
        const sessionEvents = exam.sessions.map((session) => ({
          id: `session-${session.documentId}`,
          title: exam.name,
          start: session.startsAt,
          end: session.endsAt,
          backgroundColor: 'transparent',
          borderColor: color,
          textColor: color,
        }))
        return [examEvent, ...sessionEvents]
      }),
    [exams, t],
  )

  const scheduledMinutes = useMemo(
    () =>
      exams.reduce(
        (total, exam) =>
          total +
          exam.sessions.reduce(
            (sum, session) =>
              sum + (new Date(session.endsAt).getTime() - new Date(session.startsAt).getTime()) / 60000,
            0,
          ),
        0,
      ),
    [exams],
  )

  const onPreview = () => {
    try {
      setPlan(previewPlan(exams, toPlannerConfig(student)))
    } catch (cause) {
      dispatch(notify(cause instanceof Error ? cause.message : String(cause), 'error'))
    }
  }

  const onConfirm = async () => {
    if (!plan) return
    setBusy(true)
    try {
      const { created } = await savePlan(exams, plan)
      dispatch(notify(t('plan.generated', { count: created }), 'success'))
      setPlan(null)
      await dispatch(fetchExams())
    } catch (cause) {
      dispatch(notify(cause instanceof Error ? cause.message : String(cause), 'error'))
    } finally {
      setBusy(false)
    }
  }

  const onClear = async () => {
    setBusy(true)
    try {
      const removed = await deleteSessionsOf(new Set(exams.map((exam) => exam.documentId)))
      dispatch(notify(t('plan.cleared', { count: removed }), 'success'))
      await dispatch(fetchExams())
    } catch (cause) {
      dispatch(notify(cause instanceof Error ? cause.message : String(cause), 'error'))
    } finally {
      setBusy(false)
    }
  }

  const formatter = new Intl.DateTimeFormat(i18n.language, {
    dateStyle: 'medium',
    timeStyle: 'short',
  })

  return (
    <>
      <h1>{t('nav.dashboard')}</h1>
      <p className="subtitle">{t('app.tagline')}</p>
      <ErrorBanner message={error} onRetry={() => void dispatch(fetchExams())} />

      <div className="stat-row">
        <div className="stat">
          <div className="value">{exams.length}</div>
          <div className="label">{t('dashboard.upcoming')}</div>
        </div>
        <div className="stat">
          <div className="value">{Math.round((scheduledMinutes / 60) * 10) / 10} h</div>
          <div className="label">{t('dashboard.hoursPlanned')}</div>
        </div>
      </div>

      <div className="actions" style={{ marginBottom: 20 }}>
        <button type="button" className="btn primary" onClick={onPreview} disabled={exams.length === 0 || busy}>
          {t('dashboard.generate')}
        </button>
        <button type="button" className="btn danger" onClick={() => void onClear()} disabled={scheduledMinutes === 0 || busy}>
          {t('dashboard.clear')}
        </button>
      </div>

      <div className="grid-2">
        <section className="card">
          <div className="card-header"><h2>{t('dashboard.upcoming')}</h2></div>
          <div className="card-body">
            {loading && <p className="small muted">{t('common.loading')}</p>}
            {!loading && exams.length === 0 && <p className="small muted">{t('dashboard.empty')}</p>}
            {exams.map((exam) => (
              <div className="exam-row" key={exam.documentId}>
                <span className="dot" style={{ background: exam.subject?.color ?? FALLBACK_COLOR }} />
                <div className="info">
                  <div className="name">{exam.name}</div>
                  <div className="meta">
                    {formatter.format(new Date(exam.date))} · {t('dashboard.weight')} {exam.weight}
                    {exam.subject ? ` · ${exam.subject.name}` : ''}
                  </div>
                </div>
                <span className="badge">
                  {exam.sessions.length > 0
                    ? t('dashboard.sessions', { count: exam.sessions.length })
                    : t('dashboard.noPlan')}
                </span>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <div className="card-header"><h2>{t('dashboard.calendar')}</h2></div>
          <div className="card-body">
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              locale={i18n.language}
              firstDay={1}
              height="auto"
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek',
              }}
              events={events}
            />
          </div>
        </section>
      </div>

      {plan && (
        <PlanPreview
          plan={plan}
          busy={busy}
          onCancel={() => setPlan(null)}
          onConfirm={() => void onConfirm()}
        />
      )}
    </>
  )
}
