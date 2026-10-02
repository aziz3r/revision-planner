import { describe, expect, it } from 'vitest'
import {
  DEFAULT_AVAILABILITY,
  DEFAULT_CONFIG,
  planRevisions,
  requiredMinutes,
  spacedOffsets,
  fitOffsetsToWindow,
  type AvailabilitySlot,
  type Exam,
  type PlannerConfig,
} from '../src/index.js'

const NOW = new Date('2026-03-01T08:00:00')

function config(overrides: Partial<PlannerConfig> = {}): PlannerConfig {
  return {
    ...DEFAULT_CONFIG,
    now: NOW,
    availability: DEFAULT_AVAILABILITY,
    ...overrides,
  }
}

function exam(partial: Partial<Exam> = {}): Exam {
  return {
    id: 'e1',
    name: 'Mathematiques',
    date: '2026-03-20T08:00:00',
    weight: 20,
    ...partial,
  }
}

describe('requiredMinutes', () => {
  it('croit avec le coefficient', () => {
    const light = requiredMinutes(exam({ weight: 10 }), 60)
    const heavy = requiredMinutes(exam({ weight: 40 }), 60)
    expect(heavy).toBeGreaterThan(light)
  })

  it('tient compte de la difficulte de la matiere', () => {
    const base = { id: 's', name: 'Matiere' }
    const volume = (difficulty: 'facile' | 'moyen' | 'difficile') =>
      requiredMinutes(exam({ weight: 60, subject: { ...base, difficulty } }), 60)
    expect(volume('facile')).toBeLessThan(volume('moyen'))
    expect(volume('moyen')).toBeLessThan(volume('difficile'))
  })

  it('l arrondi a la session peut masquer la difficulte sur un petit coefficient', () => {
    // Comportement assume : on ne planifie pas une fraction de session.
    const base = { id: 's', name: 'Matiere' }
    const easy = requiredMinutes(exam({ weight: 20, subject: { ...base, difficulty: 'facile' } }), 60)
    const medium = requiredMinutes(exam({ weight: 20, subject: { ...base, difficulty: 'moyen' } }), 60)
    expect(easy).toBe(medium)
  })

  it('renvoie un multiple de la duree de session', () => {
    expect(requiredMinutes(exam({ weight: 37 }), 45) % 45).toBe(0)
  })

  it('renvoie zero pour un coefficient nul ou negatif', () => {
    expect(requiredMinutes(exam({ weight: 0 }), 60)).toBe(0)
    expect(requiredMinutes(exam({ weight: -5 }), 60)).toBe(0)
  })
})

describe('spacedOffsets', () => {
  it('produit des ecarts croissants (repetition espacee)', () => {
    expect(spacedOffsets(5)).toEqual([1, 3, 6, 10, 15])
  })

  it('renvoie une liste vide pour zero session', () => {
    expect(spacedOffsets(0)).toEqual([])
  })
})

describe('planRevisions', () => {
  it('ne planifie jamais dans le passe', () => {
    const plan = planRevisions([exam()], config())
    expect(plan.sessions.length).toBeGreaterThan(0)
    for (const session of plan.sessions) {
      expect(session.start.getTime()).toBeGreaterThanOrEqual(NOW.getTime())
    }
  })

  it('ne planifie jamais apres la date de l examen', () => {
    const subject = exam({ date: '2026-03-20T08:00:00' })
    const plan = planRevisions([subject], config())
    const examTime = new Date(subject.date).getTime()
    for (const session of plan.sessions) {
      expect(session.end.getTime()).toBeLessThanOrEqual(examTime)
    }
  })

  it('respecte la marge de repos avant l examen', () => {
    const subject = exam({ date: '2026-03-20T08:00:00' })
    const cfg = config({ cooldownMinutes: 24 * 60 })
    const plan = planRevisions([subject], cfg)
    const limit = new Date(subject.date).getTime() - 24 * 60 * 60_000
    for (const session of plan.sessions) {
      expect(session.end.getTime()).toBeLessThanOrEqual(limit)
    }
  })

  it('place les sessions dans les creneaux de disponibilite', () => {
    const availability: AvailabilitySlot[] = [
      { weekday: 6, start: '09:00', end: '12:00' },
    ]
    const plan = planRevisions([exam({ weight: 10 })], config({ availability }))
    expect(plan.sessions.length).toBe(1)
    for (const session of plan.sessions) {
      expect(session.start.getDay()).toBe(6)
      expect(session.start.getHours()).toBeGreaterThanOrEqual(9)
      expect(session.end.getHours()).toBeLessThanOrEqual(12)
    }
  })

  it('ne fait jamais chevaucher deux sessions, meme pour des examens differents', () => {
    const exams = [
      exam({ id: 'a', name: 'Maths', weight: 60 }),
      exam({ id: 'b', name: 'Physique', weight: 60, date: '2026-03-22T08:00:00' }),
      exam({ id: 'c', name: 'Anglais', weight: 60, date: '2026-03-24T08:00:00' }),
    ]
    const plan = planRevisions(exams, config())
    const ordered = [...plan.sessions].sort((x, y) => x.start.getTime() - y.start.getTime())
    for (let i = 1; i < ordered.length; i += 1) {
      const previous = ordered[i - 1]!
      const current = ordered[i]!
      expect(current.start.getTime()).toBeGreaterThanOrEqual(previous.end.getTime())
    }
  })

  it('respecte le plafond de minutes par journee', () => {
    const exams = Array.from({ length: 6 }, (_, i) =>
      exam({ id: `e${i}`, name: `Examen ${i}`, weight: 60 }),
    )
    const cfg = config({ maxMinutesPerDay: 120 })
    const plan = planRevisions(exams, cfg)
    const perDay = new Map<string, number>()
    for (const session of plan.sessions) {
      const key = session.start.toDateString()
      perDay.set(key, (perDay.get(key) ?? 0) + cfg.sessionMinutes)
    }
    for (const minutes of perDay.values()) {
      expect(minutes).toBeLessThanOrEqual(120)
    }
  })

  it('respecte la pause minimale entre deux sessions du meme jour', () => {
    const availability: AvailabilitySlot[] = [
      { weekday: 1, start: '08:00', end: '20:00' },
    ]
    const cfg = config({ availability, breakMinutes: 30, maxMinutesPerDay: 600 })
    const exams = Array.from({ length: 4 }, (_, i) =>
      exam({ id: `e${i}`, name: `Examen ${i}`, weight: 30 }),
    )
    const plan = planRevisions(exams, cfg)
    const byDay = new Map<string, typeof plan.sessions>()
    for (const session of plan.sessions) {
      const key = session.start.toDateString()
      byDay.set(key, [...(byDay.get(key) ?? []), session])
    }
    for (const daySessions of byDay.values()) {
      const ordered = [...daySessions].sort((x, y) => x.start.getTime() - y.start.getTime())
      for (let i = 1; i < ordered.length; i += 1) {
        const gap = (ordered[i]!.start.getTime() - ordered[i - 1]!.end.getTime()) / 60_000
        expect(gap).toBeGreaterThanOrEqual(30)
      }
    }
  })

  it('signale un examen deja passe au lieu de l ignorer', () => {
    const plan = planRevisions([exam({ date: '2026-02-01T08:00:00' })], config())
    expect(plan.sessions).toHaveLength(0)
    expect(plan.diagnostics.unscheduled).toEqual([
      expect.objectContaining({ examId: 'e1', reason: 'examen-passe' }),
    ])
  })

  it('signale l absence de disponibilite', () => {
    const plan = planRevisions([exam()], config({ availability: [] }))
    expect(plan.sessions).toHaveLength(0)
    expect(plan.diagnostics.unscheduled[0]?.reason).toBe('aucune-disponibilite')
  })

  it('signale un manque de temps quand le planning est sature', () => {
    const availability: AvailabilitySlot[] = [
      { weekday: 3, start: '18:00', end: '19:00' },
    ]
    const plan = planRevisions(
      [exam({ weight: 100, date: '2026-03-10T08:00:00' })],
      config({ availability }),
    )
    expect(plan.diagnostics.unscheduled[0]?.reason).toBe('temps-insuffisant')
    expect(plan.diagnostics.scheduledMinutes).toBeLessThan(plan.diagnostics.requestedMinutes)
  })

  it('sert en priorite les examens les plus proches', () => {
    // Un seul creneau d'une heure par semaine : les deux examens se disputent
    // les memes lundis soir.
    const availability: AvailabilitySlot[] = [
      { weekday: 1, start: '18:00', end: '19:00' },
    ]
    const exams = [
      exam({ id: 'loin', name: 'Loin', weight: 100, date: '2026-04-20T08:00:00' }),
      exam({ id: 'proche', name: 'Proche', weight: 20, date: '2026-03-12T08:00:00' }),
    ]
    const plan = planRevisions(exams, config({ availability }))
    const missing = plan.diagnostics.unscheduled.map((u) => u.examId)
    // L'examen proche tient dans les creneaux disponibles : il est servi en entier.
    expect(missing).not.toContain('proche')
    // C'est l'echeance lointaine qui cede les creneaux manquants.
    expect(missing).toContain('loin')
  })

  it('numerote les sessions de la plus proche de l examen a la plus lointaine', () => {
    const plan = planRevisions([exam({ weight: 30 })], config())
    const byIndex = [...plan.sessions].sort((a, b) => a.index - b.index)
    for (let i = 1; i < byIndex.length; i += 1) {
      expect(byIndex[i]!.daysBeforeExam).toBeGreaterThanOrEqual(
        byIndex[i - 1]!.daysBeforeExam,
      )
    }
  })

  it('renvoie un diagnostic coherent', () => {
    const plan = planRevisions([exam({ weight: 20 })], config())
    expect(plan.diagnostics.requestedMinutes).toBe(requiredMinutes(exam({ weight: 20 }), 60))
    expect(plan.diagnostics.scheduledMinutes).toBe(plan.sessions.length * 60)
  })

  it('rejette une date d examen invalide', () => {
    expect(() => planRevisions([exam({ date: 'pas-une-date' })], config())).toThrow(RangeError)
  })

  it('rejette un creneau dont la fin precede le debut', () => {
    const availability: AvailabilitySlot[] = [{ weekday: 1, start: '20:00', end: '18:00' }]
    expect(() => planRevisions([exam()], config({ availability }))).toThrow(RangeError)
  })

  it('est deterministe', () => {
    const exams = [exam({ weight: 40 }), exam({ id: 'e2', weight: 25, date: '2026-03-25T08:00:00' })]
    const first = planRevisions(exams, config())
    const second = planRevisions(exams, config())
    expect(JSON.stringify(first)).toBe(JSON.stringify(second))
  })
})

// --- Regressions : defauts trouves lors de la revue du moteur ---------------

describe('validation des entrees', () => {
  it('rejette un coefficient NaN au lieu de faire disparaitre l examen', () => {
    expect(() => requiredMinutes(exam({ weight: Number.NaN }), 60)).toThrow(RangeError)
    expect(() => planRevisions([exam({ weight: Number.NaN })], config())).toThrow(RangeError)
  })

  it('rejette un coefficient infini avec un message explicite', () => {
    expect(() => planRevisions([exam({ weight: Number.POSITIVE_INFINITY })], config()))
      .toThrow(/Coefficient invalide/)
  })

  it('rejette une duree de session nulle ou negative', () => {
    expect(() => requiredMinutes(exam(), 0)).toThrow(RangeError)
    expect(() => requiredMinutes(exam(), -30)).toThrow(RangeError)
  })

  it('rejette un nombre de sessions non entier', () => {
    expect(() => spacedOffsets(2.5)).toThrow(RangeError)
    expect(() => spacedOffsets(-1)).toThrow(RangeError)
  })
})

describe('fitOffsetsToWindow', () => {
  it('laisse les decalages intacts quand la fenetre est assez large', () => {
    expect(fitOffsetsToWindow([1, 3, 6], 30)).toEqual([1, 3, 6])
  })

  it('comprime les decalages dans la fenetre disponible', () => {
    const fitted = fitOffsetsToWindow([1, 3, 6, 10, 15, 21, 28, 36, 45, 55], 20)
    expect(Math.max(...fitted)).toBeLessThanOrEqual(20)
    for (let i = 1; i < fitted.length; i += 1) {
      expect(fitted[i]!).toBeGreaterThanOrEqual(fitted[i - 1]!)
    }
  })

  it('ramene tout a zero si la fenetre est nulle', () => {
    expect(fitOffsetsToWindow([1, 3, 6], 0)).toEqual([0, 0, 0])
  })
})

describe('coherence du diagnostic', () => {
  it('ne signale pas "temps-insuffisant" quand des creneaux restent libres', () => {
    // Examen dans 20 jours, coefficient 100 (10 sessions attendues),
    // 3 h de disponibilite chaque soir : il y a largement la place.
    const plan = planRevisions(
      [exam({ weight: 100, date: '2026-03-21T08:00:00' })],
      config({ maxMinutesPerDay: 600 }),
    )
    expect(plan.diagnostics.unscheduled).toEqual([])
    expect(plan.diagnostics.scheduledMinutes).toBe(plan.diagnostics.requestedMinutes)
  })

  it('place toutes les sessions sans les tasser sur un seul jour', () => {
    const plan = planRevisions(
      [exam({ weight: 100, date: '2026-03-21T08:00:00' })],
      config({ maxMinutesPerDay: 600 }),
    )
    const days = new Set(plan.sessions.map((s) => s.start.toDateString()))
    expect(plan.sessions).toHaveLength(10)
    expect(days.size).toBeGreaterThanOrEqual(6)
  })
})
