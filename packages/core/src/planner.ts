import type {
  AvailabilitySlot,
  Exam,
  Plan,
  PlannedSession,
  PlannerConfig,
  UnscheduledExam,
  UnscheduledReason,
} from './types.js'
import {
  addDays,
  addMinutes,
  atTimeOfDay,
  dayKey,
  daysBetween,
  overlaps,
  parseTimeOfDay,
  startOfDay,
  type Interval,
} from './time.js'

/**
 * Multiplicateur de volume selon la difficulte declaree de la matiere.
 * Une matiere difficile demande plus de temps a coefficient egal.
 */
const DIFFICULTY_FACTOR = {
  facile: 0.75,
  moyen: 1,
  difficile: 1.35,
} as const

/** Minutes de revision accordees par point de coefficient, a difficulte moyenne. */
const MINUTES_PER_WEIGHT_POINT = 6

/** Nombre de jours explores autour de la date ideale avant d'abandonner une session. */
const SEARCH_RADIUS_DAYS = 10

export const DEFAULT_CONFIG: Omit<PlannerConfig, 'now' | 'availability'> = {
  sessionMinutes: 60,
  breakMinutes: 15,
  maxMinutesPerDay: 180,
  cooldownMinutes: 12 * 60,
}

/** Creneaux par defaut : tous les soirs de 18h a 21h. */
export const DEFAULT_AVAILABILITY: readonly AvailabilitySlot[] = Object.freeze(
  [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, start: '18:00', end: '21:00' })),
)

/**
 * Volume de revision juge necessaire pour un examen, en minutes.
 * Arrondi au multiple superieur de la duree d'une session.
 */
export function requiredMinutes(exam: Exam, sessionMinutes: number): number {
  if (!Number.isFinite(exam.weight)) {
    throw new RangeError(
      `Coefficient invalide pour "${exam.name}" : ${exam.weight} (un nombre fini est attendu)`,
    )
  }
  if (!Number.isFinite(sessionMinutes) || sessionMinutes <= 0) {
    throw new RangeError(`Duree de session invalide : ${sessionMinutes}`)
  }
  const weight = Math.max(0, exam.weight)
  const factor = DIFFICULTY_FACTOR[exam.subject?.difficulty ?? 'moyen']
  const raw = weight * MINUTES_PER_WEIGHT_POINT * factor
  if (raw <= 0) return 0
  return Math.ceil(raw / sessionMinutes) * sessionMinutes
}

/**
 * Ajuste les decalages a la fenetre de revision reellement disponible.
 *
 * Les decalages ideaux croissent vite (jusqu'a J-55 pour dix sessions). Si
 * l'examen est plus proche que cela, les viser tels quels ferait echouer la
 * recherche de creneau et tasserait les sessions au premier jour disponible.
 * On les comprime donc proportionnellement pour qu'ils tiennent dans la
 * fenetre, en conservant l'ordre et la progression des ecarts.
 */
export function fitOffsetsToWindow(offsets: readonly number[], leadDays: number): number[] {
  const maxOffset = offsets[offsets.length - 1]
  if (maxOffset === undefined || maxOffset <= leadDays) return [...offsets]
  if (leadDays <= 0) return offsets.map(() => 0)
  const scale = leadDays / maxOffset
  return offsets.map((offset) => Math.max(0, Math.round(offset * scale)))
}

/**
 * Decalages en jours avant l'examen, du plus proche au plus lointain.
 *
 * Les ecarts croissent (1, 2, 3, 4 ... jours) ce qui produit les intervalles
 * cumules 1, 3, 6, 10, 15 ... : la revision est dense juste avant l'epreuve et
 * s'espace a mesure qu'on remonte dans le temps. C'est le principe de la
 * repetition espacee, qui favorise la memorisation a long terme.
 */
export function spacedOffsets(count: number): number[] {
  if (!Number.isInteger(count) || count < 0) {
    throw new RangeError(`Nombre de sessions invalide : ${count}`)
  }
  const offsets: number[] = []
  let cumulative = 0
  for (let i = 1; i <= count; i += 1) {
    cumulative += i
    offsets.push(cumulative)
  }
  return offsets
}

interface Window {
  startMinutes: number
  endMinutes: number
}

/** Index des creneaux de disponibilite par jour de la semaine. */
function indexAvailability(slots: readonly AvailabilitySlot[]): Map<number, Window[]> {
  const byWeekday = new Map<number, Window[]>()
  for (const slot of slots) {
    const startMinutes = parseTimeOfDay(slot.start)
    const endMinutes = parseTimeOfDay(slot.end)
    if (endMinutes <= startMinutes) {
      throw new RangeError(
        `Creneau invalide : ${slot.start}-${slot.end} (la fin doit suivre le debut)`,
      )
    }
    const windows = byWeekday.get(slot.weekday) ?? []
    windows.push({ startMinutes, endMinutes })
    byWeekday.set(slot.weekday, windows)
  }
  for (const windows of byWeekday.values()) {
    windows.sort((a, b) => a.startMinutes - b.startMinutes)
  }
  return byWeekday
}

/** Suit les sessions deja placees afin d'eviter chevauchements et surcharge. */
class Calendar {
  private readonly booked = new Map<string, Interval[]>()
  private readonly minutesUsed = new Map<string, number>()

  book(interval: Interval): void {
    const key = dayKey(interval.start)
    const intervals = this.booked.get(key) ?? []
    intervals.push(interval)
    intervals.sort((a, b) => a.start.getTime() - b.start.getTime())
    this.booked.set(key, intervals)
    const minutes = (interval.end.getTime() - interval.start.getTime()) / 60_000
    this.minutesUsed.set(key, (this.minutesUsed.get(key) ?? 0) + minutes)
  }

  intervalsOn(day: Date): readonly Interval[] {
    return this.booked.get(dayKey(day)) ?? []
  }

  minutesOn(day: Date): number {
    return this.minutesUsed.get(dayKey(day)) ?? 0
  }
}

/**
 * Cherche un creneau libre d'une journee donnee.
 * Retourne null si la journee ne peut pas accueillir la session.
 */
function findSlotOnDay(
  day: Date,
  windows: readonly Window[],
  calendar: Calendar,
  config: PlannerConfig,
  earliest: Date,
  latest: Date,
): Interval | null {
  if (calendar.minutesOn(day) + config.sessionMinutes > config.maxMinutesPerDay) {
    return null
  }
  const booked = calendar.intervalsOn(day)

  for (const window of windows) {
    const windowStart = atTimeOfDay(day, window.startMinutes)
    const windowEnd = atTimeOfDay(day, window.endMinutes)
    const upperBound = windowEnd < latest ? windowEnd : latest

    let cursor = windowStart < earliest ? earliest : windowStart

    while (addMinutes(cursor, config.sessionMinutes) <= upperBound) {
      const candidate: Interval = {
        start: cursor,
        end: addMinutes(cursor, config.sessionMinutes),
      }
      const clash = booked.find((taken) =>
        overlaps(candidate, {
          start: addMinutes(taken.start, -config.breakMinutes),
          end: addMinutes(taken.end, config.breakMinutes),
        }),
      )
      if (!clash) return candidate
      cursor = addMinutes(clash.end, config.breakMinutes)
    }
  }
  return null
}

/**
 * Genere un planning de revision pour un ensemble d'examens.
 *
 * Garanties :
 * - aucune session dans le passe, ni apres la date de l'examen concerne ;
 * - aucun chevauchement entre deux sessions, y compris pour des examens differents ;
 * - les creneaux de disponibilite et le plafond journalier sont respectes ;
 * - le volume de revision depend du coefficient et de la difficulte de la matiere.
 *
 * Les examens les plus proches sont servis en premier : en cas de penurie de
 * creneaux, ce sont les echeances lointaines qui cedent, pas l'inverse.
 */
export function planRevisions(
  exams: readonly Exam[],
  config: PlannerConfig,
): Plan {
  const windowsByWeekday = indexAvailability(config.availability)
  const calendar = new Calendar()
  const sessions: PlannedSession[] = []
  const unscheduled: UnscheduledExam[] = []
  let requestedMinutes = 0

  const sorted = [...exams].sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
  )

  for (const exam of sorted) {
    const examDate = new Date(exam.date)
    if (Number.isNaN(examDate.getTime())) {
      throw new RangeError(`Date d'examen invalide pour "${exam.name}" : ${exam.date}`)
    }

    const needed = requiredMinutes(exam, config.sessionMinutes)
    requestedMinutes += needed
    if (needed === 0) continue

    const total = needed / config.sessionMinutes
    const deadline = addMinutes(examDate, -config.cooldownMinutes)

    const addFailure = (missing: number, reason: UnscheduledReason): void => {
      if (missing > 0) {
        unscheduled.push({ examId: exam.id, examName: exam.name, missing, reason })
      }
    }

    if (deadline <= config.now) {
      addFailure(total, 'examen-passe')
      continue
    }
    if (windowsByWeekday.size === 0) {
      addFailure(total, 'aucune-disponibilite')
      continue
    }

    const leadDays = daysBetween(config.now, deadline)
    const offsets = fitOffsetsToWindow(spacedOffsets(total), leadDays)
    let placed = 0

    for (let index = 1; index <= total; index += 1) {
      const offset = offsets[index - 1] ?? index
      const idealDay = addDays(startOfDay(examDate), -offset)
      let booked: Interval | null = null

      // On explore les journees autour de la date idéale, en privilegiant
      // d'abord la date exacte, puis les jours anterieurs (plus de marge).
      for (let radius = 0; radius <= SEARCH_RADIUS_DAYS && !booked; radius += 1) {
        const candidates = radius === 0 ? [0] : [-radius, radius]
        for (const delta of candidates) {
          const day = addDays(idealDay, delta)
          if (startOfDay(day) > startOfDay(deadline)) continue
          if (startOfDay(day) < startOfDay(config.now)) continue

          const windows = windowsByWeekday.get(day.getDay())
          if (!windows) continue

          const slot = findSlotOnDay(day, windows, calendar, config, config.now, deadline)
          if (slot) {
            booked = slot
            break
          }
        }
      }

      // Repli : si la date ideale et son voisinage sont satures, on balaye
      // toute la fenetre restante plutot que d'abandonner la session. Sans ce
      // repli, une session etait declaree "temps-insuffisant" alors que des
      // creneaux libres subsistaient ailleurs.
      if (!booked) {
        for (let day = startOfDay(config.now); day <= deadline; day = addDays(day, 1)) {
          const windows = windowsByWeekday.get(day.getDay())
          if (!windows) continue
          const slot = findSlotOnDay(day, windows, calendar, config, config.now, deadline)
          if (slot) {
            booked = slot
            break
          }
        }
      }

      if (!booked) continue

      calendar.book(booked)
      sessions.push({
        examId: exam.id,
        examName: exam.name,
        start: booked.start,
        end: booked.end,
        index,
        total,
        daysBeforeExam: daysBetween(booked.start, examDate),
      })
      placed += 1
    }

    addFailure(total - placed, 'temps-insuffisant')
  }

  sessions.sort((a, b) => a.start.getTime() - b.start.getTime())

  return {
    sessions,
    diagnostics: {
      requestedMinutes,
      scheduledMinutes: sessions.length * config.sessionMinutes,
      unscheduled,
    },
  }
}
