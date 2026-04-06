<script setup lang="ts">
import { computed } from 'vue'
import { useMapStore } from '@/stores/mapStore'
import FilterSection from '@/components/FilterSection.vue'
import type { LmSection, LmType } from '@/types'

const props = defineProps<{
  sections: LmSection[]
  typeMap: Record<string, LmType>
  status: { loading: boolean; error: string | null }
}>()

const mapStore = useMapStore()

const allTypeIds = computed(() => props.sections.flatMap((s) => s.typeIds))
const allOn = computed(() => mapStore.allVisible(allTypeIds.value))

function toggleAll() {
  mapStore.toggleAll(allTypeIds.value, !allOn.value)
}
</script>

<template>
  <aside class="sidebar">
    <!-- Coordinates -->
    <div class="coords-panel">
      <div class="coords-row">
        <span class="coords-label">X (Leste)</span>
        <span class="coords-value">{{ mapStore.coords.x }}</span>
      </div>
      <div class="coords-sep" />
      <div class="coords-row">
        <span class="coords-label">Z (Norte)</span>
        <span class="coords-value">{{ mapStore.coords.z }}</span>
      </div>
      <p class="coords-hint">Mova o cursor sobre o mapa</p>
    </div>

    <!-- Filter header -->
    <div class="filter-header">
      <span class="filter-title">Filtros</span>
      <button
        v-if="sections.length > 0"
        class="toggle-all-btn"
        :class="{ on: allOn }"
        @click="toggleAll"
      >
        {{ allOn ? 'Ocultar tudo' : 'Mostrar tudo' }}
      </button>
    </div>

    <!-- Status / sections -->
    <div class="filter-scroll">
      <div v-if="status.loading" class="status-msg">
        <span class="spinner" />
        Carregando lootmap…
      </div>
      <div v-else-if="status.error" class="status-msg error">
        <pre>{{ status.error }}</pre>
      </div>
      <template v-else>
        <FilterSection
          v-for="sec in sections"
          :key="sec.id"
          :section="sec"
          :type-map="typeMap"
        />
      </template>
    </div>

    <!-- Calibration slot -->
    <slot name="calibration" />
  </aside>
</template>

<style scoped>
.sidebar {
  width: 256px;
  flex-shrink: 0;
  background: var(--surface);
  border-right: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

/* Coords */
.coords-panel {
  flex-shrink: 0;
  padding: 12px 14px;
  border-bottom: 1px solid var(--border);
  background: var(--bg);
}
.coords-row {
  display: flex;
  justify-content: space-between;
  align-items: baseline;
}
.coords-label {
  font-size: 0.7rem;
  color: var(--text-subtle);
}
.coords-value {
  font-family: 'JetBrains Mono', monospace;
  font-size: 1rem;
  font-weight: 500;
  color: var(--accent);
  letter-spacing: 0.02em;
}
.coords-sep {
  height: 1px;
  background: var(--border);
  margin: 8px 0;
}
.coords-hint {
  font-size: 0.65rem;
  color: var(--text-subtle);
  margin-top: 6px;
}

/* Filter header */
.filter-header {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-bottom: 1px solid var(--border);
}
.filter-title {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.08em;
}
.toggle-all-btn {
  font-size: 0.7rem;
  font-family: 'Inter', sans-serif;
  font-weight: 500;
  padding: 3px 9px;
  border-radius: var(--radius-sm);
  border: 1px solid var(--border-hi);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition: border-color 0.15s, color 0.15s, background 0.15s;
}
.toggle-all-btn:hover {
  border-color: var(--accent);
  color: var(--accent);
}
.toggle-all-btn.on {
  border-color: var(--accent);
  color: var(--accent);
  background: color-mix(in srgb, var(--accent) 8%, transparent);
}

/* Scroll area */
.filter-scroll {
  flex: 1;
  overflow-y: auto;
  overflow-x: hidden;
}
.filter-scroll::-webkit-scrollbar {
  width: 4px;
}
.filter-scroll::-webkit-scrollbar-thumb {
  background: var(--border-hi);
  border-radius: 4px;
}

/* Status messages */
.status-msg {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 14px 14px;
  font-size: 0.72rem;
  color: var(--text-muted);
  line-height: 1.5;
}
.status-msg.error {
  color: var(--danger);
  display: block;
}
.status-msg pre {
  white-space: pre-wrap;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.65rem;
}
.spinner {
  display: inline-block;
  width: 12px;
  height: 12px;
  border: 2px solid var(--border-hi);
  border-top-color: var(--accent);
  border-radius: 50%;
  animation: spin 0.7s linear infinite;
  flex-shrink: 0;
}
@keyframes spin {
  to { transform: rotate(360deg); }
}
</style>
