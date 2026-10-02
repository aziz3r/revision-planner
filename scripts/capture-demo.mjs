/**
 * Capture de la demonstration.
 *
 * Pilote l'application dans un navigateur, enregistre une image a chaque
 * etape, puis assemble une video et un GIF avec ffmpeg. La demonstration est
 * ainsi reproductible : elle se regenere a l'identique apres chaque evolution
 * de l'interface, au lieu d'etre un enregistrement manuel vite perime.
 *
 * Prerequis : les deux serveurs demarres (`npm run dev`) et ffmpeg installe.
 * Usage : npm run demo:capture
 */
import { mkdir, rm, readdir } from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'

const WEB_URL = process.env.WEB_URL ?? 'http://localhost:5173'
const OUT_DIR = new URL('../docs/media/', import.meta.url).pathname
const FRAME_DIR = `${OUT_DIR}frames/`
const VIEWPORT = { width: 1440, height: 900 }
const DEMO = { email: 'demo@revision-planner.local', password: 'Demo1234!' }

let frame = 0
const shots = []

/**
 * Enregistre une image.
 *
 * `inVideo: false` la conserve comme capture fixe sans l'inclure dans la
 * sequence video : une image de taille differente (vue mobile) interromprait
 * la generation de palette du GIF.
 */
async function capture(page, label, { hold = 12, inVideo = true } = {}) {
  const name = `${String(frame).padStart(4, '0')}-${label}.png`
  await page.screenshot({ path: `${FRAME_DIR}${name}` })
  shots.push({ name, label, hold, inVideo })
  frame += 1
  return name
}

/** Duplique les images pour tenir la duree voulue dans la video. */
async function expandFrames() {
  const { copyFile } = await import('node:fs/promises')
  let index = 0
  for (const shot of shots) {
    if (!shot.inVideo) continue
    for (let i = 0; i < shot.hold; i += 1) {
      await copyFile(`${FRAME_DIR}${shot.name}`, `${FRAME_DIR}seq-${String(index).padStart(5, '0')}.png`)
      index += 1
    }
  }
  return index
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit' })
    child.on('error', reject)
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${command} a echoue (${code})`))))
  })
}

const API_URL = process.env.API_URL ?? 'http://localhost:1337'
const DEMO_EXAM = 'Algorithmique avancee'

/**
 * Remet le jeu de donnees dans son etat initial avant de filmer : l'examen
 * ajoute pendant la demonstration est supprime, ainsi que les sessions deja
 * generees. Le script est donc rejouable et produit toujours la meme video.
 */
async function resetDemoData() {
  const auth = await fetch(`${API_URL}/api/auth/local`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: DEMO.email, password: DEMO.password }),
  })
  if (!auth.ok) throw new Error(`Connexion a l'API impossible (${auth.status})`)
  const { jwt } = await auth.json()
  const headers = { Authorization: `Bearer ${jwt}` }

  const exams = await (await fetch(`${API_URL}/api/exams?pagination[pageSize]=100`, { headers })).json()
  let removed = 0
  for (const exam of exams.data ?? []) {
    if (exam.name === DEMO_EXAM) {
      await fetch(`${API_URL}/api/exams/${exam.documentId}`, { method: 'DELETE', headers })
      removed += 1
    }
  }

  const sessions = await (await fetch(`${API_URL}/api/revision-sessions?pagination[pageSize]=500`, { headers })).json()
  for (const session of sessions.data ?? []) {
    await fetch(`${API_URL}/api/revision-sessions/${session.documentId}`, { method: 'DELETE', headers })
  }
  console.log(`Donnees remises a zero : ${removed} examen(s) de demonstration, ${(sessions.data ?? []).length} session(s)`)
}

async function main() {
  await resetDemoData()
  await rm(FRAME_DIR, { recursive: true, force: true })
  await mkdir(FRAME_DIR, { recursive: true })

  const browser = await chromium.launch()
  const context = await browser.newContext({ viewport: VIEWPORT, locale: 'fr-FR' })
  const page = await context.newPage()

  const errors = []
  page.on('console', (message) => {
    if (message.type() === 'error') errors.push(message.text())
  })

  // 1. Connexion
  await page.goto(`${WEB_URL}/connexion`, { waitUntil: 'networkidle' })
  await capture(page, 'connexion')
  await page.fill('#identifier', DEMO.email)
  await page.fill('#password', DEMO.password)
  await capture(page, 'connexion-remplie')
  await page.click('button[type=submit]')
  await page.waitForURL(`${WEB_URL}/`)
  await page.waitForLoadState('networkidle')
  await capture(page, 'tableau-de-bord', { hold: 20 })

  // 2. Liste des examens
  await page.click('a[href="/examens"]')
  await page.waitForLoadState('networkidle')
  await capture(page, 'examens', { hold: 18 })

  // 3. Ajout d'un examen
  await page.getByRole('button', { name: /ajouter un examen/i }).click()
  await page.fill('#name', 'Algorithmique avancee')
  const date = new Date()
  date.setDate(date.getDate() + 21)
  date.setHours(9, 0, 0, 0)
  const pad = (n) => String(n).padStart(2, '0')
  await page.fill(
    '#date',
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T09:00`,
  )
  await page.fill('#weight', '45')
  await page.selectOption('#kind', 'partiel')
  await capture(page, 'examen-formulaire', { hold: 20 })
  await page.getByRole('button', { name: /^Enregistrer$/ }).click()
  await page.waitForLoadState('networkidle')
  await capture(page, 'examen-ajoute', { hold: 16 })

  // 4. Disponibilites
  await page.click('a[href="/disponibilites"]')
  await page.waitForLoadState('networkidle')
  await capture(page, 'disponibilites', { hold: 20 })

  // 5. Generation du planning
  await page.click('a[href="/"]')
  await page.waitForLoadState('networkidle')
  await page.getByRole('button', { name: /generer le planning/i }).click()
  await page.waitForSelector('#preview-title')
  // La previsualisation s'affiche sous le calendrier : sans ce defilement,
  // la fonctionnalite principale resterait hors champ dans la video.
  await page.locator('#preview-title').scrollIntoViewIfNeeded()
  await page.waitForTimeout(500)
  await capture(page, 'planning-previsualisation', { hold: 30 })
  await page.getByRole('button', { name: /enregistrer ce planning/i }).click()
  await page.waitForLoadState('networkidle')
  await page.waitForTimeout(1200)
  await page.evaluate(() => window.scrollTo({ top: 0 }))
  await page.waitForTimeout(400)
  await capture(page, 'planning-enregistre', { hold: 26 })

  // 6. Vue semaine du calendrier
  await page.getByRole('button', { name: /semaine|week/i }).first().click()
  await page.waitForTimeout(600)
  await page.locator('.cal-card, .fc').first().scrollIntoViewIfNeeded()
  await page.waitForTimeout(300)
  await capture(page, 'calendrier-semaine', { hold: 24 })

  // 7. Version anglaise
  await page.getByRole('button', { name: /^EN$/ }).click()
  await page.waitForTimeout(400)
  await capture(page, 'anglais', { hold: 16 })

  // 8. Affichage mobile
  await page.setViewportSize({ width: 390, height: 844 })
  await page.waitForTimeout(400)
  await capture(page, 'mobile', { inVideo: false })

  await browser.close()

  if (errors.length > 0) {
    console.error('Erreurs console detectees :')
    for (const error of errors) console.error('  -', error)
    process.exitCode = 1
  }

  const total = await expandFrames()
  console.log(`${shots.length} etapes, ${total} images`)

  // Toutes les images sont ramenees au meme gabarit : la capture mobile est
  // plus etroite, et un changement de resolution en cours de sequence
  // interrompt la generation de palette du GIF.
  const FIT = `scale=${VIEWPORT.width}:${VIEWPORT.height}:force_original_aspect_ratio=decrease:flags=lanczos,` +
    `pad=${VIEWPORT.width}:${VIEWPORT.height}:(ow-iw)/2:(oh-ih)/2:color=0xf6f7fb,setsar=1`

  await run('ffmpeg', ['-y', '-framerate', '12', '-pattern_type', 'glob', '-i', `${FRAME_DIR}seq-*.png`,
    '-vf', `${FIT},format=yuv420p`, '-movflags', '+faststart',
    `${OUT_DIR}demonstration.mp4`])

  await run('ffmpeg', ['-y', '-framerate', '12', '-pattern_type', 'glob', '-i', `${FRAME_DIR}seq-*.png`,
    '-vf', `${FIT},scale=900:-2:flags=lanczos,split[a][b];[a]palettegen[p];[b][p]paletteuse`,
    '-loop', '0', `${OUT_DIR}demonstration.gif`])

  const produced = await readdir(OUT_DIR)
  console.log('Fichiers produits :', produced.filter((f) => !f.startsWith('frames')).join(', '))
}

await main()
