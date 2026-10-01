<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h3 class="modal-title">📜 Historique des Prédictions</h3>
        <button class="btn-close" @click="$emit('close')">&times;</button>
      </div>

      <div class="modal-body">
        <div v-if="loading" class="history-empty">
          Chargement de l'historique...
        </div>

        <div v-else-if="!history || history.length === 0" class="history-empty">
          Aucune prédiction enregistrée pour le moment.
        </div>

        <div v-else class="history-list">
          <div 
            v-for="item in history" 
            :key="item.id" 
            class="history-item"
            :class="item.status === 'CANCELED' ? 'item-canceled' : 'item-resolved'"
          >
            <div class="item-left">
              <span class="item-status-icon">
                {{ item.status === 'RESOLVED' ? '🏆' : item.status === 'CANCELED' ? '🔄' : '⏳' }}
              </span>
              <div class="item-details">
                <span class="item-title">{{ item.title }}</span>
                <span class="item-time">{{ formatDate(item.created_at) }}</span>
              </div>
            </div>

            <div class="item-right">
              <div v-if="item.status === 'RESOLVED'" class="item-winner">
                <span class="winner-tag">Gagnant : {{ item.winning_outcome_title || 'Validé' }}</span>
                <span v-if="item.total_points" class="points-tag">🪙 {{ item.total_points.toLocaleString() }} pts</span>
              </div>
              <div v-else-if="item.status === 'CANCELED'" class="item-canceled-tag">
                Remboursé
              </div>
              <div v-else class="item-active-tag">
                En cours
              </div>
            </div>
          </div>
        </div>

        <div class="modal-footer">
          <button type="button" class="btn-secondary" @click="$emit('close')">
            Fermer
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { api } from '../api.js';

defineEmits(['close']);

const history = ref([]);
const loading = ref(true);

onMounted(async () => {
  try {
    history.value = await api.getHistory(20);
  } catch (err) {
    console.error('Erreur chargement historique:', err);
  } finally {
    loading.value = false;
  }
});

function formatDate(dateStr) {
  if (!dateStr) return '';
  const d = new Date(dateStr);
  return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
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

.history-empty {
  text-align: center;
  color: var(--text-dim);
  padding: 30px 0;
  font-size: 0.95rem;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
  max-height: 400px;
  overflow-y: auto;
}

.history-item {
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: 12px 16px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
}

.history-item.item-canceled {
  border-left: 4px solid var(--accent-red);
}

.history-item.item-resolved {
  border-left: 4px solid var(--accent-green);
}

.item-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.item-status-icon {
  font-size: 1.4rem;
}

.item-details {
  display: flex;
  flex-direction: column;
}

.item-title {
  font-weight: 700;
  color: #fff;
  font-size: 0.95rem;
}

.item-time {
  font-size: 0.75rem;
  color: var(--text-dim);
}

.item-right {
  display: flex;
  align-items: flex-end;
}

.item-winner {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
}

.winner-tag {
  background: rgba(16, 185, 129, 0.15);
  color: #34d399;
  border: 1px solid rgba(16, 185, 129, 0.3);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 700;
}

.points-tag {
  color: #facc15;
  font-size: 0.75rem;
  font-weight: 600;
}

.item-canceled-tag {
  background: rgba(239, 68, 68, 0.15);
  color: #fca5a5;
  border: 1px solid rgba(239, 68, 68, 0.3);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 700;
}

.item-active-tag {
  background: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
  border: 1px solid rgba(245, 158, 11, 0.3);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 0.8rem;
  font-weight: 700;
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 20px;
  border-top: 1px solid var(--border);
  padding-top: 14px;
}
</style>
