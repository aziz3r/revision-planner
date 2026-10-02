import { DEFAULT_AVAILABILITY, DEFAULT_CONFIG, planRevisions, type Exam } from '../src/index.js'

const now = new Date('2026-03-01T08:00:00')
const exams: Exam[] = [
  { id: '1', name: 'Analyse numerique', date: '2026-03-16T08:00:00', weight: 40,
    subject: { id: 'm1', name: 'Mathematiques', difficulty: 'difficile' } },
  { id: '2', name: 'Anglais technique', date: '2026-03-13T14:00:00', weight: 10,
    subject: { id: 'm2', name: 'Anglais', difficulty: 'facile' } },
  { id: '3', name: 'Reseaux', date: '2026-03-20T08:00:00', weight: 30,
    subject: { id: 'm3', name: 'Reseaux', difficulty: 'moyen' } },
]

const plan = planRevisions(exams, {
  ...DEFAULT_CONFIG,
  now,
  availability: DEFAULT_AVAILABILITY,
  maxMinutesPerDay: 120,
})

const fmt = (d: Date) =>
  d.toLocaleString('fr-FR', { weekday: 'short', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })

console.log(`Planning genere le ${now.toLocaleDateString('fr-FR')} — ${plan.sessions.length} sessions\n`)
for (const s of plan.sessions) {
  console.log(`  ${fmt(s.start)} -> ${s.end.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}  ${s.examName.padEnd(20)} session ${s.index}/${s.total}  (J-${s.daysBeforeExam})`)
}
const d = plan.diagnostics
console.log(`\n  Volume demande : ${d.requestedMinutes} min | planifie : ${d.scheduledMinutes} min`)
console.log(`  Non planifie   : ${d.unscheduled.length === 0 ? 'rien' : JSON.stringify(d.unscheduled)}`)
