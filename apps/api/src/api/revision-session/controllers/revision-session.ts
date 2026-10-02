import { factories } from '@strapi/strapi'
import type { Core } from '@strapi/strapi'
import { requireStudent } from '../../../utils/ownership'

interface SessionWithExam {
  exam?: { student?: { documentId?: string } }
}

/**
 * Verifie qu'une session appartient bien a un examen du compte appelant.
 *
 * Fonction de module plutot que methode du controleur : Strapi type chaque
 * methode d'un controleur comme un gestionnaire de requete `(ctx) => ...`, et
 * y ajouter un utilitaire a la signature differente ne compile pas.
 */
async function isOwnedByStudent(
  strapi: Core.Strapi,
  documentId: string,
  studentDocumentId: string,
): Promise<boolean> {
  const session = (await strapi
    .documents('api::revision-session.revision-session')
    .findOne({
      documentId,
      populate: { exam: { populate: { student: { fields: ['documentId'] } } } },
    })) as SessionWithExam | null
  return session?.exam?.student?.documentId === studentDocumentId
}

export default factories.createCoreController(
  'api::revision-session.revision-session',
  ({ strapi }) => ({
    async find(ctx) {
      const student = await requireStudent(strapi, ctx)
      ctx.query = {
        ...ctx.query,
        filters: {
          ...(ctx.query?.['filters'] as Record<string, unknown> | undefined),
          exam: { student: { documentId: { $eq: student.documentId } } },
        },
      }
      return super.find(ctx)
    },

    async findOne(ctx) {
      const student = await requireStudent(strapi, ctx)
      const { id } = ctx.params as { id: string }
      if (!(await isOwnedByStudent(strapi, id, student.documentId))) {
        return ctx.notFound('Session introuvable')
      }
      return super.findOne(ctx)
    },

    async create(ctx) {
      const student = await requireStudent(strapi, ctx)
      const body = ctx.request.body as { data?: { exam?: string } }
      const examId = body.data?.exam
      if (!examId) return ctx.badRequest('La session doit referencer un examen')

      const exam = await strapi.documents('api::exam.exam').findOne({
        documentId: examId,
        populate: { student: { fields: ['documentId'] } },
      })
      const owner = (exam as { student?: { documentId?: string } } | null)?.student?.documentId
      if (owner !== student.documentId) {
        return ctx.forbidden('Cet examen n appartient pas au compte courant')
      }
      return super.create(ctx)
    },

    async update(ctx) {
      const student = await requireStudent(strapi, ctx)
      const { id } = ctx.params as { id: string }
      if (!(await isOwnedByStudent(strapi, id, student.documentId))) {
        return ctx.notFound('Session introuvable')
      }
      return super.update(ctx)
    },

    async delete(ctx) {
      const student = await requireStudent(strapi, ctx)
      const { id } = ctx.params as { id: string }
      if (!(await isOwnedByStudent(strapi, id, student.documentId))) {
        return ctx.notFound('Session introuvable')
      }
      return super.delete(ctx)
    },
  }),
)
