---
name: security-auditor
description: Skill d'audit de sécurité offensif/défensif pour MK8DX Twitch Predictions. Vérifie la confidentialité absolue des tokens Twitch OAuth, la protection contre les injections SQLite, la validation des entrées API (titres, issues, fenêtres de temps), la limite de taille des requêtes et l'exposition réseau sécurisée.
---

# 🔒 Security Auditor - MK8DX Twitch Predictions

Ce skill audite la sécurité globale du dashboard exposé sur le serveur Lordi ou publiquement via **Cloudflare Zero Trust Tunnel** sous `*.hextaz.dev`.

---

## 🔍 Points de Contrôle Critiques

### 1. Protection Absolue des Secrets Twitch OAuth
* **Principe du moindre privilège** :
  - Le `twitch_client_secret`, le `bot_access_token` et le `bot_refresh_token` ne doivent **JAMAIS** transiter en clair vers le frontend client.
  - L'endpoint `GET /api/config` doit renvoyer des indicateurs booléens masqués (`clientSecretSet: true`, `botTokenSet: true`) et non les tokens bruts.
* **Intégrité Git** :
  - Le fichier `.env` et le dossier `data/` contenant `predictions.db` doivent obligatoirement figurer dans `.gitignore`.
  - Zéro secret en dur dans le code source commité.

### 2. Injections SQL & Intégrité SQLite
* **Vérification** : Chaque requête SQLite dans `server/db.js` et `server/index.js` doit impérativement utiliser des paramètres préparés (`?`).
* **Interdiction formelle** : Toute interpolation directe de chaînes (`db.exec("SELECT * WHERE name = '" + name + "'")`).

### 3. Validation Stricte des Entrées (Input Sanitization)
* Respect des contraintes strictes imposées par l'API Twitch Helix :
  - **Titre de la prédiction** : Tronqué ou limité à **45 caractères** maximum.
  - **Titres des issues** : Limités à **25 caractères** maximum par choix.
  - **Nombre d'issues** : Strictement compris entre **2 et 10**.
  - **Durée des paris** : Clamping obligatoire entre **30 et 1800 secondes**.
* **Body Limit Hono** : Protection contre les attaques DoS avec `bodyLimit({ maxSize: 64 * 1024 })`.

### 4. Exposition Réseau & Cloudflare Zero Trust
* L'application doit idéalement être accessible derrière **Cloudflare Access** (authentification Zero Trust par email/PIN) afin d'empêcher tout visiteur non autorisé de manipuler les prédictions du stream.
* Configuration CORS restrictive sur les endpoints d'API.
