<script setup lang="ts">
import { ref, computed } from 'vue'
import { useMapStore } from '@/stores/mapStore'
import type { LmSection, LmType } from '@/types'

const props = defineProps<{
  section: LmSection
  typeMap: Record<string, LmType>
}>()

const mapStore = useMapStore()
const open = ref(false)

const allOn = computed(() => mapStore.isSecAllOn(props.section.typeIds))

function toggleSection() {
  mapStore.setSecVis(props.section.typeIds, !allOn.value)
}
function toggleType(tid: string) {
  mapStore.setTypeVis(tid, !mapStore.typeVis[tid])
}
</script>

<template>
  <div class="filter-section">
    <!-- Section header -->
    <div class="sec-header" @click="open = !open">
      <div class="sec-left">
        <span class="sec-caret" :class="{ open }">›</span>
        <span class="sec-icon" :style="{ color: section.color }">{{ section.icon }}</span>
        <span class="sec-name">{{ section.label }}</span>
        <span class="sec-count">({{ section.total.toLocaleString('pt-BR') }})</span>
      </div>
      <!-- Section-level toggle stops click propagation so it doesn't collapse -->
      <button
        class="sec-toggle"
        :class="{ on: allOn }"
        :title="allOn ? 'Ocultar seção' : 'Mostrar seção'"
        @click.stop="toggleSection"
      >
        <span class="toggle-thumb" />
      </button>
    </div>

    <!-- Type list -->
    <div v-if="open" class="type-list">
      <div
        v-for="tid in section.typeIds"
        :key="tid"
        class="type-item"
        :class="{ on: mapStore.typeVis[tid] }"
        @click="toggleType(tid)"
      >
        <span class="type-dot" :style="{ background: section.color }" />
        <span class="type-name">{{ typeMap[tid]?.label }}</span>
        <span class="type-count">{{ typeMap[tid]?.count?.toLocaleString('pt-BR') }}</span>
        <span class="type-cbx" :class="{ on: mapStore.typeVis[tid] }">
          <svg v-if="mapStore.typeVis[tid]" viewBox="0 0 10 10" fill="none">
            <path d="M2 5l2.5 2.5L8 3" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
          </svg>
        </span>
      </div>
    </div>
  </div>
</template>

<style scoped>
.filter-section {
  border-bottom: 1px solid var(--border);
}

.sec-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 7px 12px;
  cursor: pointer;
  user-select: none;
  transition: background 0.1s;
}
.sec-header:hover {
  background: color-mix(in srgb, var(--text) 3%, transparent);
}

.sec-left {
  display: flex;
  align-items: center;
  gap: 7px;
  min-width: 0;
}
.sec-caret {
  font-size: 0.9rem;
  color: var(--text-subtle);
  transition: transform 0.18s;
  line-height: 1;
  width: 12px;
  flex-shrink: 0;
}
.sec-caret.open {
  transform: rotate(90deg);
}
.sec-icon {
  font-size: 0.8rem;
  flex-shrink: 0;
}
.sec-name {
  font-size: 0.78rem;
  font-weight: 500;
  color: var(--text);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.sec-count {
  font-size: 0.68rem;
  color: var(--text-subtle);
  flex-shrink: 0;
}

/* Small pill toggle */
.sec-toggle {
  flex-shrink: 0;
  width: 28px;
  height: 16px;
  border-radius: 100px;
  border: 1px solid var(--border-hi);
  background: var(--bg);
  cursor: pointer;
  padding: 0;
  display: flex;
  align-items: center;
  padding: 2px;
  transition: background 0.15s, border-color 0.15s;
}
.sec-toggle.on {
  background: var(--accent);
  border-color: var(--accent);
}
.toggle-thumb {
  display: block;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--text-subtle);
  transition: transform 0.15s, background 0.15s;
}
.sec-toggle.on .toggle-thumb {
  transform: translateX(12px);
  background: #fff;
}

/* Type items */
.type-list {
  padding: 2px 0 6px;
}
.type-item {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 5px 12px 5px 30px;
  cursor: pointer;
  transition: background 0.1s;
}
.type-item:hover {
  background: color-mix(in srgb, var(--text) 4%, transparent);
}
.type-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  opacity: 0.7;
}
.type-item.on .type-dot {
  opacity: 1;
}
.type-name {
  font-size: 0.75rem;
  color: var(--text-muted);
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  transition: color 0.1s;
}
.type-item.on .type-name {
  color: var(--text);
}
.type-count {
  font-size: 0.65rem;
  color: var(--text-subtle);
  flex-shrink: 0;
}
.type-cbx {
  flex-shrink: 0;
  width: 14px;
  height: 14px;
  border: 1px solid var(--border-hi);
  border-radius: 3px;
  background: var(--bg);
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.12s, border-color 0.12s;
  color: #fff;
}
.type-cbx svg {
  width: 10px;
  height: 10px;
}
.type-cbx.on {
  background: var(--accent);
  border-color: var(--accent);
}
</style>
