import { factories } from '@strapi/strapi'
import { requireStudent } from '../../../utils/ownership'

/**
 * Les examens sont strictement cloisonnes par etudiant : la relation
 * `student` est imposee cote serveur, en lecture comme en ecriture.
 */
export default factories.createCoreController('api::exam.exam', ({ strapi }) => ({
  async find(ctx) {
    const student = await requireStudent(strapi, ctx)
    ctx.query = {
      ...ctx.query,
      filters: {
        ...(ctx.query?.['filters'] as Record<string, unknown> | undefined),
        student: { documentId: { $eq: student.documentId } },
      },
    }
    return super.find(ctx)
  },

  async findOne(ctx) {
    const student = await requireStudent(strapi, ctx)
    const { id } = ctx.params as { id: string }
    const exam = await strapi.documents('api::exam.exam').findOne({
      documentId: id,
      populate: { student: { fields: ['documentId'] } },
    })
    if (!exam || (exam as { student?: { documentId?: string } }).student?.documentId !== student.documentId) {
      return ctx.notFound('Examen introuvable')
    }
    return super.findOne(ctx)
  },

  async create(ctx) {
    const student = await requireStudent(strapi, ctx)
    const body = ctx.request.body as { data?: Record<string, unknown> }
    ctx.request.body = {
      data: { ...(body.data ?? {}), student: student.documentId },
    }
    return super.create(ctx)
  },

  async update(ctx) {
    const student = await requireStudent(strapi, ctx)
    const { id } = ctx.params as { id: string }
    const exam = await strapi.documents('api::exam.exam').findOne({
      documentId: id,
      populate: { student: { fields: ['documentId'] } },
    })
    if (!exam || (exam as { student?: { documentId?: string } }).student?.documentId !== student.documentId) {
      return ctx.notFound('Examen introuvable')
    }
    // On empeche la reaffectation d'un examen a un autre etudiant.
    const body = ctx.request.body as { data?: Record<string, unknown> }
    ctx.request.body = {
      data: { ...(body.data ?? {}), student: student.documentId },
    }
    return super.update(ctx)
  },

  async delete(ctx) {
    const student = await requireStudent(strapi, ctx)
    const { id } = ctx.params as { id: string }
    const exam = await strapi.documents('api::exam.exam').findOne({
      documentId: id,
      populate: { student: { fields: ['documentId'] } },
    })
    if (!exam || (exam as { student?: { documentId?: string } }).student?.documentId !== student.documentId) {
      return ctx.notFound('Examen introuvable')
    }
    return super.delete(ctx)
  },
}))
