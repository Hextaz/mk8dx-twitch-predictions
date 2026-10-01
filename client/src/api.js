const API_BASE = '/api';

async function fetchJson(endpoint, options = {}) {
  const res = await fetch(`${API_BASE}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers
    },
    ...options
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Erreur serveur (${res.status})`);
  }
  return data;
}

export const api = {
  // Santé & Diagnostic
  getHealth: () => fetchJson('/health'),
  diagnoseTwitch: () => fetchJson('/config/diagnose'),

  // Config
  getConfig: () => fetchJson('/config'),
  saveConfig: (config) => fetchJson('/config', {
    method: 'POST',
    body: JSON.stringify(config)
  }),
  getTwitchOAuthUrl: () => fetchJson('/auth/twitch/url'),

  // Joueurs
  getPlayers: () => fetchJson('/players'),
  addPlayer: (name, isDefault = false) => fetchJson('/players', {
    method: 'POST',
    body: JSON.stringify({ name, isDefault })
  }),
  removePlayer: (name) => fetchJson(`/players/${encodeURIComponent(name)}`, {
    method: 'DELETE'
  }),
  setDefaultPlayer: (name) => fetchJson('/players/default', {
    method: 'POST',
    body: JSON.stringify({ name })
  }),

  // Prédictions
  getActivePrediction: () => fetchJson('/prediction/active'),
  createPrediction: ({ title, outcomes, predictionWindow }) => fetchJson('/prediction/create', {
    method: 'POST',
    body: JSON.stringify({ title, outcomes, predictionWindow })
  }),
  lockPrediction: (predictionId) => fetchJson('/prediction/lock', {
    method: 'POST',
    body: JSON.stringify({ predictionId })
  }),
  resolvePrediction: (predictionId, winningOutcomeId) => fetchJson('/prediction/resolve', {
    method: 'POST',
    body: JSON.stringify({ predictionId, winningOutcomeId })
  }),
  cancelPrediction: (predictionId) => fetchJson('/prediction/cancel', {
    method: 'POST',
    body: JSON.stringify({ predictionId })
  }),
  getHistory: (limit = 10) => fetchJson(`/prediction/history?limit=${limit}`)
};
