---
name: twitch-auditor
description: Skill expert sur l'API Twitch Helix et l'ergonomie de stream Mario Kart 8 Deluxe. Vérifie la conformité absolue des requêtes avec les spécifications de Twitch Predictions (limites de caractères, scopes OAuth, rôles modérateurs), la résilience des tokens et l'efficacité d'interaction en plein direct.
---

# 🤖 Twitch Auditor - MK8DX Predictions

Ce skill certifie la conformité de l'application avec les spécifications officielles de l'API **Twitch Helix Predictions** et valide l'ergonomie requise lors d'un stream dynamique de Mario Kart 8 Deluxe.

---

## 🔍 Checklist de Conformité Twitch Helix

### 1. Spécifications Stricte de l'Endpoint `/helix/predictions`
| Paramètre | Règle Twitch Officielle | Implémentation dans le Dashboard |
| :--- | :--- | :--- |
| **`title`** | Max 45 caractères | Tronqué automatiquement (`title.slice(0, 45)`) avec templates optimisés |
| **`outcomes`** | 2 à 10 choix | Exactement 2 choix (Oui/Non) ou 4 choix (Multi-Top) |
| **`outcome.title`** | Max 25 caractères par choix | Choix courts prédéfinis (`Oui`, `Non`, `Top 1`, etc.) |
| **`prediction_window`** | 30s min, 1800s max | Sélecteur borné (30s, 45s, 60s, 90s, 120s) |
| **Scope requis** | `channel:manage:predictions` | Demandé lors de l'URL d'autorisation OAuth |
| **Rôle requis** | Modérateur ou Diffuseur | Le compte secondaire doit être `/mod` sur la chaîne |

### 2. Gestion du Cycle de Vie des Tokens OAuth
* **Validation périodique** : Vérification de validité auprès de `https://id.twitch.tv/oauth2/validate`.
* **Auto-refresh préventif** : Renouvellement du token si l'expiration est imminente (< 60 secondes).
* **Interception des 401** : En cas de token révoqué ou expiré en pleine session de stream, tentative immédiate de renouvellement via le `refresh_token` et rejeu transparent de la requête sans planter l'action du streamer.

---

## 🏎️ Ergonomie Stream MK8DX (Règle des 3 Secondes)

Pendant une session MK8DX, le temps d'attente entre deux circuits dans un salon en ligne oscille entre 30 et 45 secondes. Le streamer a les mains sur la manette.

1. **Zéro saisie obligatoire au clavier** :
   - Sélection du pilote en 1 tap (presets sauvegardés).
   - Sélection de l'objectif en 1 tap (Top 1, Top 3, etc.).
   - Lancement en 1 gros tap tactile.
2. **Gestion des Aléas Mario Kart** :
   - Déconnexion de salle / bug Nintendo : Le bouton de remboursement intégral doit être accessible instantanément, avec confirmation anti-missclick.
   - Feu vert anticipé : Bouton de clôture anticipée des paris (`LOCKED`) pour éviter que les viewers ne parient après le premier virage.
