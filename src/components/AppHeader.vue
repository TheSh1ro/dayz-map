<script setup lang="ts">
import { useMapStore } from '@/stores/mapStore'

const mapStore = useMapStore()

function setTile(name: 'topographic' | 'satellite') {
  mapStore.currentTile = name
}
</script>

<template>
  <header class="app-header">
    <div class="header-left">
      <span class="logo">DayZ<span class="logo-accent">Map</span></span>
      <div class="divider" />
      <span class="map-label">Chernarus+</span>
      <span class="badge">
        <span class="badge-dot" />
        Online
      </span>
    </div>

    <div class="tile-toggle">
      <button
        class="tile-btn"
        :class="{ active: mapStore.currentTile === 'topographic' }"
        @click="setTile('topographic')"
      >
        Topográfico
      </button>
      <button
        class="tile-btn"
        :class="{ active: mapStore.currentTile === 'satellite' }"
        @click="setTile('satellite')"
      >
        Satélite
      </button>
    </div>

    <div class="header-stats">
      <span class="stat">
        <span class="stat-label">Zoom</span>
        <span class="stat-value">{{ mapStore.zoom }}</span>
      </span>
      <span class="stat">
        <span class="stat-label">Marcadores</span>
        <span class="stat-value">{{ mapStore.poiCount.toLocaleString('pt-BR') }}</span>
      </span>
    </div>
  </header>
</template>

<style scoped>
.app-header {
  height: 48px;
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  display: flex;
  align-items: center;
  padding: 0 16px;
  gap: 16px;
  flex-shrink: 0;
  z-index: 999;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.logo {
  font-family: 'Inter', sans-serif;
  font-size: 1rem;
  font-weight: 600;
  color: var(--text-hi);
  letter-spacing: -0.01em;
}
.logo-accent {
  color: var(--accent);
}

.divider {
  width: 1px;
  height: 16px;
  background: var(--border);
}

.map-label {
  font-size: 0.75rem;
  color: var(--text-muted);
  font-weight: 500;
}

.badge {
  display: flex;
  align-items: center;
  gap: 5px;
  background: color-mix(in srgb, var(--success) 10%, transparent);
  border: 1px solid color-mix(in srgb, var(--success) 25%, transparent);
  padding: 2px 8px;
  border-radius: 100px;
  font-size: 0.7rem;
  color: var(--success);
  font-weight: 500;
}
.badge-dot {
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--success);
  animation: pulse 2s ease-in-out infinite;
}
@keyframes pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.2; }
}

.tile-toggle {
  display: flex;
  gap: 2px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 2px;
}
.tile-btn {
  padding: 4px 12px;
  font-size: 0.75rem;
  font-weight: 500;
  font-family: 'Inter', sans-serif;
  border: none;
  border-radius: calc(var(--radius) - 2px);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: background 0.15s, color 0.15s;
}
.tile-btn:hover {
  color: var(--text);
}
.tile-btn.active {
  background: var(--surface-hi);
  color: var(--text-hi);
}

.header-stats {
  margin-left: auto;
  display: flex;
  align-items: center;
  gap: 20px;
}
.stat {
  display: flex;
  align-items: baseline;
  gap: 6px;
}
.stat-label {
  font-size: 0.7rem;
  color: var(--text-subtle);
  font-weight: 400;
}
.stat-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.8rem;
  color: var(--text);
  font-weight: 500;
}
</style>
