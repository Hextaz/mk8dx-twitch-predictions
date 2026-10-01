<template>
  <div class="creator-card card">
    <div class="creator-header">
      <div class="creator-title-badge">
        <span class="racing-font title">NOUVELLE COURSE MK8DX</span>
      </div>
      <div class="mode-toggles">
        <button 
          type="button"
          class="btn-toggle" 
          :class="{ active: format === 'binary' }"
          @click="format = 'binary'"
        >
          Format Oui / Non
        </button>
        <button 
          type="button"
          class="btn-toggle" 
          :class="{ active: format === 'multi' }"
          @click="format = 'multi'"
        >
          Format Multi-Top
        </button>
      </div>
    </div>

    <div class="creator-grid">
      <!-- COLONNE GAUCHE : SÉLECTION DU JOUEUR -->
      <div class="grid-col col-left">
        <label class="col-label">
          <span class="label-icon">👤</span>
          <span>PILOTE SÉLECTIONNÉ</span>
        </label>

        <!-- Liste des pseudos rapides -->
        <div class="players-chips">
          <button
            v-for="p in players"
            :key="p.id"
            type="button"
            class="chip-player"
            :class="{ active: selectedPlayer === p.name }"
            @click="selectedPlayer = p.name"
          >
            <span class="chip-name">{{ p.name }}</span>
            <span v-if="p.is_default" class="chip-star" title="Pilote par défaut">⭐</span>
            <button 
              type="button"
              class="chip-remove" 
              title="Supprimer ce pseudo" 
              @click.stop="$emit('remove-player', p.name)"
            >
              &times;
            </button>
          </button>
        </div>

        <!-- Ajout rapide d'un joueur -->
        <form class="add-player-form" @submit.prevent="onAddPlayer">
          <input 
            v-model="newPlayerName" 
            type="text" 
            placeholder="Nouveau pseudo..." 
            maxlength="20"
          />
          <button type="submit" class="btn-secondary btn-add" :disabled="!newPlayerName.trim()">
            + Ajouter
          </button>
        </form>
      </div>

      <!-- COLONNE DROITE : OBJECTIF & TEMPS -->
      <div class="grid-col col-right">
        <label class="col-label">
          <span class="label-icon">🎯</span>
          <span>OBJECTIF DU PILOTE</span>
        </label>

        <!-- Boutons d'objectifs rapides si format binaire -->
        <div v-if="format === 'binary'" class="targets-grid">
          <button
            v-for="target in targets"
            :key="target.id"
            type="button"
            class="btn-target"
            :class="{ active: selectedTarget === target.id }"
            @click="selectedTarget = target.id"
          >
            <span class="target-badge">{{ target.icon }}</span>
            <span class="target-text">{{ target.label }}</span>
          </button>
        </div>

        <!-- Si format multi-top, explication des 4 issues -->
        <div v-else class="multi-explanation">
          <div class="multi-chip">🥇 Top 1</div>
          <div class="multi-chip">🥈 Top 2 - 3</div>
          <div class="multi-chip">🎖️ Top 4 - 6</div>
          <div class="multi-chip">💀 Flop 7 - 12</div>
        </div>

        <!-- Sélecteur de temps -->
        <div class="time-section">
          <label class="col-label">
            <span class="label-icon">⏱️</span>
            <span>DURÉE DES PARIS</span>
          </label>
          <div class="times-grid">
            <button
              v-for="t in durations"
              :key="t"
              type="button"
              class="btn-time"
              :class="{ active: selectedDuration === t }"
              @click="selectedDuration = t"
            >
              {{ t }}s
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- PREVIEW ET BOUTON DE LANCEMENT -->
    <div class="launch-footer">
      <div class="preview-box">
        <span class="preview-label">Aperçu Twitch :</span>
        <strong class="preview-text">« {{ generatedTitle }} »</strong>
        <span class="preview-outcomes">
          Choix : 
          <span v-for="(o, i) in generatedOutcomes" :key="i" class="outcome-tag">
            {{ o.title }}
          </span>
        </span>
      </div>

      <button 
        type="button"
        class="btn-launch" 
        :disabled="loading || !selectedPlayer"
        @click="onLaunch"
      >
        <span class="launch-icon">🚀</span>
        <span class="racing-font launch-text">
          LANCER LA PRÉDICTION ({{ selectedDuration }}s)
        </span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, watch } from 'vue';

const props = defineProps({
  players: {
    type: Array,
    default: () => []
  },
  defaultDuration: {
    type: Number,
    default: 30
  },
  loading: {
    type: Boolean,
    default: false
  }
});

const emit = defineEmits(['create', 'add-player', 'remove-player']);

const format = ref('binary'); // 'binary' ou 'multi'
const selectedPlayer = ref('');
const selectedTarget = ref('top3');
const selectedDuration = ref(props.defaultDuration || 30);
const newPlayerName = ref('');

const targets = [
  { id: 'top1', label: 'Top 1 (Victoire)', icon: '🏆', questionSuffix: 'Top 1' },
  { id: 'top3', label: 'Top 3 (Podium)', icon: '🥉', questionSuffix: 'Top 3' },
  { id: 'top6', label: 'Top 6 (1ère moitié)', icon: '🎖️', questionSuffix: 'Top 6' },
  { id: 'flop', label: 'Flop 7-12', icon: '💀', questionSuffix: 'un Flop (7-12)' }
];

const durations = [30, 45, 60, 90, 120];

// Initialise le joueur par défaut dès que la liste arrive
watch(() => props.players, (newPlayers) => {
  if (newPlayers && newPlayers.length > 0 && !selectedPlayer.value) {
    const def = newPlayers.find(p => p.is_default) || newPlayers[0];
    selectedPlayer.value = def.name;
  }
}, { immediate: true });

// Calcul dynamique du titre de la prédiction (max 45 caractères pour Twitch !)
const generatedTitle = computed(() => {
  const player = selectedPlayer.value || 'Nolhan';
  if (format.value === 'binary') {
    const curTarget = targets.find(t => t.id === selectedTarget.value) || targets[1];
    let title = `${player} fera-t-il ${curTarget.questionSuffix} ?`;
    if (title.length > 45) {
      title = `${player} : ${curTarget.questionSuffix} ?`;
    }
    return title.slice(0, 45);
  } else {
    let title = `Classement de ${player} ?`;
    return title.slice(0, 45);
  }
});

// Calcul des choix (outcomes)
const generatedOutcomes = computed(() => {
  if (format.value === 'binary') {
    return [
      { title: 'Oui' },
      { title: 'Non' }
    ];
  } else {
    return [
      { title: 'Top 1' },
      { title: 'Top 2 - 3' },
      { title: 'Top 4 - 6' },
      { title: 'Top 7 - 12' }
    ];
  }
});

function onAddPlayer() {
  if (!newPlayerName.value.trim()) return;
  emit('add-player', newPlayerName.value.trim());
  selectedPlayer.value = newPlayerName.value.trim();
  newPlayerName.value = '';
}

function onLaunch() {
  emit('create', {
    title: generatedTitle.value,
    outcomes: generatedOutcomes.value,
    predictionWindow: selectedDuration.value
  });
}
</script>

<style scoped>
.creator-card {
  margin-bottom: 24px;
  background: var(--bg-card);
}

.creator-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  flex-wrap: wrap;
  gap: 12px;
  border-bottom: 1px solid var(--border);
  padding-bottom: 16px;
}

.creator-title-badge .title {
  font-size: 1.5rem;
  letter-spacing: 1px;
  color: #fff;
}

.mode-toggles {
  display: flex;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 3px;
  gap: 4px;
}

.btn-toggle {
  background: transparent;
  color: var(--text-dim);
  padding: 6px 14px;
  border-radius: var(--radius-sm);
  font-size: 0.8rem;
  font-weight: 600;
}

.btn-toggle.active {
  background: var(--accent-purple);
  color: #fff;
  box-shadow: 0 2px 8px rgba(145, 70, 255, 0.4);
}

.creator-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 24px;
  margin-bottom: 24px;
}

@media (min-width: 768px) {
  .creator-grid {
    grid-template-columns: 1fr 1fr;
  }
}

.grid-col {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.col-label {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

.label-icon {
  font-size: 1rem;
}

/* Chips Joueurs */
.players-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  max-height: 180px;
  overflow-y: auto;
  padding: 2px;
}

.chip-player {
  background: var(--bg-primary);
  border: 1px solid var(--border);
  color: var(--text-main);
  padding: 8px 14px;
  border-radius: 20px;
  font-size: 0.95rem;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.chip-player:hover {
  border-color: var(--text-dim);
  background: var(--bg-card-hover);
}

.chip-player.active {
  background: rgba(59, 130, 246, 0.2);
  border-color: var(--accent-blue);
  color: #60a5fa;
  box-shadow: 0 0 12px rgba(59, 130, 246, 0.3);
}

.chip-star {
  font-size: 0.8rem;
}

.chip-remove {
  background: transparent;
  color: var(--text-dim);
  font-size: 1.1rem;
  padding: 0 2px;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  opacity: 0.6;
}

.chip-remove:hover {
  color: #ef4444;
  opacity: 1;
}

.add-player-form {
  display: flex;
  gap: 8px;
  margin-top: 6px;
}

.btn-add {
  white-space: nowrap;
}

/* Grille d'objectifs */
.targets-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
}

.btn-target {
  background: var(--bg-primary);
  border: 1px solid var(--border);
  color: var(--text-main);
  padding: 12px 14px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  gap: 10px;
  text-align: left;
}

.btn-target:hover {
  background: var(--bg-card-hover);
  border-color: var(--text-dim);
}

.btn-target.active {
  background: rgba(245, 158, 11, 0.15);
  border-color: var(--accent-yellow);
  color: #fde68a;
  box-shadow: 0 0 12px rgba(245, 158, 11, 0.25);
}

.target-badge {
  font-size: 1.3rem;
}

.target-text {
  font-size: 0.95rem;
  font-weight: 700;
}

.multi-explanation {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

.multi-chip {
  background: var(--bg-primary);
  border: 1px solid var(--border);
  padding: 10px;
  border-radius: var(--radius-md);
  font-size: 0.9rem;
  font-weight: 700;
  text-align: center;
  color: #94a3b8;
}

/* Section Temps */
.time-section {
  margin-top: 14px;
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.times-grid {
  display: flex;
  gap: 8px;
}

.btn-time {
  flex: 1;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  color: var(--text-main);
  padding: 8px;
  border-radius: var(--radius-md);
  font-size: 0.9rem;
}

.btn-time:hover {
  background: var(--bg-card-hover);
}

.btn-time.active {
  background: rgba(145, 70, 255, 0.2);
  border-color: var(--accent-purple);
  color: #c084fc;
  box-shadow: 0 0 10px rgba(145, 70, 255, 0.3);
}

/* Footer & Launch */
.launch-footer {
  border-top: 1px solid var(--border);
  padding-top: 20px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.preview-box {
  background: var(--bg-primary);
  border: 1px dashed var(--border);
  border-radius: var(--radius-md);
  padding: 12px 16px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.preview-label {
  font-size: 0.75rem;
  color: var(--text-dim);
  text-transform: uppercase;
}

.preview-text {
  font-size: 1.15rem;
  color: #ffffff;
}

.preview-outcomes {
  font-size: 0.8rem;
  color: var(--text-muted);
  display: flex;
  align-items: center;
  gap: 6px;
  margin-top: 4px;
}

.outcome-tag {
  background: var(--bg-card-elevated);
  border: 1px solid var(--border);
  padding: 2px 8px;
  border-radius: 4px;
  color: #e2e8f0;
}

.btn-launch {
  background: linear-gradient(135deg, #f59e0b, #d97706);
  color: #000;
  padding: 18px 24px;
  border-radius: var(--radius-lg);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12px;
  box-shadow: 0 6px 24px rgba(245, 158, 11, 0.4);
  border: 2px solid rgba(255, 255, 255, 0.3);
}

.btn-launch:hover:not(:disabled) {
  filter: brightness(1.1);
  transform: translateY(-2px);
  box-shadow: 0 8px 30px rgba(245, 158, 11, 0.6);
}

.btn-launch:active:not(:disabled) {
  transform: scale(0.98);
}

.launch-icon {
  font-size: 1.6rem;
}

.launch-text {
  font-size: 1.6rem;
  font-weight: 700;
  line-height: 1;
  letter-spacing: 1px;
}
</style>
