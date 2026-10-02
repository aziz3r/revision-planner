import type { Core } from '@strapi/strapi'

const SUBJECTS = [
  { name: 'Mathematiques', difficulty: 'difficile' as const, color: '#4f46e5' },
  { name: 'Reseaux', difficulty: 'moyen' as const, color: '#0891b2' },
  { name: 'Anglais', difficulty: 'facile' as const, color: '#16a34a' },
  { name: 'Physique', difficulty: 'difficile' as const, color: '#dc2626' },
  { name: 'Base de donnees', difficulty: 'moyen' as const, color: '#ea580c' },
]

const DEMO_EMAIL = 'demo@revision-planner.local'
const DEMO_PASSWORD = 'Demo1234!'

const DEFAULT_AVAILABILITY = [1, 2, 3, 4, 5].map((weekday) => ({
  weekday,
  start: '18:00',
  end: '21:00',
}))
const WEEKEND_AVAILABILITY = [0, 6].map((weekday) => ({
  weekday,
  start: '10:00',
  end: '13:00',
}))

/** Decale une date de N jours a partir de maintenant, a l'heure indiquee. */
function inDays(days: number, hour: number): string {
  const date = new Date()
  date.setDate(date.getDate() + days)
  date.setHours(hour, 0, 0, 0)
  return date.toISOString()
}

/**
 * Jeu de donnees de demonstration.
 *
 * Les dates sont relatives au jour du demarrage : la demonstration reste
 * pertinente quelle que soit la date a laquelle le projet est clone, au lieu
 * d'afficher des examens passes.
 */
export async function seed(strapi: Core.Strapi): Promise<void> {
  const existing = await strapi.documents('api::subject.subject').count({})
  if (existing > 0) {
    strapi.log.info('[seed] donnees deja presentes, rien a faire')
    return
  }

  const subjects = new Map<string, string>()
  for (const subject of SUBJECTS) {
    const created = await strapi.documents('api::subject.subject').create({ data: subject })
    subjects.set(subject.name, created.documentId)
  }

  const role = await strapi.db
    .query('plugin::users-permissions.role')
    .findOne({ where: { type: 'authenticated' } })

  let user = await strapi.db
    .query('plugin::users-permissions.user')
    .findOne({ where: { email: DEMO_EMAIL } })

  if (!user) {
    user = await strapi
      .plugin('users-permissions')
      .service('user')
      .add({
        username: 'demo',
        email: DEMO_EMAIL,
        password: DEMO_PASSWORD,
        confirmed: true,
        blocked: false,
        provider: 'local',
        role: role?.id,
      })
  }

  const student = await strapi.documents('api::student.student').create({
    data: {
      displayName: 'Etudiant de demonstration',
      availability: [...DEFAULT_AVAILABILITY, ...WEEKEND_AVAILABILITY],
      sessionMinutes: 60,
      maxMinutesPerDay: 180,
      user: user.id,
    },
  })

  const exams: Array<{
    name: string
    subject: string
    weight: number
    kind: 'controle' | 'partiel' | 'final' | 'oral' | 'projet'
    date: string
  }> = [
    { name: 'Analyse numerique', subject: 'Mathematiques', weight: 40, kind: 'partiel', date: inDays(15, 8) },
    { name: 'Protocoles reseau', subject: 'Reseaux', weight: 30, kind: 'controle', date: inDays(19, 14) },
    { name: 'Anglais technique', subject: 'Anglais', weight: 10, kind: 'oral', date: inDays(12, 10) },
    { name: 'Mecanique quantique', subject: 'Physique', weight: 35, kind: 'final', date: inDays(26, 8) },
    { name: 'Modelisation SQL', subject: 'Base de donnees', weight: 20, kind: 'projet', date: inDays(8, 16) },
  ]

  for (const exam of exams) {
    await strapi.documents('api::exam.exam').create({
      data: {
        name: exam.name,
        date: exam.date,
        weight: exam.weight,
        kind: exam.kind,
        subject: subjects.get(exam.subject),
        student: student.documentId,
      },
    })
  }

  strapi.log.info(
    `[seed] ${SUBJECTS.length} matieres, ${exams.length} examens, compte de demonstration ${DEMO_EMAIL} / ${DEMO_PASSWORD}`,
  )
}
