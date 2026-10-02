import { describe, expect, it } from 'vitest'
import { DEFAULT_AVAILABILITY } from '@revision-planner/core'
import { toCoreExam, toPlannerConfig } from '../src/features/planner/mapping'
import type { ExamDto, StudentDto } from '../src/api/types'

const exam: ExamDto = {
  documentId: 'e1',
  name: 'Analyse',
  date: '2026-04-01T08:00:00.000Z',
  weight: 30,
  kind: 'partiel',
  notes: null,
  subject: { documentId: 's1', name: 'Maths', difficulty: 'difficile', color: '#000000' },
  sessions: [],
}

const student: StudentDto = {
  documentId: 'st1',
  displayName: 'Etudiant',
  availability: [{ weekday: 2, start: '14:00', end: '16:00' }],
  sessionMinutes: 45,
  maxMinutesPerDay: 90,
}

describe('toCoreExam', () => {
  it('transporte la matiere et sa difficulte', () => {
    expect(toCoreExam(exam).subject).toEqual({ id: 's1', name: 'Maths', difficulty: 'difficile' })
  })

  it('omet la matiere quand elle est absente', () => {
    expect(toCoreExam({ ...exam, subject: null })).not.toHaveProperty('subject')
  })
})

describe('toPlannerConfig', () => {
  it('reprend les reglages du profil', () => {
    const config = toPlannerConfig(student)
    expect(config.sessionMinutes).toBe(45)
    expect(config.maxMinutesPerDay).toBe(90)
    expect(config.availability).toEqual(student.availability)
  })

  it('retombe sur les creneaux par defaut sans profil', () => {
    expect(toPlannerConfig(null).availability).toEqual(DEFAULT_AVAILABILITY)
  })

  it('ecarte les creneaux mal formes stockes dans le champ JSON', () => {
    const corrompu = {
      ...student,
      availability: [
        { weekday: 9, start: '14:00', end: '16:00' },
        { weekday: 1, start: 42, end: '16:00' },
        null,
      ] as never,
    }
    // Aucun creneau valide ne subsiste : on revient aux valeurs par defaut.
    expect(toPlannerConfig(corrompu).availability).toEqual(DEFAULT_AVAILABILITY)
  })
})
