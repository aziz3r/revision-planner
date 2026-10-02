import { useEffect } from 'react'
import { dismiss } from '../store/toastSlice'
import { useAppDispatch, useAppSelector } from '../store'

const AUTO_DISMISS_MS = 5000

/** Pile de notifications non bloquantes, en remplacement des `alert()`. */
export function Toaster() {
  const toasts = useAppSelector((state) => state.toasts)
  const dispatch = useAppDispatch()

  useEffect(() => {
    if (toasts.length === 0) return
    const timers = toasts.map((toast) =>
      window.setTimeout(() => dispatch(dismiss(toast.id)), AUTO_DISMISS_MS),
    )
    return () => timers.forEach(window.clearTimeout)
  }, [toasts, dispatch])

  if (toasts.length === 0) return null

  return (
    <div className="toasts" role="status" aria-live="polite">
      {toasts.map((toast) => (
        <div key={toast.id} className={`toast ${toast.kind}`}>
          <span style={{ flex: 1 }}>{toast.message}</span>
          <button type="button" onClick={() => dispatch(dismiss(toast.id))} aria-label="Fermer">
            &times;
          </button>
        </div>
      ))}
    </div>
  )
}
