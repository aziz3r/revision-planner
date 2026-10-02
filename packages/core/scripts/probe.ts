import { DEFAULT_AVAILABILITY, DEFAULT_CONFIG, fitOffsetsToWindow, planRevisions, requiredMinutes, spacedOffsets, type Exam } from '../src/index.js'
const now = new Date('2026-03-01T08:00:00')
const cfg = { ...DEFAULT_CONFIG, now, availability: DEFAULT_AVAILABILITY }
const essai = (label: string, fn: () => void) => {
  try { fn() } catch (e) { console.log(`   ${label} -> erreur explicite : ${(e as Error).message}`) }
}

console.log('1) coefficient NaN :')
essai('NaN', () => requiredMinutes({ id: 'x', name: 'X', date: '2026-04-01T08:00:00', weight: Number.NaN }, 60))
console.log('2) coefficient Infinity :')
essai('Infinity', () => planRevisions([{ id: 'y', name: 'Y', date: '2026-04-01T08:00:00', weight: Infinity }], cfg))

console.log('\n3) offsets vs fenetre (examen dans 20 jours, coef 100) :')
console.log('   offsets bruts   =', spacedOffsets(10).join(', '))
console.log('   offsets ajustes =', fitOffsetsToWindow(spacedOffsets(10), 19).join(', '))
const p3 = planRevisions([{ id: 'z', name: 'Z', date: '2026-03-21T08:00:00', weight: 100 }], { ...cfg, maxMinutesPerDay: 600 })
const byDay = new Map<string, number>()
for (const s of p3.sessions) byDay.set(s.start.toDateString().slice(0, 10), (byDay.get(s.start.toDateString().slice(0, 10)) ?? 0) + 1)
console.log('   sessions placees =', p3.sessions.length, '/ 10')
console.log('   repartition      =', [...byDay.entries()].map(([d, n]) => `${d}:${n}`).join('  '))
console.log('   non planifie     =', p3.diagnostics.unscheduled.length === 0 ? 'rien' : JSON.stringify(p3.diagnostics.unscheduled))

console.log('\n4) fuseau horaire : date UTC depuis Strapi')
const p4 = planRevisions([{ id: 'u', name: 'U', date: '2026-03-20T07:00:00.000Z', weight: 10 }], cfg)
console.log('   session =', p4.sessions[0]?.start.toISOString(), '-> local', p4.sessions[0]?.start.getHours() + 'h')
