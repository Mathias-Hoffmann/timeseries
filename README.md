# Méta-Générateur de Code pour Contraintes de Séries Temporelles

**Projet FIT A3 2025-2026 — IMT Atlantique**
**Superviseur** : Nicolas Beldiceanu
**Équipe** : Robin Louppe, Mathias Hoffmann, Kéwan-Ilian Cicofran, Clément Markoum

---

## Présentation

Ce projet implémente un **méta-générateur** qui, à partir de la description formelle d'un transducteur fini (états, transitions, lettres sémantiques de sortie) et d'une table de décoration (fonctions phi, delta, accumulateurs), produit automatiquement du code exécutable capable de détecter des motifs structurels dans des séries temporelles et de calculer des caractéristiques agrégées sur ces motifs.

Le cadre théorique repose sur les travaux de **Beldiceanu et al. (2015)** — *A Modelling Pearl with Sortedness Constraints* — qui formalisent la détection de patterns dans les séries temporelles via des transducteurs à états finis opérant sur la **signature** de la série (suite des comparaisons `<`, `=`, `>` entre éléments consécutifs).

## Architecture

L'application est une **Single Page Application React** qui fonctionne comme un véritable méta-générateur : elle lit dynamiquement les structures de données des transducteurs (états, transitions, lettres de sortie) et les tables de décoration (fonctions phi, delta, éléments neutres) pour synthétiser du code exécutable. Il ne s'agit **pas** de templates hardcodés par pattern, mais d'une génération paramétrique à partir des données formelles.

```
┌─────────────────────────────────────────────────────┐
│                   Interface React                   │
│                                                     │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐           │
│  │ Sélection│  │ Sélection│  │ Sélection│           │
│  │ Pattern  │  │ Feature  │  │Agrégateur│           │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘           │
│       │             │             │                 │
│       ▼             ▼             ▼                 │
│  ┌─────────────────────────────────────────┐        │
│  │         Moteur de Génération            │        │
│  │                                         │        │
│  │  Transducteur   ×   Table de    →  Code │        │
│  │  (états,            décoration          │        │
│  │   transitions,      (phi, delta,        │        │
│  │   sorties)          neutres)            │        │
│  └─────────────┬───────────────────────────┘        │
│                │                                    │
│       ┌────────┼────────┐                           │
│       ▼        ▼        ▼                           │
│    Python    Java       C                           │
│                                                     │
│  ┌─────────────────────────────────────────┐        │
│  │     Visualisation SVG du Transducteur   │        │
│  └─────────────────────────────────────────┘        │
└─────────────────────────────────────────────────────┘
```

## Concepts Théoriques

### Signature d'une série temporelle

La signature transforme une série de valeurs en une suite de comparaisons entre éléments consécutifs. Pour une série `[v₀, v₁, ..., vₙ]`, la signature est `[s₀, s₁, ..., sₙ₋₁]` où :

- `sᵢ = '<'` si `vᵢ < vᵢ₊₁`
- `sᵢ = '='` si `vᵢ = vᵢ₊₁`
- `sᵢ = '>'` si `vᵢ > vᵢ₊₁`

**Exemple** : `[4, 1, 3, 1, 4, 6]` → signature `['>', '<', '>', '<', '<']`

### Transducteur à états finis (seed transducer)

Chaque pattern est défini par un transducteur qui lit la signature en entrée et produit des **lettres sémantiques de sortie** indiquant le rôle de chaque position par rapport au pattern :

| Lettre sémantique | Signification | Effet sur les accumulateurs |
| ----------------- | ------------- | --------------------------- |
| `out` | Position hors de tout pattern | Aucun effet |
| `outr` (out_reset) | Sortie avec réinitialisation | Réinitialise D et l'occurrence courante |
| `outa` (out_after) | Sortie après un pattern trouvé | Agrège C dans R, réinitialise C et D |
| `maybeb` (maybe_before) | Position potentiellement avant le pattern | Accumule dans D |
| `maybea` (maybe_after) | Position potentiellement après le pattern | Accumule dans D |
| `found` | Pattern confirmé | Transfère D dans C |
| `founde` (found_end) | Pattern confirmé et terminé | Agrège directement dans R |
| `in` | Position à l'intérieur du pattern | Accumule D dans C |

### Accumulateurs (table de décoration)

Trois accumulateurs maintiennent l'état du calcul :

- **R** (Result) : résultat agrégé final, initialisé à l'élément neutre de l'agrégateur (`∞` pour min, `-∞` pour max, `0` pour sum)
- **C** (Current) : valeur du feature pour l'occurrence courante, initialisé à l'élément neutre du feature
- **D** (Default/Deferred) : valeur potentielle en attente de confirmation, initialisé à l'élément neutre du feature

### Fonctions phi et delta

- **phi(acc, val)** : fonction de mise à jour du feature — combine la valeur accumulée avec une nouvelle contribution
- **delta** : contribution de chaque position au feature (1 pour width, `values[i]` pour les autres)

### Attributs before/after

Chaque pattern possède des attributs `b` (before) et `a` (after) indiquant combien d'éléments avant et après le motif central font partie de l'occurrence. Par exemple, `peak` a `b=1, a=1` : le premier élément croissant et le dernier élément décroissant sont inclus dans l'occurrence.

## Patterns Disponibles (12)

| Pattern | Regex | États | Description |
|---|---|---|---|
| **peak** | `< (= \| <)* (> \| =)* >` | d, r, t | Pic : montée puis descente |
| **valley** | `> (= \| >)* (< \| =)* <` | d, r, t | Vallée : descente puis montée |
| **zigzag** | `(<>)+(< \| <>)` | d, u, down | Alternance montée/descente |
| **plateau** | `<=*>` | d, r, p | Plateau : montée, palier, descente |
| **proper_plateau** | `<=+>` | d, r, p, f | Plateau propre avec palier non vide |
| **inflexion** | `< (< \| =)* > \| > (> \| =)* <` | d, inc, dec | Point d'inflexion |
| **increasing** | `<` | d | Augmentation simple |
| **decreasing** | `>` | d | Diminution simple |
| **steady** | `=` | d | Égalité |
| **increasing_sequence** | `< (< \| =)* <` | d, r | Séquence croissante |
| **decreasing_sequence** | `> (> \| =)* >` | d, f | Séquence décroissante |
| **summit** | `(< \| (< (= \| <)* <)) (> \| (> (= \| >)* >))` | d, r, t | Sommet strict |

## Features

| Feature | Neutre | phi(acc, val) | delta | Description |
|---|---|---|---|---|
| **width** | 0 | `acc + val` | 1 | Nombre d'éléments dans l'occurrence |
| **height** | 0 | `max(acc, val)` | `values[i]` | Valeur maximale dans l'occurrence |
| **surface** | 0 | `acc + val` | `values[i]` | Somme des valeurs de l'occurrence |
| **min** | +∞ | `min(acc, val)` | `values[i]` | Valeur minimale dans l'occurrence |
| **max** | -∞ | `max(acc, val)` | `values[i]` | Valeur maximale dans l'occurrence |

## Agrégateurs

| Agrégateur | Neutre | Opération | Description |
|---|---|---|---|
| **min** | +∞ | `min(r, c)` | Minimum sur toutes les occurrences |
| **max** | -∞ | `max(r, c)` | Maximum sur toutes les occurrences |
| **sum** | 0 | `r + c` | Somme sur toutes les occurrences |

## Combinatoire

Le système peut générer du code pour **12 × 5 × 3 = 180 combinaisons** (pattern × feature × agrégateur), chacune produisant un programme exécutable complet.

## Utilisation

### Prérequis

- Node.js ≥ 18
- npm ou yarn

### Installation

```bash
npm install
npm run dev
```

### Étapes d'utilisation

1. **Choisir un pattern** (ex: Peak)
2. **Choisir un langage cible** (Python, Java, C)
3. **Choisir un feature** (ex: Width)
4. **Choisir un agrégateur** (ex: Min)
5. **Entrer une série temporelle** de test (valeurs séparées par des virgules)
6. **Cliquer sur "Générer le Code"** → le code est affiché et téléchargeable
7. **Observer le graphe SVG** du transducteur sélectionné avec ses états et transitions

### Exemple

Pour `peak / width / min` avec la série `4,1,3,1,4,6,1,5,5,2,7,2,3,1,6,1` :

```
Signature: >, <, >, <, <, >, <, =, >, <, >, <, >, <, >

6 peaks détectés avec widths [1, 2, 2, 1, 1, 1]

MIN_WIDTH_PEAK = 1
```

### Exécuter le code généré

```bash
# Python
python min_width_peak.py

# Java (à venir)
javac MinWidthPeak.java && java MinWidthPeak

# C (à venir)
gcc -o min_width_peak min_width_peak.c && ./min_width_peak
```

## Structure des fichiers

```
├── node_modules/            # Dépendances npm
├── src/
│   ├── App.jsx              # Composant principal (transducteurs, génération, UI)
│   ├── main.jsx             # Point d'entrée React
│   └── index.css            # Directives Tailwind (@tailwind base/components/utilities)
├── index.html               # Page HTML racine (point d'entrée Vite)
├── package.json             # Dépendances et scripts npm
├── package-lock.json        # Verrouillage des versions
├── vite.config.js           # Configuration Vite (bundler)
├── tailwind.config.js       # Configuration Tailwind CSS
├── postcss.config.js        # Configuration PostCSS (plugin Tailwind)
├── min_width_peak.py        # Exemple de code Python généré
└── README.md                # Ce fichier
```

## Visualisation du transducteur

L'application inclut un rendu SVG interactif pour chaque transducteur montrant :

- Les **états** (cercles colorés), avec l'état initial marqué en vert
- Les **transitions** (arcs fléchés) avec l'étiquette `entrée : sortie_sémantique`
- Les **boucles** (auto-transitions) pour les transitions d'un état vers lui-même
- Les **statistiques** : nombre d'états, nombre de transitions, expression régulière, attributs before/after

## Détails techniques de la génération

Le générateur produit une fonction Python complète qui :

1. **Calcule la signature** de la série temporelle d'entrée
2. **Simule le transducteur** en lisant la signature caractère par caractère
3. **Maintient les accumulateurs** R, C, D selon les lettres sémantiques de sortie
4. **Applique phi et delta** pour mettre à jour le feature courant
5. **Agrège les résultats** via la fonction d'agrégation choisie
6. **Retourne** la valeur agrégée et les positions des occurrences détectées

Le code généré utilise des `elif` pour les transitions (garantissant qu'une seule transition est prise par pas de temps), initialise correctement `C` à l'élément neutre du feature (pas de l'agrégateur), et gère la finalisation de la dernière occurrence en fin de série.

## Références

- Beldiceanu, N., Carlsson, M., Douence, R., & Simonis, H. (2015). *A Modelling Pearl with Sortedness Constraints*. Global Constraints and Their Applications, Springer.
- Beldiceanu, N., Carlsson, M., & Petit, T. (2004). *Deriving filtering algorithms from constraint checkers*. Principles and Practice of Constraint Programming (CP 2004).

## Licence

Projet académique — IMT Atlantique, FIT A3, 2025-2026.