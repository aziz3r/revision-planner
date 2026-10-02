import type { AvailabilitySlot, Difficulty } from '@revision-planner/core'

/** Enveloppe des reponses Strapi 5. */
export interface StrapiList<T> {
  data: T[]
  meta: { pagination?: { page: number; pageSize: number; pageCount: number; total: number } }
}
export interface StrapiSingle<T> {
  data: T
}

export interface SubjectDto {
  documentId: string
  name: string
  difficulty: Difficulty
  color: string | null
}

export type ExamKind = 'controle' | 'partiel' | 'final' | 'oral' | 'projet'

export interface SessionDto {
  documentId: string
  startsAt: string
  endsAt: string
  status: 'prevue' | 'terminee' | 'annulee'
  progress: number
  rank: number | null
  comment: string | null
}

export interface ExamDto {
  documentId: string
  name: string
  date: string
  weight: number
  kind: ExamKind
  notes: string | null
  subject: SubjectDto | null
  sessions: SessionDto[]
}

export interface StudentDto {
  documentId: string
  displayName: string
  availability: AvailabilitySlot[] | null
  sessionMinutes: number
  maxMinutesPerDay: number
}

export interface AuthResponse {
  jwt: string
  user: { id: number; username: string; email: string }
}

/**
 * Champs et relations demandes a l'API, declares une seule fois.
 *
 * La version precedente essayait plusieurs noms de relation a l'execution
 * (`['eleves', 'eleve', 'students']`) jusqu'a ce que l'API cesse de repondre
 * une erreur. Le modele est desormais fixe et versionne cote backend : il n'y
 * a plus rien a deviner.
 */
export const EXAM_QUERY = {
  fields: ['name', 'date', 'weight', 'kind', 'notes'],
  populate: {
    subject: { fields: ['name', 'difficulty', 'color'] },
    sessions: { fields: ['startsAt', 'endsAt', 'status', 'progress', 'rank', 'comment'] },
  },
  sort: ['date:asc'],
  pagination: { page: 1, pageSize: 100 },
} as const
