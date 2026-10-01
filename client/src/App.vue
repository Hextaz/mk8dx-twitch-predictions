<template>
  <div class="app-wrapper">
    <div class="container">
      <!-- En-tête -->
      <Header
        :status="config"
        :health="health"
        @open-settings="showSettings = true"
        @open-history="showHistory = true"
      />

      <!-- Message d'alerte / feedback (ex: auth success) -->
      <div v-if="toastMessage" class="toast-banner" :class="toastType">
        <span>{{ toastMessage }}</span>
        <button class="toast-close" @click="toastMessage = null">&times;</button>
      </div>

      <main class="main-content">
        <!-- 1. PRÉDICTION ACTIVE (Si en cours) -->
        <ActivePrediction
          v-if="activePrediction"
          :prediction="activePrediction"
          :loading="loadingAction"
          @lock="onLockPrediction"
          @resolve="onResolvePrediction"
          @cancel="onCancelPrediction"
        />

        <!-- 2. CRÉATION RAPIDE DE PRÉDICTION -->
        <PredictionCreator
          :players="players"
          :default-duration="config.defaultDuration || 30"
          :loading="loadingAction"
          @create="onCreatePrediction"
          @add-player="onAddPlayer"
          @remove-player="onRemovePlayer"
        />
      </main>
    </div>

    <!-- Modals -->
    <SettingsModal
      v-if="showSettings"
      :config="config"
      @close="showSettings = false"
      @saved="onConfigSaved"
    />

    <HistoryModal
      v-if="showHistory"
      @close="showHistory = false"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';
import { api } from './api.js';

import Header from './components/Header.vue';
import ActivePrediction from './components/ActivePrediction.vue';
import PredictionCreator from './components/PredictionCreator.vue';
import SettingsModal from './components/SettingsModal.vue';
import HistoryModal from './components/HistoryModal.vue';

const config = ref({});
const health = ref(null);
const players = ref([]);
const activePrediction = ref(null);

const showSettings = ref(false);
const showHistory = ref(false);
const loadingAction = ref(false);

const toastMessage = ref(null);
const toastType = ref('toast-success');

let pollInterval = null;

async function loadData() {
  try {
    const [cfg, hlth, plyrs, active] = await Promise.all([
      api.getConfig(),
      api.getHealth(),
      api.getPlayers(),
      api.getActivePrediction()
    ]);
    config.value = cfg;
    health.value = hlth;
    players.value = plyrs;
    activePrediction.value = active?.prediction || null;
  } catch (err) {
    console.error('Erreur chargement initial:', err);
  }
}

async function pollActivePrediction() {
  try {
    const active = await api.getActivePrediction();
    activePrediction.value = active?.prediction || null;
  } catch (err) {
    // Ignore polling network glitches
  }
}

onMounted(() => {
  loadData();

  // Polling toutes les 3 secondes pour rafraîchir les points et le statut de la prédiction
  pollInterval = setInterval(pollActivePrediction, 3000);

  // Vérifier les query params pour les retours OAuth
  const params = new URLSearchParams(window.location.search);
  if (params.get('auth_success')) {
    toastMessage.value = '✓ Compte bot Twitch connecté avec succès !';
    toastType.value = 'toast-success';
    window.history.replaceState({}, document.title, window.location.pathname);
    loadData();
  } else if (params.get('auth_error')) {
    toastMessage.value = `Erreur d'authentification Twitch : ${params.get('auth_error')}`;
    toastType.value = 'toast-danger';
    window.history.replaceState({}, document.title, window.location.pathname);
  }
});

onUnmounted(() => {
  if (pollInterval) clearInterval(pollInterval);
});

async function onCreatePrediction(payload) {
  loadingAction.value = true;
  try {
    const res = await api.createPrediction(payload);
    activePrediction.value = res.prediction;
    toastMessage.value = '🏁 Prédiction lancée avec succès !';
    toastType.value = 'toast-success';
    setTimeout(() => { if (toastMessage.value?.includes('lancée')) toastMessage.value = null; }, 3000);
  } catch (err) {
    alert(`Échec création prédiction : ${err.message}`);
  } finally {
    loadingAction.value = false;
  }
}

async function onLockPrediction(predictionId) {
  loadingAction.value = true;
  try {
    await api.lockPrediction(predictionId);
    if (activePrediction.value) {
      activePrediction.value.status = 'LOCKED';
    }
  } catch (err) {
    alert(`Erreur verrouillage : ${err.message}`);
  } finally {
    loadingAction.value = false;
  }
}

async function onResolvePrediction({ predictionId, winningOutcomeId }) {
  loadingAction.value = true;
  try {
    await api.resolvePrediction(predictionId, winningOutcomeId);
    activePrediction.value = null;
    toastMessage.value = '🏆 Prédiction validée et points distribués !';
    toastType.value = 'toast-success';
    setTimeout(() => { if (toastMessage.value?.includes('validée')) toastMessage.value = null; }, 4000);
  } catch (err) {
    alert(`Erreur validation : ${err.message}`);
  } finally {
    loadingAction.value = false;
  }
}

async function onCancelPrediction(predictionId) {
  loadingAction.value = true;
  try {
    await api.cancelPrediction(predictionId);
    activePrediction.value = null;
    toastMessage.value = '🔄 Prédiction annulée, tous les points ont été remboursés.';
    toastType.value = 'toast-warning';
    setTimeout(() => { if (toastMessage.value?.includes('annulée')) toastMessage.value = null; }, 4000);
  } catch (err) {
    alert(`Erreur remboursement : ${err.message}`);
  } finally {
    loadingAction.value = false;
  }
}

async function onAddPlayer(name) {
  try {
    players.value = await api.addPlayer(name);
  } catch (err) {
    alert(err.message);
  }
}

async function onRemovePlayer(name) {
  try {
    players.value = await api.removePlayer(name);
  } catch (err) {
    alert(err.message);
  }
}

function onConfigSaved() {
  showSettings.value = false;
  loadData();
  toastMessage.value = 'Paramètres enregistrés.';
  toastType.value = 'toast-success';
  setTimeout(() => { toastMessage.value = null; }, 3000);
}
</script>

<style scoped>
.app-wrapper {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.toast-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 18px;
  border-radius: var(--radius-md);
  margin-bottom: 20px;
  font-weight: 600;
  font-size: 0.9rem;
  animation: fadeIn 0.2s ease-out;
}

.toast-success {
  background: rgba(16, 185, 129, 0.15);
  border: 1px solid rgba(16, 185, 129, 0.4);
  color: #34d399;
}

.toast-warning {
  background: rgba(245, 158, 11, 0.15);
  border: 1px solid rgba(245, 158, 11, 0.4);
  color: #fbbf24;
}

.toast-danger {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.4);
  color: #fca5a5;
}

.toast-close {
  background: transparent;
  color: inherit;
  font-size: 1.3rem;
  line-height: 1;
  padding: 0 4px;
}
</style>
