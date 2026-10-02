import type { Core } from '@strapi/strapi'

/**
 * Actions ouvertes au role "authenticated".
 *
 * Ces permissions sont appliquees au demarrage plutot que cochees a la main
 * dans l'administration : la configuration est versionnee avec le code, donc
 * reproductible sur un poste neuf. C'est ce qui evite les erreurs 403 lors
 * d'une premiere installation.
 */
const AUTHENTICATED_ACTIONS = [
  'api::exam.exam.find',
  'api::exam.exam.findOne',
  'api::exam.exam.create',
  'api::exam.exam.update',
  'api::exam.exam.delete',
  'api::revision-session.revision-session.find',
  'api::revision-session.revision-session.findOne',
  'api::revision-session.revision-session.create',
  'api::revision-session.revision-session.update',
  'api::revision-session.revision-session.delete',
  'api::subject.subject.find',
  'api::subject.subject.findOne',
  'api::student.student.find',
  'api::student.student.findOne',
  'api::student.student.update',
] as const

/** Les matieres sont consultables sans compte, pour la page de demonstration. */
const PUBLIC_ACTIONS = ['api::subject.subject.find'] as const

async function grant(
  strapi: Core.Strapi,
  roleType: 'authenticated' | 'public',
  actions: readonly string[],
): Promise<number> {
  const role = await strapi.db
    .query('plugin::users-permissions.role')
    .findOne({ where: { type: roleType } })

  if (!role) {
    strapi.log.warn(`[permissions] role "${roleType}" introuvable, etape ignoree`)
    return 0
  }

  let created = 0
  for (const action of actions) {
    const existing = await strapi.db
      .query('plugin::users-permissions.permission')
      .findOne({ where: { action, role: role.id } })

    if (!existing) {
      await strapi.db
        .query('plugin::users-permissions.permission')
        .create({ data: { action, role: role.id } })
      created += 1
    }
  }
  return created
}

export async function applyPermissions(strapi: Core.Strapi): Promise<void> {
  const authenticated = await grant(strapi, 'authenticated', AUTHENTICATED_ACTIONS)
  const publicRole = await grant(strapi, 'public', PUBLIC_ACTIONS)
  strapi.log.info(
    `[permissions] ${authenticated} permission(s) authenticated, ${publicRole} publique(s) ajoutee(s)`,
  )
}
