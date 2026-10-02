import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { AvailabilitySlot } from '@revision-planner/core'
import { DEFAULT_AVAILABILITY } from '@revision-planner/core'
import { fetchStudent, saveAvailability } from '../store/referenceSlice'
import { notify } from '../store/toastSlice'
import { useAppDispatch, useAppSelector } from '../store'
import { ErrorBanner } from '../components/ErrorBanner'

const WEEKDAYS = [1, 2, 3, 4, 5, 6, 0] as const

/**
 * Edition des creneaux de revision.
 *
 * Cette page n'existait pas : la version precedente planifiait toujours a 18h
 * pour une heure, sans demander ses disponibilites a l'etudiant.
 */
export default function AvailabilityPage() {
  const { t } = useTranslation()
  const dispatch = useAppDispatch()
  const { student, loading, error } = useAppSelector((state) => state.reference)
  const [slots, setSlots] = useState<AvailabilitySlot[]>([])
  const [sessionMinutes, setSessionMinutes] = useState(60)
  const [maxMinutesPerDay, setMaxMinutesPerDay] = useState(180)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    void dispatch(fetchStudent())
  }, [dispatch])

  useEffect(() => {
    if (!student) return
    setSlots(Array.isArray(student.availability) ? student.availability : [...DEFAULT_AVAILABILITY])
    setSessionMinutes(student.sessionMinutes)
    setMaxMinutesPerDay(student.maxMinutesPerDay)
  }, [student])

  const update = (index: number, patch: Partial<AvailabilitySlot>) => {
    setSlots((current) =>
      current.map((slot, position) => (position === index ? { ...slot, ...patch } : slot)),
    )
  }

  const submit = async () => {
    if (!student) return
    setSaving(true)
    try {
      await dispatch(
        saveAvailability({
          documentId: student.documentId,
          availability: slots,
          sessionMinutes,
          maxMinutesPerDay,
        }),
      ).unwrap()
      dispatch(notify(t('availability.saved'), 'success'))
    } catch (cause) {
      dispatch(notify(cause instanceof Error ? cause.message : String(cause), 'error'))
    } finally {
      setSaving(false)
    }
  }

  return (
    <>
      <h1>{t('availability.title')}</h1>
      <p className="subtitle">{t('availability.intro')}</p>
      <ErrorBanner message={error} onRetry={() => void dispatch(fetchStudent())} />

      <section className="card">
        <div className="card-body">
          {loading && <p className="small muted">{t('common.loading')}</p>}

          <div className="field-row">
            <div className="field">
              <label htmlFor="sessionMinutes">{t('availability.sessionMinutes')}</label>
              <input
                id="sessionMinutes" type="number" min={15} max={240} step={15} value={sessionMinutes}
                onChange={(e) => setSessionMinutes(Number(e.target.value))}
              />
            </div>
            <div className="field">
              <label htmlFor="maxMinutesPerDay">{t('availability.maxMinutesPerDay')}</label>
              <input
                id="maxMinutesPerDay" type="number" min={30} max={720} step={30} value={maxMinutesPerDay}
                onChange={(e) => setMaxMinutesPerDay(Number(e.target.value))}
              />
            </div>
          </div>

          {slots.length === 0 && <p className="small muted">{t('availability.empty')}</p>}

          {slots.map((slot, index) => (
            <div className="field-row" key={`${slot.weekday}-${index}`} style={{ gridTemplateColumns: '2fr 1fr 1fr auto', alignItems: 'end' }}>
              <div className="field">
                <label htmlFor={`weekday-${index}`}>{t('availability.weekday')}</label>
                <select
                  id={`weekday-${index}`} value={slot.weekday}
                  onChange={(e) => update(index, { weekday: Number(e.target.value) })}
                >
                  {WEEKDAYS.map((day) => (
                    <option key={day} value={day}>{t(`weekdays.${day}`)}</option>
                  ))}
                </select>
              </div>
              <div className="field">
                <label htmlFor={`start-${index}`}>{t('availability.start')}</label>
                <input
                  id={`start-${index}`} type="time" value={slot.start}
                  onChange={(e) => update(index, { start: e.target.value })}
                />
              </div>
              <div className="field">
                <label htmlFor={`end-${index}`}>{t('availability.end')}</label>
                <input
                  id={`end-${index}`} type="time" value={slot.end}
                  onChange={(e) => update(index, { end: e.target.value })}
                />
              </div>
              <div className="field">
                <button
                  type="button" className="btn small danger"
                  onClick={() => setSlots((current) => current.filter((_, position) => position !== index))}
                >
                  {t('availability.remove')}
                </button>
              </div>
            </div>
          ))}

          <div className="actions" style={{ marginTop: 10 }}>
            <button
              type="button" className="btn"
              onClick={() => setSlots((current) => [...current, { weekday: 1, start: '18:00', end: '20:00' }])}
            >
              {t('availability.add')}
            </button>
            <button type="button" className="btn primary" onClick={() => void submit()} disabled={saving || !student}>
              {saving ? t('common.loading') : t('availability.save')}
            </button>
          </div>
        </div>
      </section>
    </>
  )
}
