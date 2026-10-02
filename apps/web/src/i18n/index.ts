import i18next from 'i18next'
import { initReactI18next } from 'react-i18next'
import fr from './fr.json'
import en from './en.json'

/**
 * Les deux dictionnaires sont charges statiquement et leurs cles sont
 * verifiees par un test : une traduction manquante devient une erreur de
 * build plutot qu'une cle brute affichee a l'ecran.
 */
void i18next.use(initReactI18next).init({
  resources: { fr: { translation: fr }, en: { translation: en } },
  lng: navigator.language.startsWith('en') ? 'en' : 'fr',
  fallbackLng: 'fr',
  interpolation: { escapeValue: false },
})

export default i18next
