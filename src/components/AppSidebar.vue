<script setup lang="ts">
import { computed } from 'vue'
import { useClanBaseStore } from '@/stores/clanBaseStore'
import { useMapStore } from '@/stores/mapStore'
import FilterSection from '@/components/FilterSection.vue'
import type { LmSection, LmType } from '@/types'

const props = defineProps<{
  sections: LmSection[]
  typeMap: Record<string, LmType>
  status: { loading: boolean; error: string | null }
}>()

const mapStore = useMapStore()
const clanBaseStore = useClanBaseStore()

const allTypeIds = computed(() => props.sections.flatMap((s) => s.typeIds))
const allOn = computed(() => mapStore.isEditMode && mapStore.allVisible(allTypeIds.value))
const isEditMode = computed(() => mapStore.viewMode === 'edit')
const clanFilters = computed(() => clanBaseStore.baseFilters)
const clanFiltersAllOn = computed(() => clanBaseStore.allFiltersActive)

function toggleAll() {
  const next = !allOn.value
  mapStore.toggleAll(allTypeIds.value, next)
}

function toggleAllClanFilters() {
  clanBaseStore.setAllFilters(!clanFiltersAllOn.value)
}

function activateEditMode() {
  mapStore.setViewMode('edit')
  mapStore.toggleAll(allTypeIds.value, true)
}

function activateClanBasesMode() {
  mapStore.setViewMode('clan-bases')
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
    <div class="filter-header mode-header">
      <span class="filter-title">Visualização</span>
    </div>

    <div class="mode-switch">
      <button
        type="button"
        class="mode-btn"
        :class="{ on: isEditMode }"
        :aria-pressed="isEditMode"
        @click="activateEditMode"
      >
        <span class="mode-btn-title">Modo edição</span>
        <span class="mode-btn-copy">Mostra markers livres e libera os filtros.</span>
      </button>
      <button
        type="button"
        class="mode-btn"
        :class="{ on: !isEditMode }"
        :aria-pressed="!isEditMode"
        @click="activateClanBasesMode"
      >
        <span class="mode-btn-title">Bases do clã</span>
        <span class="mode-btn-copy">Mostra apenas as bases já cadastradas.</span>
      </button>
    </div>

    <!-- Status / sections -->
    <div class="filter-scroll">
      <template v-if="!isEditMode">
        <div class="filter-header filter-subheader clan-filter-header">
          <span class="filter-title">Filtros de bases</span>
          <button
            v-if="clanFilters.length > 0"
            class="toggle-all-btn"
            :class="{ on: clanFiltersAllOn }"
            @click="toggleAllClanFilters"
          >
            {{ clanFiltersAllOn ? 'Ocultar tudo' : 'Mostrar tudo' }}
          </button>
        </div>

        <div class="clan-filter-list">
          <button
            v-for="filter in clanFilters"
            :key="filter.id"
            type="button"
            class="clan-filter-item"
            :class="{ on: clanBaseStore.activeFilterIds.includes(filter.id) }"
            :style="{ '--filter-color': filter.color }"
            @click="clanBaseStore.toggleFilter(filter.id)"
          >
            <span class="clan-filter-swatch" />
            <span class="clan-filter-label">{{ filter.label }}</span>
            <span class="clan-filter-count">{{ filter.count }}</span>
            <span class="clan-filter-toggle" :class="{ on: clanBaseStore.activeFilterIds.includes(filter.id) }">
              <span class="clan-filter-toggle-thumb" />
            </span>
          </button>
        </div>
      </template>

      <div v-if="status.loading" class="status-msg">
        <span class="spinner" />
        Carregando lootmap…
      </div>
      <div v-else-if="status.error" class="status-msg error">
        <pre>{{ status.error }}</pre>
      </div>
      <template v-else-if="isEditMode">
        <div class="filter-header filter-subheader">
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
        <FilterSection v-for="sec in sections" :key="sec.id" :section="sec" :type-map="typeMap" />
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
.mode-header {
  border-bottom: 0;
  padding-bottom: 6px;
}
.filter-subheader {
  padding-top: 12px;
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
  transition:
    border-color 0.15s,
    color 0.15s,
    background 0.15s;
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

.mode-switch {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding: 0 12px 12px;
  border-bottom: 1px solid var(--border);
}

.mode-btn {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 78px;
  padding: 10px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: color-mix(in srgb, var(--bg) 32%, transparent);
  text-align: left;
  color: var(--text);
  cursor: pointer;
  transition:
    border-color 0.12s ease,
    background 0.12s ease,
    transform 0.12s ease;
}
.mode-btn:hover {
  border-color: var(--border-hi);
}
.mode-btn.on {
  border-color: color-mix(in srgb, var(--accent) 55%, var(--border));
  background: color-mix(in srgb, var(--accent) 14%, transparent);
}
.mode-btn-title {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--text-hi);
}
.mode-btn-copy {
  font-size: 0.71rem;
  line-height: 1.45;
  color: var(--text-muted);
}
.clan-filter-header {
  border-bottom: 1px solid var(--border);
}
.clan-filter-header .filter-title {
  color: var(--text-muted);
}
.clan-filter-list {
  padding: 2px 0 6px;
  border-bottom: 1px solid var(--border);
}
.clan-filter-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 4px 12px 4px 30px;
  border: 0;
  background: transparent;
  appearance: none;
  -webkit-appearance: none;
  font: inherit;
  line-height: normal;
  text-align: left;
  cursor: pointer;
  transition: background 0.1s;
}
.clan-filter-item:hover {
  background: color-mix(in srgb, var(--text) 4%, transparent);
}
.clan-filter-item:focus-visible {
  outline: none;
  background: color-mix(in srgb, var(--text) 5%, transparent);
}
.clan-filter-item:focus-visible .clan-filter-toggle {
  border-color: var(--accent);
}
.clan-filter-item.on .clan-filter-label {
  color: var(--text);
}
.clan-filter-item:not(.on) .clan-filter-label {
  color: var(--text-muted);
}
.clan-filter-swatch {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  background: var(--filter-color);
  opacity: 0.7;
}
.clan-filter-item.on .clan-filter-swatch {
  opacity: 1;
}
.clan-filter-label {
  flex: 1;
  font-size: 0.75rem;
  color: var(--text-muted);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.1s;
}
.clan-filter-count {
  flex-shrink: 0;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.65rem;
  color: var(--text-subtle);
}
.clan-filter-toggle {
  flex-shrink: 0;
  width: 28px;
  height: 16px;
  border-radius: 100px;
  border: 1px solid var(--border);
  background: var(--bg);
  display: flex;
  align-items: center;
  padding: 2px;
  transition: background 0.12s, border-color 0.12s;
}
.clan-filter-toggle-thumb {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--text-subtle);
  transition: transform 0.12s, background 0.12s;
}
.clan-filter-toggle.on {
  background: var(--accent);
  border-color: var(--accent);
}
.clan-filter-toggle.on .clan-filter-toggle-thumb {
  transform: translateX(12px);
  background: #fff;
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
  to {
    transform: rotate(360deg);
  }
}
</style>
