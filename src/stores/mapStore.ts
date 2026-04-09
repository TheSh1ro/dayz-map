import { defineStore } from 'pinia'
import { computed, ref, watch } from 'vue'
import type { TileType } from '@/types'

const FILTER_STORAGE_KEY = 'dayzmap:filters_v1'
const MAP_VIEW_MODE_STORAGE_KEY = 'dayzmap:view-mode_v1'

export type MapViewMode = 'edit' | 'clan-bases'

export const useMapStore = defineStore('map', () => {
  // ─── Map UI ──────────────────────────────────────────────────────────────────
  const currentTile = ref<TileType>('satellite')
  const coords = ref({ x: '—', z: '—' })
  const zoom = ref(0)
  const poiCount = ref(0)
  const viewMode = ref<MapViewMode>('clan-bases')
  const isEditMode = computed(() => viewMode.value === 'edit')

  // ─── Filter Visibility ────────────────────────────────────────────────────────
  // typeId → visible. Persisted to localStorage automatically.
  const typeVis = ref<Record<string, boolean>>({})

  function _loadPersisted(): Record<string, boolean> | null {
    try {
      const raw = localStorage.getItem(FILTER_STORAGE_KEY)
      return raw ? (JSON.parse(raw) as Record<string, boolean>) : null
    } catch {
      return null
    }
  }

  // Persist on every change
  watch(typeVis, (v) => localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify(v)), {
    deep: true,
  })

  function _loadViewMode() {
    try {
      const raw = localStorage.getItem(MAP_VIEW_MODE_STORAGE_KEY)
      return raw === 'edit' || raw === 'clan-bases' ? raw : 'clan-bases'
    } catch {
      return 'clan-bases'
    }
  }

  viewMode.value = _loadViewMode()
  watch(viewMode, (mode) => {
    localStorage.setItem(MAP_VIEW_MODE_STORAGE_KEY, mode)
  })

  /**
   * Called once after lootmap is parsed.
   * Restores persisted state where available; falls back to making only
   * `defaultOnTypeIds` visible.
   */
  function initFilters(allTypeIds: string[], defaultOnTypeIds: string[]) {
    const persisted = _loadPersisted()
    const next: Record<string, boolean> = {}
    for (const tid of allTypeIds) {
      next[tid] =
        persisted && tid in persisted ? (persisted[tid] ?? false) : defaultOnTypeIds.includes(tid)
    }
    typeVis.value = next
  }

  function setTypeVis(tid: string, on: boolean) {
    typeVis.value[tid] = on
  }

  function setSecVis(typeIds: string[], on: boolean) {
    for (const tid of typeIds) typeVis.value[tid] = on
  }

  function isSecAllOn(typeIds: string[]): boolean {
    return typeIds.length > 0 && typeIds.every((tid) => typeVis.value[tid])
  }

  function toggleAll(allTypeIds: string[], on: boolean) {
    for (const tid of allTypeIds) typeVis.value[tid] = on
  }

  function allVisible(allTypeIds: string[]): boolean {
    return allTypeIds.length > 0 && allTypeIds.every((tid) => typeVis.value[tid])
  }

  function setViewMode(mode: MapViewMode) {
    viewMode.value = mode
  }

  return {
    currentTile,
    coords,
    zoom,
    poiCount,
    viewMode,
    isEditMode,
    typeVis,
    initFilters,
    setTypeVis,
    setSecVis,
    isSecAllOn,
    toggleAll,
    allVisible,
    setViewMode,
  }
})
