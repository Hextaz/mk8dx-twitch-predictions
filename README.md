# 🏎️ MK8DX Twitch Predictions

Dashboard ultra-rapide et tactile conçu pour lancer, verrouiller et résoudre des prédictions Twitch en **2 clics** pendant des streams Mario Kart 8 Deluxe.

Conçu spécialement pour tourner 24h/24 sur le serveur homelab **Lordi** (Windows 11, Intel Celeron, 4 Go RAM) avec un heap V8 bridé à **48 Mo** (~75 Mo de RSS au total).

---

## ⚡ Caractéristiques Principales

* 📱 **Interface Tactile Optimisée Stream Deck** : Gros boutons adaptés aux écrans tactiles (tablette ou smartphone posé à côté de la Nintendo Switch), pas besoin de minimiser OBS ou le jeu.
* 👤 **Gestionnaire de Pilotes (Presets)** : Sélection en un clic du pilote de la course (toi, tes mates de team, un rival dans la salle) avec ajout rapide de pseudos à la volée.
* 🎯 **Objectifs Prédéfinis** : Top 1 (Victoire), Top 3 (Podium), Top 6 (1ère moitié de grille), Flop (7-12) ou custom.
* ⏱️ **Durée Adaptée à MK8DX** : Sélecteur rapide 30s, 45s, 60s, 90s, 120s pour s'adapter au court temps d'attente entre deux courses en ligne.
* 🔒 **Verrouillage Prématuré** : Fermeture instantanée des paris dès que le feu vert démarre si les 30s ne sont pas écoulées.
* 🏆 **Clôture Immédiate & Distribution** : 1 clic pour désigner le vainqueur et créditer les points aux viewers.
* 🔄 **Bouton d'Annulation / Remboursement** : En cas de déconnexion Nintendo Switch, crash de salle ou joueur déco avant le départ.
* 🔑 **Connexion OAuth de la chaîne** : Le dashboard se connecte avec ton compte principal (`channel:manage:predictions`) et renouvelle automatiquement le token. L'API Twitch n'autorise pas un compte modérateur à gérer les prédictions.
* 🧪 **Mode Simulation Intégré** : L'application fonctionne et se teste même hors-ligne ou avant d'avoir configuré ses clés Twitch.

---

## 🛠️ Guide d'Installation Rapide

### 1. Prérequis Twitch
1. Ta chaîne principale doit être **Affiliée ou Partenaire** (requis par Twitch pour les points de chaîne et prédictions).
2. Crée une application sur [Twitch Developer Console](https://dev.twitch.tv/console/apps) :
   * **Nom** : MK8DX Predictions (ou le nom de ton choix)
   * **OAuth Redirect URLs** : `http://localhost:3003/api/auth/twitch/callback` (et, derrière un tunnel Cloudflare, `https://twitch.hextaz.dev/api/auth/twitch/callback` avec `PUBLIC_URL` défini dans le `.env`)
   * **Category** : *Website Integration*
   * **Client Type** : *Confidentiel*

### 2. Démarrage Local

```bash
# Cloner et installer les dépendances
npm install

# Compiler le frontend
npm run build

# Démarrer en local
npm start
```

Rends-toi sur `http://localhost:3003`, ouvre la fenêtre **Configuration** (engrenage en haut à droite) saisis ton `Client ID` / `Client Secret`, puis connecte **ton compte principal** en 1 clic. Sans `PUBLIC_URL`, cette connexion doit se faire depuis un navigateur sur la machine du serveur (`localhost`).

---

## 🌐 Déploiement sur Lordi (PM2)

Le projet intègre un fichier `ecosystem.config.cjs` bridé à 48 Mo de RAM avec les optimisations V8 :

```bash
pm2 start ecosystem.config.cjs
pm2 save
```

### Healthcheck Uptime Kuma
Le serveur expose `/api/health` qui renvoie l'état du serveur et la consommation RAM en temps réel :
```json
{
  "status": "ok",
  "app": "mk8dx-twitch-predictions",
  "uptime": 1240,
  "memory": {
    "rssMb": 24.8,
    "heapUsedMb": 12.3
  },
  "twitchConfigured": true
}
```
