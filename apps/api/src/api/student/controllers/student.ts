import { factories } from '@strapi/strapi'
import { requireStudent } from '../../../utils/ownership'

/** Un compte n'accede qu'a son propre profil etudiant. */
export default factories.createCoreController('api::student.student', ({ strapi }) => ({
  async find(ctx) {
    const student = await requireStudent(strapi, ctx)
    ctx.query = {
      ...ctx.query,
      filters: { documentId: { $eq: student.documentId } },
    }
    return super.find(ctx)
  },

  async findOne(ctx) {
    const student = await requireStudent(strapi, ctx)
    const { id } = ctx.params as { id: string }
    if (id !== student.documentId) return ctx.notFound('Profil introuvable')
    return super.findOne(ctx)
  },

  async update(ctx) {
    const student = await requireStudent(strapi, ctx)
    const { id } = ctx.params as { id: string }
    if (id !== student.documentId) return ctx.notFound('Profil introuvable')
    // Le rattachement au compte utilisateur n'est pas modifiable par l'API.
    const body = ctx.request.body as { data?: Record<string, unknown> }
    const data = { ...(body.data ?? {}) }
    delete data['user']
    ctx.request.body = { data }
    return super.update(ctx)
  },
}))
