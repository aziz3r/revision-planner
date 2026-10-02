/** Utilitaires de dates, volontairement sans dependance externe. */

export const MINUTE = 60_000
export const DAY = 24 * 60 * MINUTE

/** Cle de journee locale, au format "YYYY-MM-DD". */
export function dayKey(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function startOfDay(d: Date): Date {
  const out = new Date(d)
  out.setHours(0, 0, 0, 0)
  return out
}

export function addDays(d: Date, days: number): Date {
  const out = new Date(d)
  out.setDate(out.getDate() + days)
  return out
}

export function addMinutes(d: Date, minutes: number): Date {
  return new Date(d.getTime() + minutes * MINUTE)
}

/** Nombre de jours calendaires entiers entre deux instants. */
export function daysBetween(from: Date, to: Date): number {
  return Math.round((startOfDay(to).getTime() - startOfDay(from).getTime()) / DAY)
}

/**
 * Convertit une heure "HH:mm" en minutes depuis minuit.
 * Leve une erreur sur une valeur invalide : un creneau mal saisi doit echouer
 * explicitement plutot que de produire un planning silencieusement faux.
 */
export function parseTimeOfDay(value: string): number {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim())
  if (!match) throw new RangeError(`Heure invalide : "${value}" (format attendu "HH:mm")`)
  const hours = Number(match[1])
  const minutes = Number(match[2])
  if (hours > 23 || minutes > 59) {
    throw new RangeError(`Heure invalide : "${value}"`)
  }
  return hours * 60 + minutes
}

/** Applique une heure "HH:mm" a une journee donnee. */
export function atTimeOfDay(day: Date, minutesFromMidnight: number): Date {
  const out = startOfDay(day)
  return addMinutes(out, minutesFromMidnight)
}

export interface Interval {
  start: Date
  end: Date
}

export function overlaps(a: Interval, b: Interval): boolean {
  return a.start < b.end && b.start < a.end
}

export function durationMinutes(i: Interval): number {
  return (i.end.getTime() - i.start.getTime()) / MINUTE
}
