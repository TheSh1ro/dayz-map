<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { filterMapLocationsByQuery } from '@/data/mapLocations'
import type { MapLocation } from '@/types'

const props = defineProps<{
  locations: readonly MapLocation[]
}>()

const emit = defineEmits<{
  (e: 'select', location: MapLocation): void
}>()

const rootRef = ref<HTMLElement | null>(null)
const inputRef = ref<HTMLInputElement | null>(null)
const query = ref('')
const isOpen = ref(false)

const suggestions = computed(() => {
  const filtered = filterMapLocationsByQuery(query.value, props.locations)
  const needle = query.value.trim().toLocaleLowerCase()

  if (needle) {
    filtered.sort((a, b) => {
      const aStarts = a.name.toLocaleLowerCase().startsWith(needle)
      const bStarts = b.name.toLocaleLowerCase().startsWith(needle)
      if (aStarts !== bStarts) return aStarts ? -1 : 1
      return a.name.localeCompare(b.name, 'pt-BR')
    })
  }

  return filtered.slice(0, 12)
})

function openListIfAny() {
  const hasQuery = query.value.trim().length > 0
  isOpen.value = hasQuery && suggestions.value.length > 0
}

function selectLocation(location: MapLocation) {
  query.value = location.name
  isOpen.value = false
  emit('select', location)
  inputRef.value?.blur()
}

function onFocus() {
  openListIfAny()
}

function onInput() {
  openListIfAny()
}

function onBlur() {
  requestAnimationFrame(() => {
    if (!rootRef.value?.contains(document.activeElement)) {
      isOpen.value = false
    }
  })
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter') {
    event.preventDefault()
    const first = suggestions.value[0]
    if (first) selectLocation(first)
    return
  }

  if (event.key === 'Escape') {
    isOpen.value = false
    inputRef.value?.blur()
  }
}

function onPointerDownDocument(event: PointerEvent) {
  const target = event.target
  if (!(target instanceof Node)) return
  if (!rootRef.value?.contains(target)) isOpen.value = false
}

onMounted(() => {
  document.addEventListener('pointerdown', onPointerDownDocument)
})

onUnmounted(() => {
  document.removeEventListener('pointerdown', onPointerDownDocument)
})
</script>

<template>
  <div ref="rootRef" class="map-location-search">
    <input
      ref="inputRef"
      v-model="query"
      class="search-input"
      type="text"
      placeholder="Buscar localidade..."
      autocomplete="off"
      @focus="onFocus"
      @input="onInput"
      @blur="onBlur"
      @keydown="onKeydown"
    />

    <ul v-if="isOpen && suggestions.length > 0" class="search-results">
      <li v-for="location in suggestions" :key="`${location.name}-${location.lat}-${location.lng}`">
        <button class="search-result-btn" type="button" @click="selectLocation(location)">
          <span class="result-name">{{ location.name }}</span>
          <span class="result-meta">{{ location.type }} · min z{{ location.minZoom }}</span>
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.map-location-search {
  position: absolute;
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  width: min(420px, calc(100% - 96px));
  z-index: 1100;
}

.search-input {
  width: 100%;
  height: 38px;
  border-radius: var(--radius);
  border: 1px solid var(--border-hi);
  background: rgba(13, 17, 23, 0.92);
  color: var(--text);
  padding: 0 12px;
  font-size: 0.82rem;
  font-family: 'Inter', sans-serif;
  box-shadow: 0 8px 26px rgba(0, 0, 0, 0.45);
}

.search-input::placeholder {
  color: var(--text-subtle);
}

.search-input:focus {
  outline: none;
  border-color: var(--accent);
}

.search-results {
  margin-top: 6px;
  list-style: none;
  border: 1px solid var(--border);
  border-radius: var(--radius);
  overflow: hidden;
  background: rgba(13, 17, 23, 0.96);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.5);
  max-height: 270px;
  overflow-y: auto;
}

.search-result-btn {
  width: 100%;
  border: 0;
  background: transparent;
  color: var(--text);
  text-align: left;
  padding: 8px 10px;
  display: flex;
  justify-content: space-between;
  align-items: baseline;
  gap: 12px;
  cursor: pointer;
}

.search-result-btn:hover {
  background: color-mix(in srgb, var(--accent) 14%, transparent);
}

.result-name {
  font-size: 0.8rem;
  color: var(--text-hi);
}

.result-meta {
  font-size: 0.66rem;
  color: var(--text-subtle);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  white-space: nowrap;
}

@media (max-width: 900px) {
  .map-location-search {
    width: min(420px, calc(100% - 84px));
  }
}
</style>
