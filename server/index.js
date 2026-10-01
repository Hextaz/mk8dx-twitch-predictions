import './env.js';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { cors } from 'hono/cors';
import { bodyLimit } from 'hono/body-limit';
import { existsSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  getConfig,
  getAllConfig,
  setConfig,
  setMultipleConfig,
  getPlayers,
  addPlayer,
  removePlayer,
  setDefaultPlayer,
  getHistory
} from './db.js';
import { TwitchService } from './twitch.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, '../dist');
const port = parseInt(process.env.PORT || '3003', 10);
const host = process.env.HOST || '0.0.0.0';

const app = new Hono();

// URI de retour OAuth : PUBLIC_URL (ex: https://twitch.hextaz.dev) derrière un tunnel,
// sinon l'origine de la requête (ex: http://localhost:3003 en local).
function getRedirectUri(c) {
  const publicUrl = process.env.PUBLIC_URL?.trim().replace(/\/+$/, '');
  const origin = publicUrl || new URL(c.req.url).origin;
  return `${origin}/api/auth/twitch/callback`;
}

app.use('*', cors());
app.use('/api/*', bodyLimit({
  maxSize: 64 * 1024,
  onError: (c) => c.json({ error: 'Payload trop volumineux (max 64 Ko)' }, 413)
}));

// Endpoint de santé pour Uptime Kuma & monitoring mémoire de Lordi
app.get('/api/health', (c) => {
  const mem = process.memoryUsage();
  return c.json({
    status: 'ok',
    app: 'mk8dx-twitch-predictions',
    uptime: Math.round(process.uptime()),
    memory: {
      rssMb: +(mem.rss / 1024 / 1024).toFixed(1),
      heapUsedMb: +(mem.heapUsed / 1024 / 1024).toFixed(1)
    },
    twitchConfigured: TwitchService.isConfigured()
  });
});

// Récupération de la configuration publique (sans exposer de secrets complets)
app.get('/api/config', (c) => {
  const creds = TwitchService.getCredentials();
  return c.json({
    isConfigured: TwitchService.isConfigured(),
    clientId: creds.clientId,
    clientSecretSet: Boolean(creds.clientSecret),
    broadcasterName: creds.broadcasterName,
    broadcasterId: creds.broadcasterId,
    botUserName: creds.botUserName,
    botTokenSet: Boolean(creds.botAccessToken),
    botRefreshTokenSet: Boolean(creds.botRefreshToken),
    redirectUri: getRedirectUri(c),
    defaultDuration: Number(getConfig('default_duration', 30)),
    defaultPlayer: getConfig('default_player', 'Nolhan')
  });
});

// Enregistrement des configurations
app.post('/api/config', async (c) => {
  const body = await c.req.json();
  const toUpdate = {};

  if (body.clientId !== undefined) toUpdate.twitch_client_id = body.clientId.trim();
  if (body.clientSecret) toUpdate.twitch_client_secret = body.clientSecret.trim();
  if (body.broadcasterName !== undefined) toUpdate.broadcaster_name = body.broadcasterName.trim();
  if (body.broadcasterId !== undefined) toUpdate.broadcaster_id = body.broadcasterId.trim();
  if (body.botAccessToken) toUpdate.bot_access_token = body.botAccessToken.trim();
  if (body.botRefreshToken) toUpdate.bot_refresh_token = body.botRefreshToken.trim();
  if (body.defaultDuration) toUpdate.default_duration = Number(body.defaultDuration);
  if (body.defaultPlayer) toUpdate.default_player = body.defaultPlayer.trim();

  setMultipleConfig(toUpdate);

  // Si on a le token bot mais pas encore le nom du bot, on essaye de le valider
  if (toUpdate.bot_access_token) {
    try {
      const val = await TwitchService.validateToken(toUpdate.bot_access_token);
      if (val && val.login) {
        setConfig('bot_user_name', val.login);
        setConfig('bot_user_id', val.user_id);
      }
    } catch (_) {}
  }

  return c.json({ success: true, isConfigured: TwitchService.isConfigured() });
});

// Diagnostic de connexion Twitch
app.get('/api/config/diagnose', async (c) => {
  try {
    const diag = await TwitchService.diagnose();
    return c.json(diag);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

// URL OAuth Twitch
app.get('/api/auth/twitch/url', (c) => {
  try {
    const redirectUri = getRedirectUri(c);
    const url = TwitchService.getOAuthUrl(redirectUri);
    return c.json({ url, redirectUri });
  } catch (err) {
    return c.json({ error: err.message }, 400);
  }
});

// Callback OAuth Twitch
app.get('/api/auth/twitch/callback', async (c) => {
  const code = c.req.query('code');
  const error = c.req.query('error');
  const errorDesc = c.req.query('error_description');

  if (error) {
    return c.redirect(`/?auth_error=${encodeURIComponent(errorDesc || error)}`);
  }

  if (!code) {
    return c.redirect('/?auth_error=Code_d_autorisation_manquant');
  }

  try {
    await TwitchService.exchangeCode(code, getRedirectUri(c));
    return c.redirect('/?auth_success=1');
  } catch (err) {
    return c.redirect(`/?auth_error=${encodeURIComponent(err.message)}`);
  }
});

// Gestion des Joueurs (MK8DX)
app.get('/api/players', (c) => {
  return c.json(getPlayers());
});

app.post('/api/players', async (c) => {
  const { name, isDefault } = await c.req.json();
  if (!name || !name.trim()) {
    return c.json({ error: 'Le pseudo est requis.' }, 400);
  }
  try {
    const updated = addPlayer(name, isDefault ? 1 : 0);
    return c.json(updated);
  } catch (err) {
    return c.json({ error: err.message }, 400);
  }
});

app.delete('/api/players/:name', (c) => {
  const name = c.req.param('name');
  const updated = removePlayer(name);
  return c.json(updated);
});

app.post('/api/players/default', async (c) => {
  const { name } = await c.req.json();
  const updated = setDefaultPlayer(name);
  setConfig('default_player', name);
  return c.json(updated);
});

// Gestion des Prédictions
app.get('/api/prediction/active', async (c) => {
  try {
    const result = await TwitchService.getActivePrediction();
    return c.json(result);
  } catch (err) {
    return c.json({ error: err.message }, 500);
  }
});

app.post('/api/prediction/create', async (c) => {
  const body = await c.req.json();
  try {
    const res = await TwitchService.createPrediction({
      title: body.title,
      outcomes: body.outcomes,
      predictionWindow: body.predictionWindow
    });
    return c.json(res);
  } catch (err) {
    return c.json({ error: err.message }, 400);
  }
});

app.post('/api/prediction/lock', async (c) => {
  const { predictionId } = await c.req.json();
  if (!predictionId) return c.json({ error: 'ID manquant' }, 400);
  try {
    const res = await TwitchService.lockPrediction(predictionId);
    return c.json(res);
  } catch (err) {
    return c.json({ error: err.message }, 400);
  }
});

app.post('/api/prediction/resolve', async (c) => {
  const { predictionId, winningOutcomeId } = await c.req.json();
  if (!predictionId || !winningOutcomeId) {
    return c.json({ error: 'Identifiant ou issue manquante' }, 400);
  }
  try {
    const res = await TwitchService.resolvePrediction(predictionId, winningOutcomeId);
    return c.json(res);
  } catch (err) {
    return c.json({ error: err.message }, 400);
  }
});

app.post('/api/prediction/cancel', async (c) => {
  const { predictionId } = await c.req.json();
  if (!predictionId) return c.json({ error: 'ID manquant' }, 400);
  try {
    const res = await TwitchService.cancelPrediction(predictionId);
    return c.json(res);
  } catch (err) {
    return c.json({ error: err.message }, 400);
  }
});

app.get('/api/prediction/history', (c) => {
  const limit = parseInt(c.req.query('limit') || '10', 10);
  return c.json(getHistory(limit));
});

// ==========================================
// Endpoints d'intégration Touch Portal
// ==========================================
let currentSelection = {
  player: getConfig('default_player', 'Nolhan'),
  target: 'top3',
  duration: Number(getConfig('default_duration', 30))
};

const targetLabels = {
  top1: { label: 'Top 1 (Victoire)', suffix: 'Top 1' },
  top3: { label: 'Top 3 (Podium)', suffix: 'Top 3' },
  top6: { label: 'Top 6 (1ère moitié)', suffix: 'Top 6' },
  flop: { label: 'un Flop (7-12)', suffix: 'un Flop (7-12)' }
};

app.get('/api/tp/state', async (c) => {
  const activeRes = await TwitchService.getActivePrediction().catch(() => ({ prediction: null }));
  const pred = activeRes?.prediction;
  const players = getPlayers();

  let status = 'EN ATTENTE';
  let timer = '0s';
  let totalPoints = 0;
  let outcome1 = { title: 'Oui', points: 0, users: 0 };
  let outcome2 = { title: 'Non', points: 0, users: 0 };

  if (pred) {
    if (pred.status === 'ACTIVE') status = 'PARIS OUVERTS';
    else if (pred.status === 'LOCKED') status = 'COURSE EN COURS';
    else status = pred.status;

    if (pred.locks_at) {
      const diff = Math.max(0, Math.round((new Date(pred.locks_at).getTime() - Date.now()) / 1000));
      timer = `${diff}s`;
    } else if (pred.created_at && pred.prediction_window) {
      const end = new Date(pred.created_at).getTime() + (pred.prediction_window * 1000);
      const diff = Math.max(0, Math.round((end - Date.now()) / 1000));
      timer = `${diff}s`;
    }

    if (pred.outcomes && pred.outcomes[0]) {
      outcome1 = {
        title: pred.outcomes[0].title,
        points: pred.outcomes[0].channel_points || 0,
        users: pred.outcomes[0].users || 0
      };
    }
    if (pred.outcomes && pred.outcomes[1]) {
      outcome2 = {
        title: pred.outcomes[1].title,
        points: pred.outcomes[1].channel_points || 0,
        users: pred.outcomes[1].users || 0
      };
    }
    totalPoints = (outcome1.points || 0) + (outcome2.points || 0);
  }

  return c.json({
    status,
    title: pred ? pred.title : `${currentSelection.player} fera-t-il ${targetLabels[currentSelection.target]?.suffix || 'Top 3'} ?`,
    timer,
    totalPoints,
    predictionId: pred?.id || null,
    selectedPlayer: currentSelection.player,
    selectedTarget: currentSelection.target,
    selectedDuration: currentSelection.duration,
    outcome1,
    outcome2,
    playerSlots: [
      players[0]?.name || '',
      players[1]?.name || '',
      players[2]?.name || '',
      players[3]?.name || '',
      players[4]?.name || '',
      players[5]?.name || ''
    ]
  });
});

app.all('/api/tp/select-player', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const queryName = c.req.query('name');
  const slot = body.slot !== undefined ? Number(body.slot) : (c.req.query('slot') ? Number(c.req.query('slot')) : null);
  
  if (slot !== null && slot >= 1) {
    const players = getPlayers();
    if (players[slot - 1]) {
      currentSelection.player = players[slot - 1].name;
    }
  } else if (body.name || queryName) {
    currentSelection.player = (body.name || queryName).trim();
  }
  return c.json({ success: true, selectedPlayer: currentSelection.player });
});

app.all('/api/tp/select-target', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const target = body.target || c.req.query('target');
  if (target && targetLabels[target.toLowerCase()]) {
    currentSelection.target = target.toLowerCase();
  }
  return c.json({ success: true, selectedTarget: currentSelection.target });
});

app.all('/api/tp/select-duration', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const dur = Number(body.duration || c.req.query('duration'));
  if (dur >= 30 && dur <= 1800) {
    currentSelection.duration = dur;
  }
  return c.json({ success: true, selectedDuration: currentSelection.duration });
});

app.all('/api/tp/launch', async (c) => {
  const player = currentSelection.player || 'Nolhan';
  const targetObj = targetLabels[currentSelection.target] || targetLabels.top3;
  let title = `${player} fera-t-il ${targetObj.suffix} ?`;
  if (title.length > 45) {
    title = `${player} : ${targetObj.suffix} ?`;
  }
  title = title.slice(0, 45);

  const res = await TwitchService.createPrediction({
    title,
    outcomes: [{ title: 'Oui' }, { title: 'Non' }],
    predictionWindow: currentSelection.duration
  });
  return c.json(res);
});

app.all('/api/tp/lock', async (c) => {
  const active = await TwitchService.getActivePrediction();
  if (!active?.prediction?.id) {
    return c.json({ error: 'Aucune prédiction active à verrouiller' }, 400);
  }
  const res = await TwitchService.lockPrediction(active.prediction.id);
  return c.json(res);
});

app.all('/api/tp/resolve', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const outcomeIndex = body.outcomeIndex !== undefined 
    ? Number(body.outcomeIndex) 
    : (c.req.query('outcome') === 'no' || c.req.query('outcome') === '1' ? 1 : 0);
  const active = await TwitchService.getActivePrediction();
  if (!active?.prediction?.id) {
    return c.json({ error: 'Aucune prédiction active' }, 400);
  }
  const pred = active.prediction;
  const outcome = pred.outcomes[outcomeIndex] || pred.outcomes[0];
  const res = await TwitchService.resolvePrediction(pred.id, outcome.id);
  return c.json(res);
});

app.all('/api/tp/cancel', async (c) => {
  const active = await TwitchService.getActivePrediction();
  if (!active?.prediction?.id) {
    return c.json({ error: 'Aucune prédiction active à rembourser' }, 400);
  }
  const res = await TwitchService.cancelPrediction(active.prediction.id);
  return c.json(res);
});

// Fichiers statiques SPA (dist/)
if (existsSync(distDir)) {
  app.use('/*', serveStatic({ root: distDir }));
  app.get('*', (c) => {
    const indexPath = join(distDir, 'index.html');
    if (existsSync(indexPath)) {
      return c.html(readFileSync(indexPath, 'utf-8'));
    }
    return c.text('Application en cours de compilation...', 503);
  });
} else {
  app.get('/', (c) => {
    return c.html(`
      <!DOCTYPE html>
      <html>
        <head><title>MK8DX Twitch Predictions</title><meta charset="utf-8"></head>
        <body style="font-family:sans-serif;background:#0f172a;color:#fff;padding:40px;text-align:center;">
          <h1>🏎️ MK8DX Twitch Predictions</h1>
          <p>Le serveur fonctionne ! Exécutez <code>npm run build</code> pour compiler l'interface.</p>
        </body>
      </html>
    `);
  });
}

if (process.env.NODE_ENV !== 'test') {
  console.log(`[MK8DX Predictions] Serveur prêt sur http://${host}:${port}`);
  serve({ fetch: app.fetch, port, hostname: host });
}

export default app;
