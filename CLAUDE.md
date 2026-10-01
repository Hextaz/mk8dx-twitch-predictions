# MK8DX Twitch Predictions - Directives pour Claude Code & Antigravity

## 📌 Vue d'ensemble du Projet

**MK8DX Twitch Predictions** est un dashboard personnel ultra-léger et tactile conçu pour lancer, verrouiller et résoudre des prédictions Twitch en 2 clics pendant des streams Mario Kart 8 Deluxe. Il tourne sur le serveur **Lordi** et est piloté via le token OAuth du **compte principal de la chaîne** : l'API Helix exige que `broadcaster_id` corresponde à l'utilisateur du token, un modérateur ne peut donc pas gérer les prédictions par API.

### Architecture du Projet
* **`server/`** :
  * `db.js` : Couche de persistance SQLite native (`node:sqlite`). Configuration mémoire sobre (`PRAGMA cache_size = -2000;`, mode WAL). Tables `app_config`, `players`, `prediction_history`.
  * `twitch.js` : Client API Twitch Helix complet (OAuth2 authorization code flow, auto-refresh token sur 401, validation, diagnostics, endpoints `/predictions`). Mode simulation de secours quand non configuré.
  * `index.js` : API REST Hono (`@hono/node-server`) servant à la fois les routes d'API, le webhook OAuth Twitch, les fichiers statiques de `dist/`, et le healthcheck Uptime Kuma (`/api/health`).
* **`client/`** :
  * Frontend SPA moderne écrit en Vue 3 avec Vite.
  * `src/api.js` : Client API unifié.
  * `src/style.css` : Thème sombre Mario Kart 8 Deluxe / Twitch (accent néon, ergonomie tactile Stream Deck).
  * `src/components/Header.vue` : En-tête avec statuts Twitch & mémoire RAM en direct.
  * `src/components/ActivePrediction.vue` : Gestion de la course en cours (timer, barre de progression, verrouillage prématuré, boutons de victoire et remboursement).
  * `src/components/PredictionCreator.vue` : Panneau tactile de création de prédiction (sélection de pilote, objectif, durée, aperçu).
  * `src/components/SettingsModal.vue` : Modal de configuration OAuth et diagnostic Twitch.
  * `src/components/HistoryModal.vue` : Historique des dernières courses et points distribués.
* **`ecosystem.config.cjs`** : Configuration PM2 pour le serveur de production Windows 11 avec plafond de 48 Mo de RAM.

---

## 🌐 Environnement d'Hébergement & Services Homelab (24/7)

L'application tourne 24h/24 sur le serveur personnel **"Lordi"** sous Windows 11 (processeur Intel Celeron, 4 Go de RAM globale), accessible en local sur le réseau ou publiquement via **Cloudflare Zero Trust Tunnel** sur le port interne `localhost:3003`.

### Services Homelab & Synergies

| Service | URL / Destination | Rôle pour MK8DX Predictions |
| :--- | :--- | :--- |
| **CI/CD & GitOps** | `https://deploy.hextaz.dev` | Webhook GitHub. Déploie automatiquement l'application (`git pull`, `npm run build`, `pm2 restart mk8-predictions`) à chaque push sur `main`. |
| **Monitoring & Uptime** | `https://status.hextaz.dev` | Uptime Kuma surveillant la disponibilité du port 3003 (`/api/health`) et la santé de SQLite. |
| **Productivité & Logs** | `https://bin.hextaz.dev` | MicroBin pour partager des logs d'erreurs ou des diagnostics Twitch. |

---

## ⚡ Règle Absolue : Contrainte Mémoire (heap V8 ≤ 48 Mo)

La machine hôte disposant d'un processeur modeste et de 4 Go de RAM globale pour l'ensemble des services, **le heap V8 est plafonné à 48 Mo** et aucune dépendance lourde ne doit être ajoutée. Node vide consomme déjà ~40 Mo de RSS et l'appli ~70-75 Mo : PM2 redémarre au-delà de 120 Mo (`max_memory_restart`), seuil à ne pas abaisser sous peine de boucle de redémarrage.

1. **Frontend 100% Statique** : La SPA est pré-compilée (`npm run build`) en un bundle statique de **~38 Ko gzip**. Le serveur Hono ne fait aucun SSR.
2. **SQLite Sobre** : Requêtes préparées avec `node:sqlite`, taille de cache limitée à 2 Mo (`PRAGMA cache_size = -2000;`).
3. **V8 Flags sous PM2** : `--max-old-space-size=48 --optimize-for-size`.

---

## 🛠️ Commandes & Scripts Essentiels

### 1. Développement
```bash
# Démarrer le serveur Hono en mode surveillance
npm run dev:server

# Démarrer le client Vite en mode HMR
npm run dev
```

### 2. Compilation & Production
```bash
# Compiler le frontend SPA dans dist/
npm run build

# Démarrer en production avec contrainte mémoire
npm start
```

### 3. Tests Unitaires
```bash
npm test
```

---

## 🧰 Skills & Commandes Rapides Disponibles

Les compétences d'ingénierie sont installées dans `.agents/skills/` et `.claude/skills/` :

* **`/code-review`** (`code-reviewer`) : Audit intransigeant Staff Engineer (Architecture Hono, intégration Twitch Helix, intégrité SQLite, fluidité tactile Vue 3, mémoire, absence de band-aids).
* **`/resolve-issue`** (`issue-ritual`) : Cycle de résolution d'issue en 5 phases avec gate d'approbation obligatoire.
* **`/test-audit`** (`test-auditor`) : Exécution et enrichissement de la suite de tests natifs `node:test`.
* **`/security-audit`** (`security-auditor`) : Audit de sécurité (confidentialité des tokens Twitch OAuth, injections SQL, validation JSON, exposition tunnel Cloudflare).
* **`/audit-memory`** (`memory-guardian`) : Mesure de l'empreinte RSS et benchmark de conformité mémoire (heap ≤ 48 Mo, RSS < 120 Mo) sur Lordi.
* **`twitch-auditor`** : Vérification de conformité avec les spécifications de l'API Twitch Helix Predictions et l'ergonomie de stream MK8DX.
* **`issue-crafter`** : Atelier de cadrage et rédaction de tickets GitHub avec critères d'acceptation et contraintes de stream.

