---
name: memory-guardian
description: Skill de surveillance et d'optimisation de la mémoire vive pour MK8DX Twitch Predictions. Garantit le respect absolu de la contrainte < 50 Mo de RAM sur le serveur homelab Windows 11 / Intel Celeron (Lordi). Audite la taille du heap V8, la mémoire résidente (RSS), les options de garbage collection et les paramètres PM2.
---

# 🛡️ Memory Guardian - MK8DX Twitch Predictions

La contrainte d'exploitation sur la machine hôte ("Lordi", Windows 11, Intel Celeron, 4 Go RAM) impose un plafond strict : **le processus ne doit jamais excéder 50 Mo de RAM**.

Ce skill fournit les outils et procédures d'audit pour garantir cette sobriété à chaque évolution du code.

---

## 🔍 Procédure d'Audit Mémoire

### 1. Mesure directe de l'empreinte résidente (RSS)
```bash
NODE_ENV=production node --max-old-space-size=48 --optimize-for-size server/index.js &
PID=$!
sleep 2
ps -p $PID -o pid,rss,vsz,comm
kill $PID
```
* **Seuil cible** : RSS < 35 000 Ko (~30-35 Mo).
* **Seuil d'alerte** : RSS > 50 000 Ko.

### 2. Règles d'or d'ingénierie mémoire pour Lordi
1. **Frontend 100% Statique** :
   - La SPA Vue 3 est pré-compilée (`npm run build`) en assets statiques légers (< 40 Ko gzip).
   - Le serveur Hono ne fait aucun SSR et ne conserve aucun état de rendu en mémoire.
2. **SQLite en mode sobre** :
   - `PRAGMA cache_size = -2000;` (limite le cache de pages SQLite à 2 Mo max).
   - Mode `WAL` activé pour des lectures sans verrou bloquant.
3. **Zéro fuite sur les requêtes Twitch** :
   - Les réponses de l'API Twitch ne sont pas stockées indéfiniment en RAM : seules les métadonnées de la prédiction active sont conservées.
   - Les historiques sont écrits directement dans SQLite.
4. **V8 Flags sous PM2** :
   - `--max-old-space-size=48` : force le ramasse-miettes V8 à collecter agressivement avant 48 Mo.
   - `--optimize-for-size` : favorise la compacité mémoire du moteur V8.
