import type { Core } from '@strapi/strapi'
import { applyPermissions } from './bootstrap/permissions'
import { seed } from './bootstrap/seed'

export default {
  register() {},

  /**
   * Au demarrage : on applique les permissions puis on injecte le jeu de
   * donnees de demonstration si la base est vide. Les deux operations sont
   * idempotentes, le projet peut donc etre relance sans effet de bord.
   */
  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    await applyPermissions(strapi)
    if (process.env.SEED_DEMO_DATA !== 'false') {
      await seed(strapi)
    }
  },
}
