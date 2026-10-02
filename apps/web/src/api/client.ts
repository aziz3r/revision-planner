import { getToken } from '../auth/session'

const BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:1337').replace(/\/$/, '')

/** Erreur d'API portant le code HTTP, pour un traitement cible cote interface. */
export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

/**
 * Serialise un objet de requete au format attendu par Strapi
 * (`filters[a][b]=c`, `populate[x][fields][0]=y`, ...).
 *
 * Ecrit a la main plutot qu'importe depuis `qs` : la dependance n'etait
 * utilisee que pour cela, et le comportement est ici explicite et teste.
 */
export function toSearchParams(input: unknown, prefix = ''): URLSearchParams {
  const params = new URLSearchParams()

  const walk = (value: unknown, path: string): void => {
    if (value === undefined || value === null) return
    if (Array.isArray(value)) {
      value.forEach((item, index) => walk(item, `${path}[${index}]`))
      return
    }
    if (typeof value === 'object') {
      for (const [key, nested] of Object.entries(value)) {
        walk(nested, path ? `${path}[${key}]` : key)
      }
      return
    }
    params.append(path, String(value))
  }

  walk(input, prefix)
  return params
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
  query?: unknown
  body?: unknown
  /** Requete publique : aucun jeton n'est envoye. */
  anonymous?: boolean
}

export async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = 'GET', query, body, anonymous = false } = options
  const search = query ? `?${toSearchParams(query).toString()}` : ''
  const headers: Record<string, string> = { Accept: 'application/json' }

  if (body !== undefined) headers['Content-Type'] = 'application/json'
  if (!anonymous) {
    const token = getToken()
    if (token) headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(`${BASE}${path}${search}`, {
    method,
    headers,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  })

  if (response.status === 204) return undefined as T

  const payload: unknown = await response.json().catch(() => null)

  if (!response.ok) {
    const message =
      (payload as { error?: { message?: string } } | null)?.error?.message ??
      `Requete ${method} ${path} en echec (${response.status})`
    throw new ApiError(message, response.status, payload)
  }

  return payload as T
}
