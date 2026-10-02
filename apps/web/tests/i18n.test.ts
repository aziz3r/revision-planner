import { describe, expect, it } from 'vitest'
import fr from '../src/i18n/fr.json'
import en from '../src/i18n/en.json'

/** Aplatit un dictionnaire imbrique en chemins "a.b.c". */
function keysOf(value: unknown, prefix = ''): string[] {
  if (typeof value !== 'object' || value === null) return [prefix]
  return Object.entries(value).flatMap(([key, nested]) =>
    keysOf(nested, prefix ? `${prefix}.${key}` : key),
  )
}

/**
 * Une cle presente dans une langue et absente dans l'autre s'affiche telle
 * quelle a l'ecran. Ce test transforme cet oubli en echec de build.
 */
describe('dictionnaires de traduction', () => {
  it('francais et anglais exposent exactement les memes cles', () => {
    const frKeys = keysOf(fr).sort()
    const enKeys = keysOf(en).sort()
    expect(enKeys).toEqual(frKeys)
  })

  it('aucune valeur vide', () => {
    for (const [dict, name] of [
      [fr, 'fr'],
      [en, 'en'],
    ] as const) {
      const empty = keysOf(dict).filter((path) => {
        const value = path.split('.').reduce<unknown>(
          (node, key) => (node as Record<string, unknown>)?.[key],
          dict,
        )
        return typeof value === 'string' && value.trim() === ''
      })
      expect(empty, `valeurs vides dans ${name}.json`).toEqual([])
    }
  })

  it('declare les formes plurielles attendues par i18next', () => {
    // i18next >= 21 utilise les suffixes _one / _other, et non _plural.
    expect(fr.dashboard).toHaveProperty('sessions_one')
    expect(fr.dashboard).toHaveProperty('sessions_other')
    expect(fr.dashboard).not.toHaveProperty('sessions_plural')
  })
})
