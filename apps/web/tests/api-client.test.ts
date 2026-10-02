import { describe, expect, it } from 'vitest'
import { toSearchParams } from '../src/api/client'
import { EXAM_QUERY } from '../src/api/types'

/**
 * Le sérialiseur remplace la dépendance `qs` utilisée par la version
 * précédente. Son comportement est donc verrouillé par ces tests.
 */
describe('toSearchParams', () => {
  it('serialise un objet plat', () => {
    expect(toSearchParams({ page: 1, sort: 'date' }).toString()).toBe('page=1&sort=date')
  })

  it('serialise les objets imbriques au format Strapi', () => {
    const params = toSearchParams({ filters: { student: { documentId: { $eq: 'abc' } } } })
    expect(decodeURIComponent(params.toString())).toBe('filters[student][documentId][$eq]=abc')
  })

  it('indexe les tableaux', () => {
    const params = toSearchParams({ fields: ['name', 'date'] })
    expect(decodeURIComponent(params.toString())).toBe('fields[0]=name&fields[1]=date')
  })

  it('ignore les valeurs nulles ou absentes', () => {
    expect(toSearchParams({ a: null, b: undefined, c: 1 }).toString()).toBe('c=1')
  })

  it('serialise la requete des examens sans perdre de relation', () => {
    const query = decodeURIComponent(toSearchParams(EXAM_QUERY).toString())
    expect(query).toContain('populate[subject][fields][0]=name')
    expect(query).toContain('populate[sessions][fields][0]=startsAt')
    expect(query).toContain('sort[0]=date:asc')
    expect(query).toContain('pagination[pageSize]=100')
  })
})
