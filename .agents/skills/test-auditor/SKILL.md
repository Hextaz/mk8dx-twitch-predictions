---
name: test-auditor
description: Skill d'audit de testabilité et de couverture pour MK8DX Twitch Predictions. Exécute et enrichit la suite de tests automatisés via le runner natif node:test. Traque les tests creux, évalue la couverture des cas limites (remboursements, verrous prématurés, pannes Twitch) et garantit la non-régression du dashboard.
---

# 🧪 Test Auditor - MK8DX Twitch Predictions

Ce skill évalue impitoyablement la qualité, la testabilité et la robustesse de la suite de tests unitaires et d'intégration du dashboard.

---

## 🔍 Piliers d'Évaluation de la Suite de Tests

### 1. 🎯 Couverture des Cycles Métier Clés
* **Cycle Standard (Victoire)** :
  1. `POST /api/prediction/create` ➔ État `ACTIVE`.
  2. `POST /api/prediction/lock` ➔ État `LOCKED`.
  3. `POST /api/prediction/resolve` ➔ État `RESOLVED` + archivage SQLite.
* **Cycle Incident (Remboursement)** :
  1. `POST /api/prediction/create`.
  2. `POST /api/prediction/cancel` ➔ État `CANCELED` + zéro point distribué.
* **Gestion des Joueurs MK8DX** :
  - Ajout, unicité, suppression, sélection du pilote par défaut.

### 2. ⚡ Cas Limites & Robustesse
* Rejet des requêtes incomplètes (titre vide, moins de 2 choix, ID d'issue introuvable).
* Clamping strict de la durée des paris (30s minimum, 1800s maximum).
* Tronquage transparent du titre (45 caractères max Twitch) sans planter.
* Fonctionnement continu en mode simulation quand aucun token Twitch n'est renseigné.

### 3. ⏱️ Déterminisme & Vitesse
* Exécution via le runner natif `node --test` (sans Jest ou Mocha lourd).
* Vitesse d'exécution cible : **< 200 ms** pour l'intégralité de la suite.
* Isolation stricte : tests sans dépendance réseau externe obligatoire.

---

## 🛠️ Commandes Rapides

```bash
# Exécution complète de la suite
npm test

# Exécution avec rapport détaillé
NODE_ENV=test node --test --test-reporter=spec test/api.test.js
```
