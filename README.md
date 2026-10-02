# Planificateur de révisions

Application web qui transforme une liste d'examens en un **planning de révision**
réparti dans le temps : l'étudiant saisit ses épreuves avec leur coefficient et
leur matière, déclare ses créneaux disponibles, et obtient des sessions placées
automatiquement dans son calendrier selon le principe de la **répétition espacée**.

Monorepo TypeScript : backend **Strapi 5**, frontend **React 18 + Vite**, et un
moteur de planification isolé, testé indépendamment des deux.

![Démonstration](docs/media/demonstration.gif)

*Parcours complet : connexion, saisie d'un examen, déclaration des disponibilités,
génération puis enregistrement du planning. La vidéo en meilleure qualité est dans
[`docs/media/demonstration.mp4`](docs/media/demonstration.mp4) ; elle est régénérée
par `npm run demo:capture`, qui pilote l'application et assemble les images avec ffmpeg.*

| | |
|---|---|
| ![Planning proposé](docs/media/frames/0007-planning-previsualisation.png) | ![Disponibilités](docs/media/frames/0006-disponibilites.png) |
| Prévisualisation avant enregistrement : volume nécessaire, volume planifié, et chaque séance datée avec son rang et son écart à l'examen. | Édition des créneaux : le planning ne propose que ces plages. |

---

## Démarrage

```bash
npm install
npm run dev
```

- Interface : <http://localhost:5173>
- API et administration Strapi : <http://localhost:1337>

Au premier démarrage, le backend crée la base SQLite, applique les permissions et
injecte un jeu de données de démonstration (5 matières, 5 examens, un compte prêt
à l'emploi). Aucune configuration manuelle n'est nécessaire.

**Compte de démonstration** — `demo@revision-planner.local` / `Demo1234!`

Les dates des examens sont relatives au jour du démarrage : la démonstration reste
pertinente quelle que soit la date à laquelle le dépôt est cloné.

---

## Le moteur de planification

C'est le cœur du projet. `packages/core` ne dépend ni de React ni de Strapi : c'est
du TypeScript pur, ce qui le rend testable et réutilisable.

### Volume de révision

Le temps accordé à un examen dépend de son **coefficient** et de la **difficulté de
sa matière** :

```
minutes = coefficient × 6 × facteur_difficulté      (facile 0,75 · moyen 1 · difficile 1,35)
```

arrondi au multiple supérieur d'une session. Un examen de coefficient 40 en matière
difficile obtient 6 séances d'une heure ; un coefficient 10 en matière facile, une seule.

### Répétition espacée

Les séances sont placées à des intervalles **croissants** avant l'épreuve — J-1, J-3,
J-6, J-10, J-15… — soit une révision dense à l'approche de l'examen et de plus en plus
espacée en remontant dans le temps. Quand l'examen est trop proche pour cette
progression, les décalages sont comprimés proportionnellement pour tenir dans la
fenêtre disponible.

### Garanties

Le moteur garantit, et ses tests le vérifient :

- aucune session dans le passé, ni après la date de l'examen concerné ;
- une marge de repos configurable avant chaque épreuve ;
- aucun chevauchement entre deux sessions, y compris pour des examens différents ;
- les créneaux de disponibilité, les pauses et le plafond journalier sont respectés ;
- les échéances proches sont servies en priorité en cas de pénurie de créneaux ;
- un **diagnostic explicite** quand une session ne peut pas être placée, avec sa cause.

```bash
npm test          # 32 tests sur le moteur
npm run typecheck # TypeScript strict sur les trois paquets
```

---

## Architecture

```
revision-planner/
├── packages/core/     Moteur de planification — TypeScript pur, 32 tests
├── apps/api/          Backend Strapi 5 — schémas, permissions, données de démo
├── apps/web/          Frontend React 18 + Vite + Redux Toolkit
└── scripts/           Capture automatisée de la démonstration
```

### Modèle de données

| Type       | Rôle                                                              |
|------------|-------------------------------------------------------------------|
| `student`  | Profil étudiant, rattaché à un compte, porteur des disponibilités   |
| `subject`  | Matière et sa difficulté                                           |
| `exam`     | Épreuve : date, coefficient, type, matière                         |
| `revision-session` | Créneau de révision généré, rattaché à un examen           |

Les schémas sont **versionnés dans le dépôt** (`apps/api/src/api/*/content-types/`),
et les permissions du rôle « authenticated » sont appliquées par code au démarrage
(`apps/api/src/bootstrap/permissions.ts`). Une installation neuve est donc
reproductible, sans réglage manuel dans l'interface d'administration.

### Cloisonnement des données

Chaque requête est filtrée **côté serveur** par le profil étudiant du compte appelant :
les contrôleurs imposent la relation `student` en lecture comme en écriture, et une
requête sans jeton reçoit un `403`. Le filtrage n'est jamais délégué au navigateur.

---

## Variante PostgreSQL

SQLite suffit au développement. Pour se rapprocher d'un déploiement réel :

```bash
docker compose up -d postgres
DATABASE_CLIENT=postgres DATABASE_HOST=localhost DATABASE_PORT=5432 \
DATABASE_NAME=revision_planner DATABASE_USERNAME=strapi DATABASE_PASSWORD=strapi \
npm run dev
```

---

## Historique

Ce projet est la refonte d'une application écrite pendant un stage de deuxième année.
Le code d'origine reste consultable dans l'historique de ce dépôt : les 22 commits
antérieurs n'ont pas été modifiés, et le commit « Retirer la version 1 avant la
refonte » marque la bascule. Les principales différences :

| | Version 1 | Version 2 |
|---|---|---|
| Backend | non versionné, à configurer à la main | schémas, permissions et données dans le dépôt |
| Planification | 18 lignes : coefficient ÷ 10, toujours 18 h, 60 min | moteur isolé et testé : difficulté, disponibilités, collisions, diagnostics |
| Sessions passées | générées malgré tout | impossibles par construction |
| Filtrage des données | côté navigateur, après avoir tout téléchargé | côté serveur, par contrôleur |
| Noms de relations | devinés à l'exécution parmi trois candidats | modèle fixe et typé |
| Retours utilisateur | `alert()` bloquants | notifications et prévisualisation avant enregistrement |
| Tests | un test de fumée | 32 tests sur le moteur |
| TypeScript | `any` omniprésent | strict, sans `any` |

---

## Développement sur macOS

Ne placez pas ce dépôt dans un dossier synchronisé par iCloud Drive (Bureau,
Documents) ni OneDrive : les démons de synchronisation génèrent des événements
système que les observateurs de fichiers de Vite et de Strapi interprètent comme
des modifications, ce qui provoque des redémarrages en boucle — sans compter la
synchronisation inutile de `node_modules`.
