<template>
  <header class="header">
    <div class="header-left">
      <div class="logo">
        <span class="flag-icon">🏁</span>
        <div class="logo-text">
          <span class="racing-font title">MK8DX PREDICTIONS</span>
          <span class="subtitle">Stream Assistant · Lordi</span>
        </div>
      </div>
    </div>

    <div class="header-center">
      <!-- Badge de statut Twitch -->
      <div 
        class="badge" 
        :class="{
          'badge-success': status.isConfigured, 
          'badge-warning': !status.isConfigured
        }"
        :title="status.isConfigured ? 'Connecté à Twitch API' : 'Mode simulation / Non configuré'"
      >
        <span class="status-indicator"></span>
        <span v-if="status.isConfigured">
          Bot: <strong>@{{ status.botUserName || 'Inconnu' }}</strong> ➜ <strong>{{ status.broadcasterName || 'Stream' }}</strong>
        </span>
        <span v-else>Mode Simulation (Hors-ligne)</span>
      </div>

      <!-- Badge mémoire Lordi -->
      <div v-if="health?.memory" class="badge badge-neutral" title="Empreinte mémoire sur Lordi">
        <span>RAM: {{ health.memory.rssMb }} Mo</span>
      </div>
    </div>

    <div class="header-right">
      <button class="btn-icon" @click="$emit('open-history')" title="Historique des prédictions">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
        <span class="btn-label">Historique</span>
      </button>

      <button class="btn-icon" @click="$emit('open-settings')" title="Paramètres & Connexion Twitch">
        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
        <span class="btn-label">Configuration</span>
      </button>
    </div>
  </header>
</template>

<script setup>
defineProps({
  status: {
    type: Object,
    default: () => ({ isConfigured: false, botUserName: '', broadcasterName: '' })
  },
  health: {
    type: Object,
    default: null
  }
});

defineEmits(['open-settings', 'open-history']);
</script>

<style scoped>
.header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 12px 18px;
  background: var(--bg-card);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  margin-bottom: 20px;
  box-shadow: 0 4px 18px rgba(0, 0, 0, 0.25);
  flex-wrap: wrap;
}

.header-left {
  display: flex;
  align-items: center;
}

.logo {
  display: flex;
  align-items: center;
  gap: 12px;
}

.flag-icon {
  font-size: 1.8rem;
  line-height: 1;
  filter: drop-shadow(0 2px 8px rgba(250, 204, 21, 0.4));
}

.logo-text {
  display: flex;
  flex-direction: column;
}

.logo-text .title {
  font-size: 1.6rem;
  line-height: 1.1;
  letter-spacing: 1px;
  color: #fff;
  font-weight: 700;
  background: linear-gradient(90deg, #ffffff, #facc15);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.logo-text .subtitle {
  font-size: 0.75rem;
  color: var(--text-dim);
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.8px;
}

.header-center {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.badge {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 6px 12px;
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  background: var(--bg-primary);
  border: 1px solid var(--border);
}

.badge strong {
  color: #fff;
}

.badge-success {
  border-color: rgba(16, 185, 129, 0.3);
  background: rgba(16, 185, 129, 0.08);
  color: #34d399;
}

.badge-success .status-indicator {
  background: #10b981;
  box-shadow: 0 0 8px #10b981;
}

.badge-warning {
  border-color: rgba(245, 158, 11, 0.3);
  background: rgba(245, 158, 11, 0.08);
  color: #fbbf24;
}

.badge-warning .status-indicator {
  background: #f59e0b;
  box-shadow: 0 0 8px #f59e0b;
}

.badge-neutral {
  color: var(--text-dim);
}

.status-indicator {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  display: inline-block;
}

.header-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

.btn-icon {
  background: var(--bg-card-elevated);
  border: 1px solid var(--border);
  color: var(--text-main);
  padding: 8px 14px;
  border-radius: var(--radius-md);
  font-size: 0.85rem;
}

.btn-icon:hover {
  background: var(--bg-card-hover);
  border-color: var(--accent-blue);
  color: #fff;
}

@media (max-width: 640px) {
  .btn-label {
    display: none;
  }
  .btn-icon {
    padding: 8px;
  }
}
</style>
