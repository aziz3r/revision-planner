import type { AvailabilitySlot, Exam, PlannerConfig } from '@revision-planner/core'
import { DEFAULT_AVAILABILITY, DEFAULT_CONFIG } from '@revision-planner/core'
import type { ExamDto, StudentDto } from '../../api/types'

/** Traduit un examen de l'API vers le modele attendu par le moteur. */
export function toCoreExam(exam: ExamDto): Exam {
  return {
    id: exam.documentId,
    name: exam.name,
    date: exam.date,
    weight: exam.weight,
    ...(exam.subject
      ? {
          subject: {
            id: exam.subject.documentId,
            name: exam.subject.name,
            difficulty: exam.subject.difficulty,
          },
        }
      : {}),
  }
}

function isAvailabilitySlot(value: unknown): value is AvailabilitySlot {
  if (typeof value !== 'object' || value === null) return false
  const slot = value as Partial<AvailabilitySlot>
  return (
    typeof slot.weekday === 'number' &&
    slot.weekday >= 0 &&
    slot.weekday <= 6 &&
    typeof slot.start === 'string' &&
    typeof slot.end === 'string'
  )
}

/**
 * Construit la configuration du moteur depuis le profil etudiant.
 *
 * Le champ `availability` est un JSON libre cote Strapi : son contenu est donc
 * valide ici plutot que suppose. Une saisie corrompue retombe sur les
 * creneaux par defaut au lieu de faire echouer la generation.
 */
export function toPlannerConfig(student: StudentDto | null, now = new Date()): PlannerConfig {
  const stored = Array.isArray(student?.availability) ? student.availability : []
  const availability = stored.filter(isAvailabilitySlot)

  return {
    ...DEFAULT_CONFIG,
    now,
    availability: availability.length > 0 ? availability : DEFAULT_AVAILABILITY,
    sessionMinutes: student?.sessionMinutes ?? DEFAULT_CONFIG.sessionMinutes,
    maxMinutesPerDay: student?.maxMinutesPerDay ?? DEFAULT_CONFIG.maxMinutesPerDay,
  }
}
