import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { createExam, deleteExam, fetchExams, updateExam, type ExamInput } from '../store/examsSlice'
import { fetchSubjects } from '../store/referenceSlice'
import { notify } from '../store/toastSlice'
import { useAppDispatch, useAppSelector } from '../store'
import { ErrorBanner } from '../components/ErrorBanner'
import type { ExamDto, ExamKind } from '../api/types'

const KINDS: readonly ExamKind[] = ['controle', 'partiel', 'final', 'oral', 'projet']

/** Convertit une date ISO vers la valeur attendue par <input type="datetime-local">. */
function toLocalInput(iso: string): string {
  const date = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`
}

const emptyForm: ExamInput = {
  name: '',
  date: '',
  weight: 10,
  kind: 'controle',
  notes: '',
  subject: null,
}

export default function ExamsPage() {
  const { t, i18n } = useTranslation()
  const dispatch = useAppDispatch()
  const { items: exams, loading, error } = useAppSelector((state) => state.exams)
  const subjects = useAppSelector((state) => state.reference.subjects)
  const [editing, setEditing] = useState<string | null>(null)
  const [form, setForm] = useState<ExamInput>(emptyForm)

  useEffect(() => {
    void dispatch(fetchExams())
    void dispatch(fetchSubjects())
  }, [dispatch])

  const startCreate = () => {
    setEditing('new')
    setForm(emptyForm)
  }

  const startEdit = (exam: ExamDto) => {
    setEditing(exam.documentId)
    setForm({
      name: exam.name,
      date: toLocalInput(exam.date),
      weight: exam.weight,
      kind: exam.kind,
      notes: exam.notes ?? '',
      subject: exam.subject?.documentId ?? null,
    })
  }

  const submit = async () => {
    const payload: ExamInput = { ...form, date: new Date(form.date).toISOString() }
    try {
      if (editing === 'new') {
        await dispatch(createExam(payload)).unwrap()
        dispatch(notify(t('exams.created'), 'success'))
      } else if (editing) {
        await dispatch(updateExam({ documentId: editing, changes: payload })).unwrap()
        dispatch(notify(t('exams.updated'), 'success'))
      }
      setEditing(null)
      await dispatch(fetchExams())
    } catch (cause) {
      dispatch(notify(cause instanceof Error ? cause.message : String(cause), 'error'))
    }
  }

  const remove = async (exam: ExamDto) => {
    if (!window.confirm(t('exams.confirmDelete'))) return
    try {
      await dispatch(deleteExam(exam.documentId)).unwrap()
      dispatch(notify(t('exams.deleted'), 'success'))
    } catch (cause) {
      dispatch(notify(cause instanceof Error ? cause.message : String(cause), 'error'))
    }
  }

  const formatter = new Intl.DateTimeFormat(i18n.language, { dateStyle: 'medium', timeStyle: 'short' })

  return (
    <>
      <h1>{t('exams.title')}</h1>
      <p className="subtitle">{t('app.tagline')}</p>
      <ErrorBanner message={error} onRetry={() => void dispatch(fetchExams())} />

      <div className="actions" style={{ marginBottom: 18 }}>
        <button type="button" className="btn primary" onClick={startCreate}>
          {t('exams.add')}
        </button>
      </div>

      {editing && (
        <section className="card" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <h2>{editing === 'new' ? t('exams.add') : t('exams.edit')}</h2>
          </div>
          <div className="card-body">
            <form
              onSubmit={(event) => {
                event.preventDefault()
                void submit()
              }}
            >
              <div className="field">
                <label htmlFor="name">{t('exams.name')}</label>
                <input
                  id="name" required value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                />
              </div>
              <div className="field-row">
                <div className="field">
                  <label htmlFor="date">{t('exams.date')}</label>
                  <input
                    id="date" type="datetime-local" required value={form.date}
                    onChange={(e) => setForm({ ...form, date: e.target.value })}
                  />
                </div>
                <div className="field">
                  <label htmlFor="weight">{t('exams.weight')}</label>
                  <input
                    id="weight" type="number" min={1} max={100} required value={form.weight}
                    onChange={(e) => setForm({ ...form, weight: Number(e.target.value) })}
                  />
                </div>
              </div>
              <div className="field-row">
                <div className="field">
                  <label htmlFor="kind">{t('exams.kind')}</label>
                  <select
                    id="kind" value={form.kind}
                    onChange={(e) => setForm({ ...form, kind: e.target.value as ExamKind })}
                  >
                    {KINDS.map((kind) => (
                      <option key={kind} value={kind}>{t(`kinds.${kind}`)}</option>
                    ))}
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="subject">{t('exams.subject')}</label>
                  <select
                    id="subject" value={form.subject ?? ''}
                    onChange={(e) => setForm({ ...form, subject: e.target.value || null })}
                  >
                    <option value="">{t('exams.none')}</option>
                    {subjects.map((subject) => (
                      <option key={subject.documentId} value={subject.documentId}>
                        {subject.name} — {t(`difficulty.${subject.difficulty}`)}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="field">
                <label htmlFor="notes">{t('exams.notes')}</label>
                <textarea
                  id="notes" rows={2} value={form.notes ?? ''}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                />
              </div>
              <div className="actions">
                <button type="submit" className="btn primary">{t('exams.save')}</button>
                <button type="button" className="btn" onClick={() => setEditing(null)}>
                  {t('exams.cancel')}
                </button>
              </div>
            </form>
          </div>
        </section>
      )}

      <section className="card">
        <div className="card-body">
          {loading && <p className="small muted">{t('common.loading')}</p>}
          {!loading && exams.length === 0 && <p className="small muted">{t('dashboard.empty')}</p>}
          {exams.map((exam) => (
            <div className="exam-row" key={exam.documentId}>
              <span className="dot" style={{ background: exam.subject?.color ?? '#4f46e5' }} />
              <div className="info">
                <div className="name">{exam.name}</div>
                <div className="meta">
                  {formatter.format(new Date(exam.date))} · {t(`kinds.${exam.kind}`)} ·{' '}
                  {t('dashboard.weight')} {exam.weight}
                  {exam.subject ? ` · ${exam.subject.name}` : ''}
                </div>
              </div>
              <div className="actions">
                <button type="button" className="btn small" onClick={() => startEdit(exam)}>
                  {t('exams.edit')}
                </button>
                <button type="button" className="btn small danger" onClick={() => void remove(exam)}>
                  {t('exams.delete')}
                </button>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  )
}
