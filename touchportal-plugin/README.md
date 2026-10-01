# 📱 Plugin Touch Portal - MK8DX Predictions

Ce plugin permet de contrôler tes prédictions Twitch Mario Kart 8 Deluxe directement depuis **Touch Portal** sur ta tablette ou ton smartphone en stream.

---

## 🚀 Installation Rapide (Fichier `.tpp`)

1. Assure-toi que le fichier **`MK8DX_Predictions.tpp`** a été généré (ou lance `npm run build:tp`).
2. Ouvre **Touch Portal Desktop** sur ton PC de stream.
3. Va dans **Paramètres** (la clé à molette en haut à droite) ➔ **Plugins**.
4. Clique sur **Importer un plugin** et sélectionne le fichier `MK8DX_Predictions.tpp`.
5. Valide la fenêtre d'autorisation d'exécution.

---

## ⚙️ Configuration de l'URL du Serveur

Dans Touch Portal Desktop :
* Va dans **Paramètres ➔ Plugins ➔ MK8DX Predictions**.
* Dans le champ **Server URL**, indique l'adresse de ton dashboard :
  * Si le dashboard tourne en local sur le PC de stream : `http://localhost:3003`
  * Si le dashboard tourne sur ton serveur Lordi : `http://lordi:3003` (ou l'IP locale de Lordi, ex: `http://192.168.1.50:3003`).

---

## 🎮 Actions Disponibles pour tes Boutons Touch Portal

Dans l'éditeur de boutons Touch Portal, catégorie **MK8DX Twitch Predictions** :

| Action | Description | Paramètres |
| :--- | :--- | :--- |
| **MK8: Sélectionner Pilote** | Sélectionne le pilote pour la prochaine course | `Slot 1` à `Slot 6` |
| **MK8: Choisir l'Objectif** | Règle l'objectif du pilote | `Top 1`, `Top 3`, `Top 6`, `Flop (7-12)` |
| **MK8: Choisir la Durée** | Règle le timer des paris | `30`, `45`, `60`, `90`, `120` secondes |
| **MK8: Lancer la Prédiction** | Envoie la prédiction en direct sur Twitch | - |
| **MK8: Clôturer les paris** | Verrouille les paris immédiatement (feu vert) | - |
| **MK8: Valider le Choix Vainqueur** | Distribue les points aux gagnants | `Choix 1 (Oui)` ou `Choix 2 (Non)` |
| **MK8: Annuler & Rembourser** | Rembourse intégralement tous les viewers | - |

---

## 📊 Variables d'État (States) pour le Texte Dynamique

Tu peux afficher ces variables directement dans le texte de tes boutons Touch Portal en écrivant `${state:...}` :

* **`${state:mk8_status}`** : `EN ATTENTE`, `PARIS OUVERTS`, `COURSE EN COURS`.
* **`${state:mk8_title}`** : Titre complet (ex: *"Nolhan fera-t-il Top 3 ?"*).
* **`${state:mk8_timer}`** : Décompte en secondes (`28s`, `27s`...).
* **`${state:mk8_total_points}`** : Montant total des points (ex: `🪙 4 500 pts`).
* **`${state:mk8_outcome1}`** : Libellé et points du Choix 1 (ex: *"Oui: 3 200 pts"*).
* **`${state:mk8_outcome2}`** : Libellé et points du Choix 2 (ex: *"Non: 1 300 pts"*).
* **`${state:mk8_player_slot_1}`** à **`${state:mk8_player_slot_6}`** : Noms de tes pilotes configurés.
* **`${state:mk8_selected_player}`** : Nom du pilote actuellement sélectionné.
* **`${state:mk8_selected_target}`** : Objectif sélectionné (`TOP 3`, etc.).

---

## 💡 Exemple de Page Recommandée sur Touch Portal

* **Ligne 1** : 4 boutons Pilotes avec le texte `${state:mk8_player_slot_1}`, `${state:mk8_player_slot_2}`... (action : *Sélectionner Pilote Slot X*).
* **Ligne 2** : 4 boutons Objectifs `Top 1`, `Top 3`, `Top 6`, `Flop` (action : *Choisir l'Objectif*).
* **Ligne 3** : 
  * Bouton Durée : `${state:mk8_selected_duration}`
  * Bouton Lancer : `🚀 LANCER (${state:mk8_timer})`
  * Bouton Feu Vert : `🔒 CLÔTURER`
  * Bouton Rembourser : `🔄 REMBOURSER`
* **Ligne 4** :
  * Gros bouton : `✅ GAGNÉ : OUI` (action : *Valider Choix 1*)
  * Gros bouton : `❌ GAGNÉ : NON` (action : *Valider Choix 2*)
