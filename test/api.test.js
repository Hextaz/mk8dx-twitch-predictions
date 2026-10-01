import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import app from '../server/index.js';
import { getPlayers, addPlayer, removePlayer, getConfig, setConfig } from '../server/db.js';
import { TwitchService } from '../server/twitch.js';

describe('MK8DX Predictions - Tests Unitaires & API', () => {
  test('SQLite: Gestion des joueurs', () => {
    const initial = getPlayers();
    assert.ok(Array.isArray(initial));

    // Ajout d'un joueur
    const testName = 'TestPlayerMK8';
    addPlayer(testName, 0);
    const updated = getPlayers();
    assert.ok(updated.some(p => p.name === testName));

    // Suppression du joueur
    const afterDelete = removePlayer(testName);
    assert.ok(!afterDelete.some(p => p.name === testName));
  });

  test('SQLite: Gestion de la configuration', () => {
    setConfig('test_key', 'test_value_123');
    const val = getConfig('test_key');
    assert.equal(val, 'test_value_123');
  });

  test('API: GET /api/health (Healthcheck Uptime Kuma)', async () => {
    const res = await app.request('/api/health');
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.equal(json.status, 'ok');
    assert.equal(json.app, 'mk8dx-twitch-predictions');
    assert.ok(json.memory);
    assert.ok(json.memory.rssMb > 0);
  });

  test('API: GET /api/players', async () => {
    const res = await app.request('/api/players');
    assert.equal(res.status, 200);
    const json = await res.json();
    assert.ok(Array.isArray(json));
  });

  test('API: Simulation de Prédiction (Cycle Complet)', async () => {
    // 1. Création d'une prédiction
    const createRes = await app.request('/api/prediction/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        title: 'Nolhan fera-t-il Top 3 ?',
        outcomes: [{ title: 'Oui' }, { title: 'Non' }],
        predictionWindow: 30
      })
    });
    assert.equal(createRes.status, 200);
    const createJson = await createRes.json();
    assert.ok(createJson.prediction);
    assert.equal(createJson.prediction.title, 'Nolhan fera-t-il Top 3 ?');
    assert.equal(createJson.prediction.status, 'ACTIVE');
    const predId = createJson.prediction.id;

    // 2. Vérification que la prédiction active est retournée
    const activeRes = await app.request('/api/prediction/active');
    assert.equal(activeRes.status, 200);
    const activeJson = await activeRes.json();
    assert.equal(activeJson.prediction?.id, predId);

    // 3. Verrouillage prématuré (LOCKED)
    const lockRes = await app.request('/api/prediction/lock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ predictionId: predId })
    });
    assert.equal(lockRes.status, 200);

    // 4. Clôture / Résolution (RESOLVED)
    const resolveRes = await app.request('/api/prediction/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        predictionId: predId,
        winningOutcomeId: createJson.prediction.outcomes[0].id
      })
    });
    assert.equal(resolveRes.status, 200);

    // 5. Vérification qu'il n'y a plus de prédiction active
    const finalActive = await app.request('/api/prediction/active');
    const finalJson = await finalActive.json();
    assert.equal(finalJson.prediction, null);
  });

  test('API: Touch Portal Endpoints (/api/tp/*)', async () => {
    // 1. État initial
    const stateRes = await app.request('/api/tp/state');
    assert.equal(stateRes.status, 200);
    const stateJson = await stateRes.json();
    assert.ok(stateJson.status);
    assert.ok(Array.isArray(stateJson.playerSlots));

    // 2. Sélection de joueur (Slot 1)
    const selectRes = await app.request('/api/tp/select-player', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slot: 1 })
    });
    assert.equal(selectRes.status, 200);
    const selectJson = await selectRes.json();
    assert.ok(selectJson.selectedPlayer);

    // 3. Sélection d'objectif (Top 1)
    const targetRes = await app.request('/api/tp/select-target', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: 'top1' })
    });
    assert.equal(targetRes.status, 200);

    // 4. Lancement de prédiction via Touch Portal
    const launchRes = await app.request('/api/tp/launch', { method: 'POST' });
    assert.equal(launchRes.status, 200);
    const launchJson = await launchRes.json();
    assert.ok(launchJson.prediction);
    assert.equal(launchJson.prediction.status, 'ACTIVE');

    // 5. Verrouillage via Touch Portal
    const lockRes = await app.request('/api/tp/lock', { method: 'POST' });
    assert.equal(lockRes.status, 200);

    // 6. Validation via Touch Portal (Choix 1 / Oui)
    const resolveRes = await app.request('/api/tp/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ outcomeIndex: 0 })
    });
    assert.equal(resolveRes.status, 200);
  });

  test('OAuth: PUBLIC_URL pilote la redirect URI derrière un tunnel', async () => {
    process.env.PUBLIC_URL = 'https://twitch.hextaz.dev/';
    try {
      const json = await (await app.request('/api/config')).json();
      assert.equal(json.redirectUri, 'https://twitch.hextaz.dev/api/auth/twitch/callback');
    } finally {
      delete process.env.PUBLIC_URL;
    }
    const json = await (await app.request('http://localhost:3003/api/config')).json();
    assert.equal(json.redirectUri, 'http://localhost:3003/api/auth/twitch/callback');
  });

  test('OAuth: refuse un compte autre que le diffuseur sans enregistrer le token', async () => {
    const savedEnv = { ...process.env };
    const savedFetch = globalThis.fetch;
    const savedName = getConfig('broadcaster_name');
    setConfig('broadcaster_name', 'MaChaine');
    Object.assign(process.env, { TWITCH_CLIENT_ID: 'cid', TWITCH_CLIENT_SECRET: 'secret' });
    globalThis.fetch = async (url) => {
      if (String(url).endsWith('/token')) {
        return Response.json({ access_token: 'tok-modo', refresh_token: 'ref', expires_in: 3600 });
      }
      return Response.json({ login: 'compte_modo', user_id: '42', scopes: ['channel:manage:predictions'] });
    };
    try {
      await assert.rejects(
        TwitchService.exchangeCode('code', 'http://localhost:3003/api/auth/twitch/callback'),
        /compte_modo/
      );
      assert.notEqual(getConfig('bot_access_token'), 'tok-modo');
    } finally {
      globalThis.fetch = savedFetch;
      process.env = savedEnv;
      setConfig('broadcaster_name', savedName ?? '');
    }
  });
});
