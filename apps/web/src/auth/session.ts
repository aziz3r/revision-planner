import type { AuthResponse } from '../api/types'

const STORAGE_KEY = 'revision-planner.session'

export interface Session {
  jwt: string
  user: AuthResponse['user']
}

/**
 * Lecture et ecriture de la session dans le stockage local.
 *
 * Chaque acces est protege : en navigation privee ou avec les donnees de site
 * bloquees, `localStorage` peut lever une exception. L'application doit rester
 * utilisable, quitte a perdre la persistance de la session.
 */
export function saveSession(session: Session): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
  } catch {
    /* stockage indisponible : la session ne survivra pas au rechargement */
  }
}

export function readSession(): Session | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed: unknown = JSON.parse(raw)
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      typeof (parsed as Session).jwt === 'string'
    ) {
      return parsed as Session
    }
    return null
  } catch {
    return null
  }
}

export function clearSession(): void {
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    /* rien a faire */
  }
}

export function getToken(): string | null {
  return readSession()?.jwt ?? null
}
