<template>
  <div class="active-card card">
    <div class="active-header">
      <div class="status-pill" :class="isLocked ? 'pill-locked' : 'pill-active'">
        <span class="pulsing-dot" :class="{ 'dot-yellow': isLocked }"></span>
        <span class="racing-font uppercase status-text">
          {{ isLocked ? 'PARIS CLÔTURÉS · COURSE EN COURS' : 'PARIS OUVERTS · MISES EN DIRECT' }}
        </span>
      </div>

      <div v-if="!isLocked && timeRemaining > 0" class="timer-badge">
        <span class="timer-icon">⏳</span>
        <span class="timer-val">{{ timeRemaining }}s</span>
      </div>
    </div>

    <!-- Titre de la prédiction -->
    <h2 class="prediction-title">{{ prediction.title }}</h2>

    <!-- Barre de progression du timer si actif -->
    <div v-if="!isLocked && initialDuration > 0" class="progress-bar-bg">
      <div 
        class="progress-bar-fill" 
        :style="{ width: `${progressPercentage}%` }"
        :class="{ 'bar-warning': timeRemaining <= 10 }"
      ></div>
    </div>

    <!-- Répartition des votes / points -->
    <div class="outcomes-grid">
      <div 
        v-for="outcome in prediction.outcomes" 
        :key="outcome.id"
        class="outcome-card"
        :class="{ 'outcome-first': outcome.color === 'BLUE' || outcome.id === 'out-1' }"
      >
        <div class="outcome-top">
          <span class="outcome-name">{{ outcome.title }}</span>
          <span class="outcome-points">
            🪙 {{ (outcome.channel_points || 0).toLocaleString() }} pts
          </span>
        </div>
        <div class="outcome-users">
          👥 {{ outcome.users || 0 }} parieur{{ (outcome.users || 0) > 1 ? 's' : '' }}
        </div>
      </div>
    </div>

    <!-- Actions de gestion -->
    <div class="actions-section">
      <!-- Verrouillage prématuré si les paris sont encore ouverts -->
      <div v-if="!isLocked" class="lock-wrapper">
        <button 
          class="btn-secondary btn-lock" 
          :disabled="loading" 
          @click="$emit('lock', prediction.id)"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          Clôturer les paris maintenant (Feu vert !)
        </button>
      </div>

      <!-- Boutons de Résolution (Victoire) -->
      <div class="resolve-buttons-grid">
        <button
          v-for="(outcome, idx) in prediction.outcomes"
          :key="outcome.id"
          class="btn-resolve"
          :class="idx === 0 ? 'btn-resolve-win' : 'btn-resolve-alt'"
          :disabled="loading"
          @click="onResolve(outcome)"
        >
          <span class="resolve-icon">{{ idx === 0 ? '🏆' : '🏁' }}</span>
          <div class="resolve-text">
            <span class="resolve-label">VALIDER VAINQUEUR</span>
            <span class="resolve-choice">{{ outcome.title }}</span>
          </div>
        </button>
      </div>

      <!-- Bouton d'annulation / Remboursement -->
      <div class="cancel-wrapper">
        <button 
          v-if="!confirmCancel"
          class="btn-cancel" 
          :disabled="loading"
          @click="confirmCancel = true"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>
          Rembourser tout le monde (Bug de room / Déconnexion)
        </button>

        <div v-else class="confirm-cancel-box">
          <span>⚠️ Confirmer le remboursement de tous les viewers ?</span>
          <div class="confirm-buttons">
            <button class="btn-danger" :disabled="loading" @click="onCancel">
              Oui, rembourser
            </button>
            <button class="btn-secondary" @click="confirmCancel = false">
              Annuler
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted, watch } from 'vue';

const props = defineProps({
  prediction: {
    type: Object,
    required: true
  },
  loading: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['lock', 'resolve', 'cancel']);

const confirmCancel = ref(false);
const timeRemaining = ref(0);
const initialDuration = ref(props.prediction.prediction_window || 30);
let timerInterval = null;

const isLocked = computed(() => {
  return props.prediction.status === 'LOCKED' || timeRemaining.value <= 0;
});

const progressPercentage = computed(() => {
  if (initialDuration.value <= 0) return 0;
  return Math.max(0, Math.min(100, (timeRemaining.value / initialDuration.value) * 100));
});

function calculateRemaining() {
  if (props.prediction.status === 'LOCKED') {
    timeRemaining.value = 0;
    return;
  }

  // Calcul basé sur locks_at ou created_at
  if (props.prediction.locks_at) {
    const end = new Date(props.prediction.locks_at).getTime();
    const now = Date.now();
    const diff = Math.max(0, Math.round((end - now) / 1000));
    timeRemaining.value = diff;
  } else if (props.prediction.created_at && props.prediction.prediction_window) {
    const start = new Date(props.prediction.created_at).getTime();
    const windowSec = props.prediction.prediction_window;
    const end = start + (windowSec * 1000);
    const now = Date.now();
    timeRemaining.value = Math.max(0, Math.round((end - now) / 1000));
  } else {
    timeRemaining.value = 0;
  }
}

watch(() => props.prediction, () => {
  confirmCancel.value = false;
  initialDuration.value = props.prediction.prediction_window || 30;
  calculateRemaining();
}, { deep: true, immediate: true });

onMounted(() => {
  calculateRemaining();
  timerInterval = setInterval(() => {
    calculateRemaining();
  }, 1000);
});

onUnmounted(() => {
  if (timerInterval) clearInterval(timerInterval);
});

function onResolve(outcome) {
  emit('resolve', {
    predictionId: props.prediction.id,
    winningOutcomeId: outcome.id
  });
}

function onCancel() {
  confirmCancel.value = false;
  emit('cancel', props.prediction.id);
}
</script>

<style scoped>
.active-card {
  border: 2px solid rgba(145, 70, 255, 0.4);
  background: radial-gradient(circle at top right, rgba(145, 70, 255, 0.1), rgba(17, 23, 38, 0.95));
  box-shadow: 0 8px 32px rgba(145, 70, 255, 0.2);
  margin-bottom: 24px;
}

.active-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
  flex-wrap: wrap;
  gap: 10px;
}

.status-pill {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 14px;
  border-radius: 20px;
  font-size: 0.85rem;
}

.pill-active {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.4);
  color: #fca5a5;
}

.pill-locked {
  background: rgba(245, 158, 11, 0.15);
  border: 1px solid rgba(245, 158, 11, 0.4);
  color: #fde68a;
}

.dot-yellow {
  background: #f59e0b !important;
  box-shadow: 0 0 10px #f59e0b !important;
}

.timer-badge {
  display: flex;
  align-items: center;
  gap: 6px;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  padding: 6px 14px;
  border-radius: 20px;
}

.timer-val {
  font-family: 'Teko', sans-serif;
  font-size: 1.5rem;
  font-weight: 700;
  line-height: 1;
  color: #facc15;
}

.prediction-title {
  font-size: 1.4rem;
  font-weight: 800;
  color: #ffffff;
  margin-bottom: 16px;
}

.progress-bar-bg {
  width: 100%;
  height: 6px;
  background: var(--bg-primary);
  border-radius: 3px;
  overflow: hidden;
  margin-bottom: 20px;
}

.progress-bar-fill {
  height: 100%;
  background: linear-gradient(90deg, #9146ff, #3b82f6);
  transition: width 1s linear;
}

.progress-bar-fill.bar-warning {
  background: linear-gradient(90deg, #f59e0b, #ef4444);
}

.outcomes-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 14px;
  margin-bottom: 24px;
}

.outcome-card {
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 14px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.outcome-card.outcome-first {
  border-color: rgba(59, 130, 246, 0.4);
  background: linear-gradient(180deg, rgba(59, 130, 246, 0.08) 0%, rgba(10, 13, 20, 1) 100%);
}

.outcome-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 700;
}

.outcome-name {
  font-size: 1.1rem;
  color: #fff;
}

.outcome-points {
  color: #facc15;
  font-size: 0.95rem;
}

.outcome-users {
  font-size: 0.8rem;
  color: var(--text-dim);
}

.actions-section {
  display: flex;
  flex-direction: column;
  gap: 16px;
  border-top: 1px solid var(--border);
  padding-top: 20px;
}

.lock-wrapper {
  display: flex;
  justify-content: center;
}

.btn-lock {
  width: 100%;
  max-width: 400px;
  padding: 10px;
  font-size: 0.85rem;
}

.resolve-buttons-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 14px;
}

.btn-resolve {
  padding: 16px 20px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  gap: 14px;
  text-align: left;
  border: 2px solid transparent;
}

.btn-resolve-win {
  background: linear-gradient(135deg, #10b981, #059669);
  color: #fff;
  box-shadow: 0 4px 18px rgba(16, 185, 129, 0.35);
}

.btn-resolve-win:hover:not(:disabled) {
  box-shadow: 0 6px 25px rgba(16, 185, 129, 0.5);
  transform: translateY(-2px);
}

.btn-resolve-alt {
  background: linear-gradient(135deg, #ef4444, #dc2626);
  color: #fff;
  box-shadow: 0 4px 18px rgba(239, 68, 68, 0.35);
}

.btn-resolve-alt:hover:not(:disabled) {
  box-shadow: 0 6px 25px rgba(239, 68, 68, 0.5);
  transform: translateY(-2px);
}

.resolve-icon {
  font-size: 1.8rem;
}

.resolve-text {
  display: flex;
  flex-direction: column;
}

.resolve-label {
  font-size: 0.75rem;
  letter-spacing: 1px;
  opacity: 0.9;
}

.resolve-choice {
  font-size: 1.2rem;
  font-weight: 800;
}

.cancel-wrapper {
  display: flex;
  justify-content: center;
}

.btn-cancel {
  background: transparent;
  color: var(--text-dim);
  font-size: 0.85rem;
  padding: 8px 16px;
  border-radius: var(--radius-md);
}

.btn-cancel:hover {
  color: #fca5a5;
  background: rgba(239, 68, 68, 0.1);
}

.confirm-cancel-box {
  background: rgba(239, 68, 68, 0.15);
  border: 1px solid rgba(239, 68, 68, 0.4);
  border-radius: var(--radius-md);
  padding: 12px 18px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  flex-wrap: wrap;
  gap: 12px;
}

.confirm-buttons {
  display: flex;
  gap: 8px;
}
</style>
