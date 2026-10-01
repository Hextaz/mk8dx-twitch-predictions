import net from 'node:net';

const PLUGIN_ID = 'MK8DX_Predictions';
const TP_PORT = 12136;
const TP_HOST = '127.0.0.1';

let serverUrl = 'http://localhost:3003';
let client = null;
let lastStates = {};
let pollInterval = null;

function log(...args) {
  console.log(`[MK8DX-TP]`, ...args);
}

function error(...args) {
  console.error(`[MK8DX-TP Error]`, ...args);
}

// Envoi d'un message JSON vers Touch Portal
function sendToTP(obj) {
  if (client && !client.destroyed) {
    client.write(JSON.stringify(obj) + '\n');
  }
}

// Mise à jour d'un état Touch Portal si sa valeur a changé
function updateState(id, value) {
  const strVal = String(value ?? '');
  if (lastStates[id] !== strVal) {
    lastStates[id] = strVal;
    sendToTP({
      type: 'stateUpdate',
      id,
      value: strVal
    });
  }
}

// Appel HTTP vers le serveur Dashboard (Lordi ou local)
async function callApi(endpoint, method = 'POST', body = null) {
  try {
    const url = `${serverUrl}${endpoint}`;
    const options = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) options.body = JSON.stringify(body);
    const res = await fetch(url, options);
    return await res.json().catch(() => ({}));
  } catch (err) {
    error(`Échec appel API ${endpoint}:`, err.message);
    return null;
  }
}

// Synchronisation de l'état complet depuis le serveur
async function syncState() {
  try {
    const state = await callApi('/api/tp/state', 'GET');
    if (!state) return;

    updateState('mk8_status', state.status);
    updateState('mk8_title', state.title);
    updateState('mk8_timer', state.timer);
    updateState('mk8_total_points', `🪙 ${Number(state.totalPoints || 0).toLocaleString()} pts`);

    if (state.outcome1) {
      updateState('mk8_outcome1', `${state.outcome1.title}: ${Number(state.outcome1.points || 0).toLocaleString()} pts`);
    }
    if (state.outcome2) {
      updateState('mk8_outcome2', `${state.outcome2.title}: ${Number(state.outcome2.points || 0).toLocaleString()} pts`);
    }

    updateState('mk8_selected_player', state.selectedPlayer);
    updateState('mk8_selected_target', state.selectedTarget.toUpperCase());
    updateState('mk8_selected_duration', `${state.selectedDuration}s`);

    // Slots de joueurs 1 à 6
    if (Array.isArray(state.playerSlots)) {
      state.playerSlots.forEach((name, idx) => {
        updateState(`mk8_player_slot_${idx + 1}`, name || `Slot ${idx + 1}`);
      });
    }
  } catch (err) {
    error('Erreur synchronisation état:', err.message);
  }
}

// Traitement des actions déclenchées par l'appui sur un bouton Touch Portal
async function handleAction(action) {
  log(`Action reçue: ${action.actionId}`);
  const data = {};
  if (Array.isArray(action.data)) {
    for (const d of action.data) {
      data[d.id] = d.value;
    }
  }

  switch (action.actionId) {
    case 'MK8DX_action_select_player': {
      // Ex: "Slot 1", "Slot 2"...
      const slotStr = data.mk8_slot || 'Slot 1';
      const slotNum = parseInt(slotStr.replace(/\D/g, ''), 10) || 1;
      await callApi('/api/tp/select-player', 'POST', { slot: slotNum });
      break;
    }

    case 'MK8DX_action_select_target': {
      const choice = (data.mk8_target || 'top3').toLowerCase();
      let target = 'top3';
      if (choice.includes('1')) target = 'top1';
      else if (choice.includes('3')) target = 'top3';
      else if (choice.includes('6')) target = 'top6';
      else if (choice.includes('flop')) target = 'flop';
      await callApi('/api/tp/select-target', 'POST', { target });
      break;
    }

    case 'MK8DX_action_select_duration': {
      const dur = parseInt(data.mk8_duration || '30', 10);
      await callApi('/api/tp/select-duration', 'POST', { duration: dur });
      break;
    }

    case 'MK8DX_action_launch': {
      await callApi('/api/tp/launch', 'POST');
      break;
    }

    case 'MK8DX_action_lock': {
      await callApi('/api/tp/lock', 'POST');
      break;
    }

    case 'MK8DX_action_resolve': {
      const choice = data.mk8_choice || 'Choix 1';
      const index = choice.includes('2') || choice.toLowerCase().includes('non') ? 1 : 0;
      await callApi('/api/tp/resolve', 'POST', { outcomeIndex: index });
      break;
    }

    case 'MK8DX_action_cancel': {
      await callApi('/api/tp/cancel', 'POST');
      break;
    }
  }

  // Synchro immédiate après action
  await syncState();
}

// Connexion Socket vers Touch Portal Desktop
function connectToTouchPortal() {
  log(`Connexion à Touch Portal sur ${TP_HOST}:${TP_PORT}...`);
  client = net.createConnection({ host: TP_HOST, port: TP_PORT }, () => {
    log('Connecté à Touch Portal ! Envoi du handshake...');
    sendToTP({ type: 'pair', id: PLUGIN_ID });
  });

  let buffer = '';

  client.on('data', (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split('\n');
    buffer = lines.pop(); // Garder le morceau incomplet

    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const msg = JSON.parse(line.trim());
        if (msg.type === 'info') {
          log('Handshake validé par Touch Portal !');
          if (Array.isArray(msg.settings)) {
            for (const s of msg.settings) {
              if (s['Server URL']) serverUrl = s['Server URL'].replace(/\/$/, '');
            }
          }
          // Démarrer la boucle de synchronisation (1 sec)
          if (!pollInterval) {
            syncState();
            pollInterval = setInterval(syncState, 1000);
          }
        } else if (msg.type === 'settings') {
          if (Array.isArray(msg.values)) {
            for (const s of msg.values) {
              if (s['Server URL']) {
                serverUrl = s['Server URL'].replace(/\/$/, '');
                log(`Server URL mise à jour : ${serverUrl}`);
              }
            }
          }
        } else if (msg.type === 'action') {
          handleAction(msg);
        } else if (msg.type === 'closePlugin') {
          log('Touch Portal a demandé la fermeture du plugin.');
          process.exit(0);
        }
      } catch (e) {
        error('Erreur parsing JSON depuis Touch Portal:', e.message);
      }
    }
  });

  client.on('close', () => {
    log('Déconnecté de Touch Portal. Nouvelle tentative dans 5 secondes...');
    if (pollInterval) {
      clearInterval(pollInterval);
      pollInterval = null;
    }
    setTimeout(connectToTouchPortal, 5000);
  });

  client.on('error', (err) => {
    error('Erreur socket Touch Portal:', err.message);
  });
}

connectToTouchPortal();
