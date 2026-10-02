import { planRevisions, type Plan, type PlannerConfig } from '@revision-planner/core'
import { request } from '../../api/client'
import type { ExamDto, SessionDto, StrapiList } from '../../api/types'
import { toCoreExam } from './mapping'

/** Calcule le planning sans rien enregistrer : sert a la previsualisation. */
export function previewPlan(exams: readonly ExamDto[], config: PlannerConfig): Plan {
  return planRevisions(exams.map(toCoreExam), config)
}

/**
 * Enregistre un planning calcule.
 *
 * Les sessions existantes sont d'abord supprimees pour que la generation soit
 * idempotente : relancer la generation deux fois ne cree pas de doublons.
 */
export async function savePlan(
  exams: readonly ExamDto[],
  plan: Plan,
): Promise<{ created: number; removed: number }> {
  const examIds = new Set(exams.map((exam) => exam.documentId))
  const removed = await deleteSessionsOf(examIds)

  let created = 0
  for (const session of plan.sessions) {
    await request<unknown>('/api/revision-sessions', {
      method: 'POST',
      body: {
        data: {
          exam: session.examId,
          startsAt: session.start.toISOString(),
          endsAt: session.end.toISOString(),
          rank: session.index,
          status: 'prevue',
          progress: 0,
          comment: `Session ${session.index}/${session.total} — ${session.examName}`,
        },
      },
    })
    created += 1
  }
  return { created, removed }
}

/** Supprime les sessions rattachees aux examens indiques. */
export async function deleteSessionsOf(examIds: ReadonlySet<string>): Promise<number> {
  const response = await request<StrapiList<SessionDto & { exam?: { documentId: string } }>>(
    '/api/revision-sessions',
    {
      query: {
        fields: ['startsAt'],
        populate: { exam: { fields: ['documentId'] } },
        pagination: { page: 1, pageSize: 500 },
      },
    },
  )

  let removed = 0
  for (const session of response.data) {
    const owner = session.exam?.documentId
    if (owner && examIds.has(owner)) {
      await request<void>(`/api/revision-sessions/${session.documentId}`, { method: 'DELETE' })
      removed += 1
    }
  }
  return removed
}
