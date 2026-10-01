import { getConfig, setConfig, setMultipleConfig, logPrediction, updatePredictionLog } from './db.js';

const TWITCH_API_BASE = 'https://api.twitch.tv/helix';
const TWITCH_OAUTH_BASE = 'https://id.twitch.tv/oauth2';

// Cache mémoire pour la prédiction simulée si mode démo
let mockPrediction = null;

export class TwitchService {
  /**
   * Vérifie si les identifiants minimums sont configurés
   */
  static isConfigured() {
    const clientId = getConfig('twitch_client_id', process.env.TWITCH_CLIENT_ID);
    const token = getConfig('bot_access_token', process.env.TWITCH_BOT_ACCESS_TOKEN);
    const broadcaster = getConfig('broadcaster_id', process.env.TWITCH_BROADCASTER_ID || process.env.TWITCH_BROADCASTER_NAME);
    return Boolean(clientId && token && broadcaster);
  }

  /**
   * Récupère les configurations actives (fusion DB + variables d'environnement)
   */
  static getCredentials() {
    return {
      clientId: getConfig('twitch_client_id') || process.env.TWITCH_CLIENT_ID || '',
      clientSecret: getConfig('twitch_client_secret') || process.env.TWITCH_CLIENT_SECRET || '',
      broadcasterId: getConfig('broadcaster_id') || process.env.TWITCH_BROADCASTER_ID || '',
      broadcasterName: getConfig('broadcaster_name') || process.env.TWITCH_BROADCASTER_NAME || '',
      botUserId: getConfig('bot_user_id') || '',
      botUserName: getConfig('bot_user_name') || '',
      botAccessToken: getConfig('bot_access_token') || process.env.TWITCH_BOT_ACCESS_TOKEN || '',
      botRefreshToken: getConfig('bot_refresh_token') || process.env.TWITCH_BOT_REFRESH_TOKEN || '',
      botExpiresAt: Number(getConfig('bot_token_expires_at') || 0)
    };
  }

  /**
   * Génère l'URL d'autorisation OAuth pour le compte bot
   */
  static getOAuthUrl(redirectUri) {
    const { clientId } = this.getCredentials();
    if (!clientId) {
      throw new Error('Twitch Client ID manquant.');
    }
    const scopes = [
      'channel:manage:predictions',
      'channel:read:predictions',
      'user:read:email'
    ].join(' ');

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      scope: scopes,
      force_verify: 'true'
    });

    return `${TWITCH_OAUTH_BASE}/authorize?${params.toString()}`;
  }

  /**
   * Échange le code d'autorisation contre un access_token et refresh_token
   */
  static async exchangeCode(code, redirectUri) {
    const { clientId, clientSecret } = this.getCredentials();
    if (!clientId || !clientSecret) {
      throw new Error('Client ID et Client Secret sont requis pour échanger le code OAuth.');
    }

    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      grant_type: 'authorization_code',
      redirect_uri: redirectUri
    });

    const res = await fetch(`${TWITCH_OAUTH_BASE}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Échec de l'authentification Twitch: ${err.message || res.statusText}`);
    }

    const data = await res.json();
    const expiresAt = Date.now() + (data.expires_in * 1000);

    // Twitch exige que broadcaster_id corresponde à l'utilisateur du token :
    // un modérateur ne peut pas gérer les prédictions via l'API, seul le diffuseur le peut.
    const info = await this.validateToken(data.access_token);
    if (!info || !info.user_id) {
      throw new Error('Token Twitch reçu invalide.');
    }
    const { broadcasterName } = this.getCredentials();
    if (broadcasterName && broadcasterName.trim().toLowerCase() !== info.login.toLowerCase()) {
      throw new Error(
        `Connecté avec @${info.login} au lieu de @${broadcasterName.trim()}. ` +
        "L'API Twitch n'autorise que le compte de la chaîne à gérer les prédictions : reconnecte-toi avec ton compte principal."
      );
    }

    setMultipleConfig({
      bot_access_token: data.access_token,
      bot_refresh_token: data.refresh_token,
      bot_token_expires_at: expiresAt,
      bot_user_id: info.user_id,
      bot_user_name: info.login,
      broadcaster_id: info.user_id,
      broadcaster_name: info.login
    });

    return data;
  }

  /**
   * Rafraîchit le token d'accès via le refresh_token
   */
  static async refreshAccessToken() {
    const { clientId, clientSecret, botRefreshToken } = this.getCredentials();
    if (!clientId || !clientSecret || !botRefreshToken) {
      throw new Error('Impossible de rafraîchir le token (informations manquantes).');
    }

    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: botRefreshToken,
      client_id: clientId,
      client_secret: clientSecret
    });

    const res = await fetch(`${TWITCH_OAUTH_BASE}/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString()
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(`Erreur lors du rafraîchissement du token: ${err.message || res.statusText}`);
    }

    const data = await res.json();
    const expiresAt = Date.now() + (data.expires_in * 1000);

    setMultipleConfig({
      bot_access_token: data.access_token,
      bot_refresh_token: data.refresh_token || botRefreshToken,
      bot_token_expires_at: expiresAt
    });

    return data.access_token;
  }

  /**
   * Valide un access_token auprès de Twitch
   */
  static async validateToken(token = null) {
    const t = token || this.getCredentials().botAccessToken;
    if (!t) return null;

    const res = await fetch(`${TWITCH_OAUTH_BASE}/validate`, {
      headers: { Authorization: `OAuth ${t}` }
    });

    if (!res.ok) return null;
    return await res.json();
  }

  /**
   * Résout un pseudo Twitch en broadcaster_id (numérique)
   */
  static async resolveUserId(usernameOrId) {
    const clean = usernameOrId.trim().toLowerCase();
    if (/^\d+$/.test(clean)) {
      return clean; // C'est déjà un ID numérique
    }

    const creds = this.getCredentials();
    let token = creds.botAccessToken;
    if (!token && creds.clientId && creds.clientSecret) {
      // Tentative de token app si besoin
    }

    const res = await this.fetchWithAuth(`/users?login=${encodeURIComponent(clean)}`);
    if (!res || !res.data || res.data.length === 0) {
      throw new Error(`Utilisateur Twitch non trouvé: "${usernameOrId}"`);
    }

    return res.data[0].id;
  }

  /**
   * Effectue un appel sécurisé vers l'API Helix avec auto-refresh en cas de 401
   */
  static async fetchWithAuth(endpoint, options = {}, isRetry = false) {
    const creds = this.getCredentials();
    let token = creds.botAccessToken;

    // Si le token est expiré ou expire dans moins de 60 secondes
    if (creds.botExpiresAt && Date.now() > creds.botExpiresAt - 60000 && creds.botRefreshToken) {
      try {
        token = await this.refreshAccessToken();
      } catch (err) {
        console.warn('[Twitch] Rafraîchissement préventif échoué:', err.message);
      }
    }

    const url = endpoint.startsWith('http') ? endpoint : `${TWITCH_API_BASE}${endpoint}`;
    const headers = {
      'Client-Id': creds.clientId,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers
    };

    const res = await fetch(url, { ...options, headers });

    if (res.status === 401 && !isRetry && creds.botRefreshToken) {
      console.log('[Twitch] Erreur 401 détectée, tentative de rafraîchissement du token...');
      try {
        const newToken = await this.refreshAccessToken();
        headers.Authorization = `Bearer ${newToken}`;
        return await this.fetchWithAuth(endpoint, { ...options, headers }, true);
      } catch (err) {
        throw new Error(`Session expirée et impossible de renouveler le token: ${err.message}`);
      }
    }

    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.message || `Erreur Twitch API ${res.status}: ${res.statusText}`);
    }

    return await res.json();
  }

  /**
   * Diagnostic complet de la connexion
   */
  static async diagnose() {
    const creds = this.getCredentials();
    const result = {
      configured: false,
      botValid: false,
      botUser: null,
      broadcasterValid: false,
      broadcasterUser: null,
      isModerator: false,
      hasRequiredScopes: false,
      errors: []
    };

    if (!creds.clientId) {
      result.errors.push('Client ID non configuré');
      return result;
    }

    if (!creds.botAccessToken) {
      result.errors.push('Token bot Twitch manquant');
      return result;
    }

    // 1. Validation du token
    try {
      const validation = await this.validateToken(creds.botAccessToken);
      if (validation) {
        result.botValid = true;
        result.botUser = {
          id: validation.user_id,
          login: validation.login
        };
        const scopes = validation.scopes || [];
        result.hasRequiredScopes = scopes.includes('channel:manage:predictions');
        if (!result.hasRequiredScopes) {
          result.errors.push('Le token bot n\'a pas la permission "channel:manage:predictions"');
        }
      } else {
        result.errors.push('Token bot invalide ou expiré');
      }
    } catch (e) {
      result.errors.push(`Erreur validation token: ${e.message}`);
    }

    // 2. Vérification du diffuseur
    if (creds.broadcasterId || creds.broadcasterName) {
      try {
        let bId = creds.broadcasterId;
        if (!bId && creds.broadcasterName) {
          bId = await this.resolveUserId(creds.broadcasterName);
          setConfig('broadcaster_id', bId);
        }
        if (bId) {
          const userRes = await this.fetchWithAuth(`/users?id=${bId}`);
          if (userRes?.data?.[0]) {
            result.broadcasterValid = true;
            result.broadcasterUser = {
              id: userRes.data[0].id,
              login: userRes.data[0].login,
              displayName: userRes.data[0].display_name
            };
          }
        }
      } catch (e) {
        result.errors.push(`Erreur vérification diffuseur: ${e.message}`);
      }
    } else {
      result.errors.push('Nom ou ID du diffuseur non renseigné');
    }

    result.configured = result.botValid && result.broadcasterValid && result.hasRequiredScopes;
    return result;
  }

  /**
   * Récupère la prédiction en cours
   */
  static async getActivePrediction() {
    if (!this.isConfigured()) {
      return { mock: true, prediction: mockPrediction };
    }

    const creds = this.getCredentials();
    let broadcasterId = creds.broadcasterId;
    if (!broadcasterId && creds.broadcasterName) {
      broadcasterId = await this.resolveUserId(creds.broadcasterName);
      setConfig('broadcaster_id', broadcasterId);
    }

    const res = await this.fetchWithAuth(`/predictions?broadcaster_id=${broadcasterId}&first=1`);
    if (!res || !res.data || res.data.length === 0) {
      return { mock: false, prediction: null };
    }

    const pred = res.data[0];
    // Twitch statuses: ACTIVE, LOCKED, RESOLVED, CANCELED
    return {
      mock: false,
      prediction: pred
    };
  }

  /**
   * Crée une nouvelle prédiction sur la chaîne Twitch
   */
  static async createPrediction({ title, outcomes, predictionWindow = 30 }) {
    if (!title || !outcomes || outcomes.length < 2 || outcomes.length > 10) {
      throw new Error('Une prédiction requiert un titre et entre 2 et 10 choix.');
    }

    const windowSec = Math.max(30, Math.min(1800, Number(predictionWindow) || 30));

    // Mode simulation si non configuré
    if (!this.isConfigured()) {
      mockPrediction = {
        id: `mock-${Date.now()}`,
        title,
        status: 'ACTIVE',
        prediction_window: windowSec,
        created_at: new Date().toISOString(),
        locks_at: new Date(Date.now() + windowSec * 1000).toISOString(),
        outcomes: outcomes.map((o, idx) => ({
          id: `out-${idx + 1}`,
          title: typeof o === 'string' ? o : o.title,
          users: 0,
          channel_points: 0,
          color: idx === 0 ? 'BLUE' : 'PINK'
        }))
      };
      logPrediction(mockPrediction);
      return { mock: true, prediction: mockPrediction };
    }

    const creds = this.getCredentials();
    let broadcasterId = creds.broadcasterId;
    if (!broadcasterId && creds.broadcasterName) {
      broadcasterId = await this.resolveUserId(creds.broadcasterName);
      setConfig('broadcaster_id', broadcasterId);
    }

    const body = {
      broadcaster_id: broadcasterId,
      title: title.slice(0, 45), // Limite Twitch stricte: 45 caractères max pour le titre
      outcomes: outcomes.map(o => ({
        title: (typeof o === 'string' ? o : o.title).slice(0, 25) // Limite Twitch: 25 car max
      })),
      prediction_window: windowSec
    };

    const res = await this.fetchWithAuth('/predictions', {
      method: 'POST',
      body: JSON.stringify(body)
    });

    const pred = res.data[0];
    logPrediction(pred);
    return { mock: false, prediction: pred };
  }

  /**
   * Verrouille prématurément une prédiction active (avant fin du timer)
   */
  static async lockPrediction(predictionId) {
    if (!this.isConfigured() || (mockPrediction && mockPrediction.id === predictionId)) {
      if (mockPrediction) {
        mockPrediction.status = 'LOCKED';
      }
      return { mock: true, prediction: mockPrediction };
    }

    const creds = this.getCredentials();
    const res = await this.fetchWithAuth('/predictions', {
      method: 'PATCH',
      body: JSON.stringify({
        broadcaster_id: creds.broadcasterId,
        id: predictionId,
        status: 'LOCKED'
      })
    });

    return { mock: false, prediction: res.data[0] };
  }

  /**
   * Clôture la prédiction avec désignation de l'issue gagnante
   */
  static async resolvePrediction(predictionId, winningOutcomeId) {
    if (!winningOutcomeId) {
      throw new Error('ID de l\'issue gagnante manquant.');
    }

    if (!this.isConfigured() || (mockPrediction && mockPrediction.id === predictionId)) {
      if (mockPrediction) {
        mockPrediction.status = 'RESOLVED';
        mockPrediction.winning_outcome_id = winningOutcomeId;
        const won = mockPrediction.outcomes.find(o => o.id === winningOutcomeId);
        updatePredictionLog(predictionId, {
          status: 'RESOLVED',
          winning_outcome_title: won ? won.title : '',
          winning_outcome_id: winningOutcomeId,
          total_points: mockPrediction.outcomes.reduce((acc, curr) => acc + (curr.channel_points || 0), 0)
        });
        mockPrediction = null;
      }
      return { mock: true, status: 'RESOLVED' };
    }

    const creds = this.getCredentials();
    const res = await this.fetchWithAuth('/predictions', {
      method: 'PATCH',
      body: JSON.stringify({
        broadcaster_id: creds.broadcasterId,
        id: predictionId,
        status: 'RESOLVED',
        winning_outcome_id: winningOutcomeId
      })
    });

    const resolved = res.data[0];
    const winningOutcome = resolved.outcomes.find(o => o.id === winningOutcomeId);
    const totalPoints = resolved.outcomes.reduce((acc, curr) => acc + (curr.channel_points || 0), 0);

    updatePredictionLog(predictionId, {
      status: 'RESOLVED',
      winning_outcome_title: winningOutcome ? winningOutcome.title : '',
      winning_outcome_id: winningOutcomeId,
      total_points: totalPoints
    });

    return { mock: false, prediction: resolved };
  }

  /**
   * Annule et rembourse intégralement tous les points
   */
  static async cancelPrediction(predictionId) {
    if (!this.isConfigured() || (mockPrediction && mockPrediction.id === predictionId)) {
      if (mockPrediction) {
        updatePredictionLog(predictionId, {
          status: 'CANCELED',
          total_points: 0
        });
        mockPrediction = null;
      }
      return { mock: true, status: 'CANCELED' };
    }

    const creds = this.getCredentials();
    const res = await this.fetchWithAuth('/predictions', {
      method: 'PATCH',
      body: JSON.stringify({
        broadcaster_id: creds.broadcasterId,
        id: predictionId,
        status: 'CANCELED'
      })
    });

    updatePredictionLog(predictionId, {
      status: 'CANCELED',
      total_points: 0
    });

    return { mock: false, prediction: res.data[0] };
  }
}
