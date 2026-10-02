import type { Core } from '@strapi/strapi'

export interface StudentRef {
  id: number
  documentId: string
}

/**
 * Retrouve le profil etudiant du compte appelant.
 *
 * Toute donnee personnelle est filtree a partir de ce profil, cote serveur.
 * La version precedente de l'application recuperait l'ensemble des examens
 * puis les filtrait dans le navigateur : le filtrage etait cosmetique et
 * n'importe quel compte authentifie pouvait lire les donnees des autres.
 */
export async function findStudentOfUser(
  strapi: Core.Strapi,
  userId: number | undefined,
): Promise<StudentRef | null> {
  if (!userId) return null
  const student = await strapi.db.query('api::student.student').findOne({
    where: { user: userId },
    select: ['id', 'documentId'],
  })
  return student ? { id: student.id, documentId: student.documentId } : null
}

/** Variante qui interrompt la requete avec un 403 si aucun profil n'existe. */
export async function requireStudent(
  strapi: Core.Strapi,
  ctx: { state: { user?: { id: number } }; forbidden: (message: string) => unknown },
): Promise<StudentRef> {
  const student = await findStudentOfUser(strapi, ctx.state.user?.id)
  if (!student) {
    throw ctx.forbidden('Aucun profil etudiant rattache a ce compte')
  }
  return student
}
