# Rapport technique

[`rapport.pdf`](rapport.pdf) — 19 pages : contexte du stage chez Anypli,
technologies découvertes, limites de la première version, architecture de la
refonte, algorithme de planification détaillé, difficultés rencontrées et bilan
d'apprentissage.

## Recompiler

Avec une installation TeX Live :

```bash
make
```

Sans TeX Live, via Docker :

```bash
make docker
```

Les figures sont reprises des captures de `../media/frames/`, elles-mêmes
régénérées par `npm run demo:capture` à la racine du dépôt.
