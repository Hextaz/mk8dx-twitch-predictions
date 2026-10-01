---
name: issue-ritual
description: Rituel d'exécution obligatoire pour Claude Code et Antigravity lors de la résolution de toute issue sur MK8DX Twitch Predictions. Comprend le cadrage Git initial, la présentation d'un plan d'implémentation à valider avant de coder, le TDD strict avec Verify RED, la loi d'airain anti-bandaids, le respect de la contrainte mémoire (< 50 Mo RAM sur Lordi), la porte de vérification Evidence Before Claims, et un bilan final sans commit automatique.
---

# 🥋 Rituel de Résolution d'Issue - MK8DX Twitch Predictions

Ce rituel structure le travail de l'agent en **5 phases rigoureuses**. Il impose un **point d'arrêt obligatoire (Gate d'approbation)** après la récolte d'informations pour valider le plan avec l'utilisateur, applique une **discipline d'ingénierie d'élite (TDD, Anti-Band-Aids, Evidence Before Claims)**, veille au strict respect du budget mémoire (< 50 Mo de RAM), et **interdit formellement tout commit automatique**.

---

## 🧭 Vue d'ensemble du Déroulement

```
┌─────────────────────────────────────────┐
│ PHASE 1 : Cadrage & Récolte d'Infos     │ ➜ Git context, gh issue view, DB inspection, Twitch API & Views
└────────────────────┬────────────────────┘
                     ▼
┌─────────────────────────────────────────┐
│ PHASE 2 : 🛑 RÉCAPITULATIF & PLAN       │ ➜ Présenter le plan et attendre le feu vert explicite !
└────────────────────┬────────────────────┘
                     ▼ (Validation utilisateur)
┌─────────────────────────────────────────┐
│ PHASE 3 : Implémentation & TDD Strict   │ ➜ TDD Verify RED ➜ Anti-Band-Aids ➜ DB ➜ Hono API ➜ Vue SPA
└────────────────────┬────────────────────┘
                     ▼
┌─────────────────────────────────────────┐
│ PHASE 4 : 🧪 Porte de Vérification      │ ➜ Evidence Before Claims : build Vite, node -c, tests, mémoire
└────────────────────┬────────────────────┘
                     ▼
┌─────────────────────────────────────────┐
│ PHASE 5 : Bilan Final (Zéro Auto-Commit)│ ➜ Diff propre, mini-rapport 5 lignes, commande commit prête
└─────────────────────────────────────────┘
```

---

## 📍 PHASE 1 : Cadrage & Collecte d'Informations (Ne jamais coder à l'aveugle)

### 1.1 Contexte Git & État de la Branche (CRUCIAL)
Avant toute analyse, vérifier où l'on se trouve pour ne pas écraser de travail ou polluer l'historique :
```bash
# 1. Quelle est la branche active ?
git branch --show-current

# 2. Quels sont les commits déjà présents sur cette branche par rapport à main ?
git log main..HEAD --oneline

# 3. Y a-t-il des modifications en cours non commitées ?
git status --short
git diff
```
* **Vérifications clés** :
  * Si la branche est `main` ou `master`, alerter l'utilisateur et recommander la création d'une branche dédiée : `git checkout -b feature/issue-<NUMERO>`.
  * Si des commits existent déjà sur la branche (`git log main..HEAD`), en prendre connaissance pour **ne pas réécrire ce qui a déjà été fait**.
  * Si des fichiers sont déjà modifiés/non commités (`git status`), les analyser pour distinguer ce qui relève du ticket en cours.

### 1.2 Lire le ticket complet
```bash
gh issue view <NUMERO> --json number,title,body,labels
```

### 1.3 Cartographier les fichiers & Inspecter la base SQLite
- Schéma de base de données : `server/db.js` et fichier réel `data/predictions.db`.
- Logique API Twitch Helix : `server/twitch.js`.
- Serveur REST Hono : `server/index.js`.
- Vues & Composants Vue 3 : `client/src/components/` et `client/src/App.vue`.

---

## 🛑 PHASE 2 : Récapitulatif & Plan d'Implémentation (STOP OBLIGATOIRE)

> [!CAUTION]
> **ARRÊT COMPLET ICI. NE PAS COMMENCER À CODER.**
> Tu dois présenter le plan suivant et attendre l'accord explicite de l'utilisateur.

Présenter un rapport structuré :
1. **État Git & Branche**
2. **Objectif de l'issue**
3. **Fichiers impactés**
4. **Impact Base de données SQLite** (tables ou index modifiés)
5. **Cas limites identifiés** (déconnexion Switch, expiration token OAuth, limites de caractères Twitch 45/25, timer court 30s)
6. **Impact mémoire (< 50 Mo de RAM)** (pas de nouveau buffer ou cache volumineux en mémoire)
7. **Stratégie de Test**

---

## ⚙️ PHASE 3 : Implémentation Rigoureuse & Discipline d'Ingénierie

Une fois le plan validé :

### Ordre logique d'implémentation :
1. **Base de données (`server/db.js`)** : création de tables / colonnes avec requêtes préparées.
2. **Client Twitch API (`server/twitch.js`)** : intégration et gestion des erreurs/tokens.
3. **Endpoints API Hono (`server/index.js`)** : validation des entrées et retours JSON stricts.
4. **Composants & Vues Frontend (`client/src/`)** : intégration réactive Vue 3.
5. **Vérification du build Vite (`npm run build`)**.

### Lois d'ingénierie :
* 🔴 **TDD strict** : Pour tout nouveau calcul ou règle (ex: calcul de timer, formatage de prédiction, validation d'issues), écrire le test unitaire d'abord.
* 🛡️ **Anti-Band-Aids** : Interdiction formelle de poser un patch de symptôme (`?.` magique ou `try/catch` vide qui étouffe l'erreur). Identifier et corriger la cause racine.
* 💾 **Zéro fuite mémoire** : Ne jamais stocker de gros JSON non nettoyés dans le scope global Node.js.

---

## 🧪 PHASE 4 : Porte de Vérification (« Evidence Before Claims »)

Interdiction formelle d'affirmer qu'une tâche fonctionne sans **preuve terminale fraîche** :
1. **Vérification de syntaxe JS** :
   ```bash
   node -c server/index.js
   node -c server/twitch.js
   node -c server/db.js
   ```
2. **Compilation du frontend Vite** :
   ```bash
   npm run build
   ```
3. **Tests unitaires** :
   ```bash
   npm test
   ```
4. **Vérification mémoire** :
   ```bash
   node --max-old-space-size=48 server/index.js &
   PID=$! && sleep 1 && ps -p $PID -o rss,comm && kill $PID
   ```

---

## 📋 PHASE 5 : Bilan Final (ZÉRO AUTO-COMMIT)

* Vérifier `git diff` et `git status` pour s'assurer qu'aucun fichier temporaire ou `console.log` de debug n'est resté.
* **NE JAMAIS COMMITER AUTOMATIQUEMENT.**
* Fournir un mini-rapport en 5 lignes max et suggérer la commande de commit prête à copier/coller.
