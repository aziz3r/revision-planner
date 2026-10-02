/** Niveau de difficulte d'une matiere, tel que saisi par l'etudiant. */
export type Difficulty = 'facile' | 'moyen' | 'difficile'

export interface Subject {
  id: string
  name: string
  difficulty: Difficulty
}

export interface Exam {
  id: string
  name: string
  /** Date et heure de l'examen, au format ISO 8601. */
  date: string
  /** Coefficient de l'examen. Plus il est eleve, plus le volume de revision est important. */
  weight: number
  /** Matiere rattachee. Sa difficulte module le volume de revision. */
  subject?: Subject
}

/** Creneau hebdomadaire recurrent pendant lequel l'etudiant accepte de reviser. */
export interface AvailabilitySlot {
  /** 0 = dimanche, 6 = samedi (identique a Date#getDay). */
  weekday: number
  /** Heure de debut, format "HH:mm". */
  start: string
  /** Heure de fin, format "HH:mm". */
  end: string
}

export interface PlannerConfig {
  /** Instant de reference. Aucune session n'est planifiee avant. */
  now: Date
  availability: readonly AvailabilitySlot[]
  /** Duree d'une session de revision, en minutes. */
  sessionMinutes: number
  /** Pause minimale entre deux sessions d'une meme journee, en minutes. */
  breakMinutes: number
  /** Plafond de revision par journee, en minutes. */
  maxMinutesPerDay: number
  /** Marge avant l'examen pendant laquelle on ne planifie plus rien, en minutes. */
  cooldownMinutes: number
}

export interface PlannedSession {
  examId: string
  examName: string
  start: Date
  end: Date
  /** Rang de la session, 1 = la plus proche de l'examen. */
  index: number
  /** Nombre total de sessions prevues pour cet examen. */
  total: number
  /** Nombre de jours entiers entre la session et l'examen. */
  daysBeforeExam: number
}

export type UnscheduledReason =
  | 'examen-passe'
  | 'aucune-disponibilite'
  | 'temps-insuffisant'

export interface UnscheduledExam {
  examId: string
  examName: string
  /** Nombre de sessions qui n'ont pas pu etre placees. */
  missing: number
  reason: UnscheduledReason
}

export interface PlanDiagnostics {
  /** Volume de revision juge necessaire, en minutes. */
  requestedMinutes: number
  /** Volume effectivement planifie, en minutes. */
  scheduledMinutes: number
  unscheduled: UnscheduledExam[]
}

export interface Plan {
  sessions: PlannedSession[]
  diagnostics: PlanDiagnostics
}
