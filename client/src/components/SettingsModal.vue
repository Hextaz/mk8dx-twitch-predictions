<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h3 class="modal-title">⚙️ Configuration & Twitch API</h3>
        <button class="btn-close" @click="$emit('close')">&times;</button>
      </div>

      <div class="modal-body">
        <!-- Bannière explicative compte secondaire -->
        <div class="info-card">
          <div class="info-title">💡 Comment lier ta chaîne Twitch ?</div>
          <ol class="info-steps">
            <li>Crée une application sur <strong>dev.twitch.tv/console</strong> (Client confidentiel, Redirect URL : <code>{{ redirectUri }}</code>).</li>
            <li>Connecte-toi ci-dessous avec <strong>ton compte principal</strong> (celui de la chaîne) : l'API Twitch n'autorise pas un modérateur à gérer les prédictions.</li>
          </ol>
        </div>

        <!-- Bouton OAuth Direct -->
        <div class="oauth-section">
          <button 
            type="button" 
            class="btn-oauth" 
            :disabled="!form.clientId || loading" 
            @click="onTwitchOAuth"
          >
            <svg class="twitch-svg" viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
              <path d="M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714Z"/>
            </svg>
            Connecter ma chaîne via Twitch OAuth
          </button>
          <span v-if="!form.clientId" class="field-hint text-warning">
            Saisis d'abord ton Client ID ci-dessous pour activer le bouton OAuth.
          </span>
        </div>

        <form class="settings-form" @submit.prevent="onSave">
          <div class="form-group">
            <label>Chaîne Principale (Diffuseur MK8DX)</label>
            <input 
              v-model="form.broadcasterName" 
              type="text" 
              placeholder="ex: Nolhan (pseudo de ta chaîne de stream)" 
            />
            <span class="field-hint">Le nom de ta chaîne Twitch sur laquelle le stream tourne.</span>
          </div>

          <div class="form-group">
            <label>Twitch Client ID</label>
            <input 
              v-model="form.clientId" 
              type="text" 
              placeholder="ex: abcd1234efgh5678ijkl9012" 
            />
          </div>

          <div class="form-group">
            <label>Twitch Client Secret</label>
            <input 
              v-model="form.clientSecret" 
              type="password" 
              :placeholder="config.clientSecretSet ? '•••••••••••••••• (enregistré)' : 'Secret client de l\'application Twitch'" 
            />
          </div>

          <!-- Section manuelle avancée -->
          <details class="advanced-details">
            <summary>Saisie manuelle des Tokens (Optionnel / Avancé)</summary>
            <div class="form-group mt-2">
              <label>Bot Access Token</label>
              <input 
                v-model="form.botAccessToken" 
                type="password" 
                :placeholder="config.botTokenSet ? '•••••••••••••••• (enregistré)' : 'oauth:xxxx... ou token brut'" 
              />
            </div>
            <div class="form-group">
              <label>Bot Refresh Token</label>
              <input 
                v-model="form.botRefreshToken" 
                type="password" 
                :placeholder="config.botRefreshTokenSet ? '•••••••••••••••• (enregistré)' : 'Refresh token pour auto-renouvellement'" 
              />
            </div>
          </details>

          <!-- Diagnostic de connexion -->
          <div class="diagnostic-box">
            <div class="diag-header">
              <span class="diag-title">Vérification de la Connexion Twitch</span>
              <button 
                type="button" 
                class="btn-secondary btn-sm" 
                :disabled="diagLoading" 
                @click="onDiagnose"
              >
                {{ diagLoading ? 'Test en cours...' : 'Tester la connexion' }}
              </button>
            </div>

            <div v-if="diagResult" class="diag-results">
              <div class="diag-item" :class="diagResult.botValid ? 'diag-ok' : 'diag-err'">
                <span class="diag-bullet">{{ diagResult.botValid ? '✓' : '✗' }}</span>
                <span>Compte Bot : {{ diagResult.botUser ? `@${diagResult.botUser.login}` : 'Non identifié' }}</span>
              </div>
              <div class="diag-item" :class="diagResult.broadcasterValid ? 'diag-ok' : 'diag-err'">
                <span class="diag-bullet">{{ diagResult.broadcasterValid ? '✓' : '✗' }}</span>
                <span>Chaîne Cible : {{ diagResult.broadcasterUser ? `@${diagResult.broadcasterUser.login}` : 'Introuvable' }}</span>
              </div>
              <div class="diag-item" :class="diagResult.hasRequiredScopes ? 'diag-ok' : 'diag-err'">
                <span class="diag-bullet">{{ diagResult.hasRequiredScopes ? '✓' : '✗' }}</span>
                <span>Scope Prédictions : {{ diagResult.hasRequiredScopes ? 'Autorisé (channel:manage:predictions)' : 'Manquant' }}</span>
              </div>
              <div v-if="diagResult.errors && diagResult.errors.length > 0" class="diag-errors">
                <div v-for="(err, idx) in diagResult.errors" :key="idx" class="diag-err-text">
                  ⚠️ {{ err }}
                </div>
              </div>
            </div>
          </div>

          <div class="modal-footer">
            <button type="submit" class="btn-primary" :disabled="loading">
              {{ loading ? 'Enregistrement...' : 'Enregistrer les paramètres' }}
            </button>
            <button type="button" class="btn-secondary" @click="$emit('close')">
              Fermer
            </button>
          </div>
        </form>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { api } from '../api.js';

const props = defineProps({
  config: {
    type: Object,
    default: () => ({})
  }
});

const emit = defineEmits(['close', 'saved']);

const loading = ref(false);
const diagLoading = ref(false);
const diagResult = ref(null);
const redirectUri = ref(props.config?.redirectUri || `${window.location.origin}/api/auth/twitch/callback`);

const form = reactive({
  broadcasterName: '',
  clientId: '',
  clientSecret: '',
  botAccessToken: '',
  botRefreshToken: ''
});

onMounted(() => {
  if (props.config) {
    form.broadcasterName = props.config.broadcasterName || '';
    form.clientId = props.config.clientId || '';
  }
});

async function onTwitchOAuth() {
  try {
    // Sauvegarder d'abord les paramètres saisis (notamment le client_id)
    await onSave();
    const res = await api.getTwitchOAuthUrl();
    if (res.url) {
      window.location.href = res.url;
    }
  } catch (err) {
    alert(`Erreur génération lien OAuth: ${err.message}`);
  }
}

async function onDiagnose() {
  diagLoading.value = true;
  try {
    const res = await api.diagnoseTwitch();
    diagResult.value = res;
  } catch (err) {
    diagResult.value = { errors: [err.message] };
  } finally {
    diagLoading.value = false;
  }
}

async function onSave() {
  loading.value = true;
  try {
    await api.saveConfig({
      broadcasterName: form.broadcasterName,
      clientId: form.clientId,
      clientSecret: form.clientSecret,
      botAccessToken: form.botAccessToken,
      botRefreshToken: form.botRefreshToken
    });
    emit('saved');
  } catch (err) {
    alert(`Erreur sauvegarde: ${err.message}`);
  } finally {
    loading.value = false;
  }
}
</script>

<style scoped>
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  border-bottom: 1px solid var(--border);
  padding-bottom: 14px;
}

.modal-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: #fff;
}

.btn-close {
  background: transparent;
  color: var(--text-dim);
  font-size: 1.6rem;
  padding: 4px;
  line-height: 1;
}

.btn-close:hover {
  color: #fff;
}

.info-card {
  background: rgba(59, 130, 246, 0.08);
  border: 1px solid rgba(59, 130, 246, 0.25);
  border-radius: var(--radius-md);
  padding: 14px;
  margin-bottom: 20px;
}

.info-title {
  font-weight: 700;
  color: #60a5fa;
  font-size: 0.95rem;
  margin-bottom: 6px;
}

.info-steps {
  padding-left: 20px;
  font-size: 0.85rem;
  color: var(--text-muted);
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-steps code {
  background: var(--bg-primary);
  padding: 2px 6px;
  border-radius: 4px;
  color: #93c5fd;
}

.oauth-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  margin-bottom: 24px;
}

.btn-oauth {
  background: linear-gradient(135deg, #9146ff, #772ce8);
  color: #fff;
  border-radius: var(--radius-md);
  padding: 12px 20px;
  width: 100%;
  font-size: 0.95rem;
  box-shadow: 0 4px 16px rgba(145, 70, 255, 0.4);
}

.btn-oauth:hover:not(:disabled) {
  filter: brightness(1.1);
  box-shadow: 0 6px 22px rgba(145, 70, 255, 0.6);
}

.twitch-svg {
  display: inline-block;
}

.settings-form {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.form-group label {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-muted);
}

.field-hint {
  font-size: 0.75rem;
  color: var(--text-dim);
}

.text-warning {
  color: #fbbf24;
}

.advanced-details {
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 10px 14px;
  font-size: 0.85rem;
  color: var(--text-dim);
}

.advanced-details summary {
  cursor: pointer;
  font-weight: 600;
  color: var(--text-muted);
}

.mt-2 {
  margin-top: 12px;
}

.diagnostic-box {
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 14px;
}

.diag-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.diag-title {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-muted);
}

.btn-sm {
  padding: 6px 12px;
  font-size: 0.8rem;
}

.diag-results {
  margin-top: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  font-size: 0.85rem;
}

.diag-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.diag-ok {
  color: #34d399;
}

.diag-err {
  color: #f87171;
}

.diag-bullet {
  font-weight: 900;
}

.diag-errors {
  margin-top: 8px;
  border-top: 1px dashed var(--border);
  padding-top: 8px;
}

.diag-err-text {
  color: #fbbf24;
  font-size: 0.8rem;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  margin-top: 10px;
  border-top: 1px solid var(--border);
  padding-top: 16px;
}
</style>
