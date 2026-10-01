---
name: issue-crafter
description: Skill de création et de cadrage d'issues GitHub pour MK8DX Twitch Predictions. Formate les tickets avec user stories claires, critères d'acceptation, contraintes Twitch API Helix, cas limites de stream et respect de la contrainte mémoire (< 50 Mo RAM sur Lordi).
---

# 📝 Issue Crafter - MK8DX Twitch Predictions

Ce skill génère des issues GitHub claires, actionnables et parfaitement documentées pour le projet.

---

## 📋 Structure Standard d'une Issue

```markdown
### 🎯 Contexte & Objectif
Description concise du besoin en stream MK8DX (ex: ajout d'un template de prédiction, raccourci clavier Stream Deck, amélioration de l'historique des points).

### 👤 User Story
En tant que streamer Mario Kart 8 Deluxe,
Je veux pouvoir [action en 1 ou 2 clics pendant le salon],
Afin de [bénéfice / animation de stream / engagement chat].

### 🛠️ Périmètre Technique
- Fichiers impactés : `server/...`, `client/...`
- Intégration Twitch : Endpoints Helix ou scopes impactés
- Base de données : Nouveaux champs ou tables SQLite dans `server/db.js`
- Consommation mémoire : Impact contrôlé sur la limite < 50 Mo de RAM Lordi

### 🏎️ Cas Limites & Ergonomie Stream
- Déconnexion ou bug de salon Nintendo Switch (gestion du remboursement)
- Latence ou coupure réseau Twitch (auto-refresh token)
- Règle des 3 secondes : actionnable d'une seule main sur écran tactile

### 🧪 Critères d'Acceptation
- [ ] Critère 1 : Fonctionnement nominal (création / validation / annulation)
- [ ] Critère 2 : Gestion des cas d'erreur réseau
- [ ] Critère 3 : Tests unitaires verts (`npm test`) et build validé (`npm run build`)
```
