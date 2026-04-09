<script setup lang="ts">
import { ref, watch, onMounted, onUnmounted, nextTick } from 'vue'
import { storeToRefs } from 'pinia'
import { useLeafletMap } from '@/composables/useLeafletMap'
import { useLootmap } from '@/composables/useLootmap'
import { useClanBasesLayer } from '@/composables/useClanBasesLayer'
import { SHOW_CALIBRATION } from '@/config'
import { useClanBaseStore } from '@/stores/clanBaseStore'
import { useMapStore } from '@/stores/mapStore'
import AppHeader from '@/components/AppHeader.vue'
import AppSidebar from '@/components/AppSidebar.vue'
import CalibrationPanel from '@/components/CalibrationPanel.vue'
import MapLocationSearch from '@/components/MapLocationSearch.vue'
import ClanBaseDrawer from '@/components/ClanBaseDrawer.vue'
import type { MapLocation } from '@/types'

// ─── Map container ref ────────────────────────────────────────────────────────
const mapEl = ref<HTMLElement | null>(null)
let disposePostZoomRefresh: (() => void) | null = null

// ─── Map composable ───────────────────────────────────────────────────────────
const { mapInstance, mapLocations, goToLocation, repositionLocationLabels, registerPostZoomRefresh } =
  useLeafletMap(mapEl)

// ─── Lootmap composable ───────────────────────────────────────────────────────
const { sections, typeMap, status, load, repositionAllMarkers, refreshLootMarkers } =
  useLootmap(mapInstance)

// ─── Clan bases store + layer ─────────────────────────────────────────────────
const clanBaseStore = useClanBaseStore()
const mapStore = useMapStore()
const { members, currentMemberId, filteredBases, selectedBaseId, createDraft, isDrawerOpen } =
  storeToRefs(clanBaseStore)
const { isEditMode } = storeToRefs(mapStore)

const { refreshBaseMarkers } = useClanBasesLayer({
  mapRef: mapInstance,
  basesRef: filteredBases,
  membersRef: members,
  currentMemberIdRef: currentMemberId,
  selectedBaseIdRef: selectedBaseId,
  editableRef: isEditMode,
  createDraftRef: createDraft,
  onSelectBase: (baseId) => clanBaseStore.selectBase(baseId),
  onMapCreateClick: (x, z) => clanBaseStore.startCreateFromMapClick(x, z),
})

// Load as soon as the map is ready
watch(
  mapInstance,
  (map) => {
    if (map) load()
  },
  { once: true },
)

watch(isDrawerOpen, () => {
  scheduleViewportRefresh()
})

function handleSelectLocation(location: MapLocation) {
  goToLocation(location, 5)
}

function handleReposition() {
  repositionAllMarkers()
  refreshBaseMarkers()
  repositionLocationLabels()
}

function scheduleViewportRefresh() {
  nextTick(() => {
    requestAnimationFrame(() => {
      mapInstance.value?.invalidateSize({ pan: false, debounceMoveend: true })
      handleReposition()
      window.setTimeout(() => {
        mapInstance.value?.invalidateSize({ pan: false, debounceMoveend: true })
        handleReposition()
      }, 60)
    })
  })
}

function handleCloseDrawer() {
  clanBaseStore.closeDrawer()
}

function handlePoiDefineBaseClick(event: Event) {
  const target = event.target as HTMLElement | null
  const button = target?.closest<HTMLButtonElement>('.pu-base-btn')
  if (!button) return

  event.preventDefault()
  event.stopPropagation()

  const poiId = decodeURIComponent(button.dataset.poiId ?? '')
  const poiName = decodeURIComponent(button.dataset.poiName ?? 'POI')
  const x = Number(button.dataset.poiX)
  const z = Number(button.dataset.poiZ)
  const structureImageSrc = decodeURIComponent(button.dataset.structureSrc ?? '')

  if (!Number.isFinite(x) || !Number.isFinite(z) || !poiId) return

  clanBaseStore.startCreateFromPoi({
    poiId,
    poiName,
    x,
    z,
    structureImageSrc: structureImageSrc || undefined,
  })
}

onMounted(() => {
  document.addEventListener('click', handlePoiDefineBaseClick)
  disposePostZoomRefresh = registerPostZoomRefresh(() => {
    refreshLootMarkers()
    refreshBaseMarkers()
  })
})

onUnmounted(() => {
  document.removeEventListener('click', handlePoiDefineBaseClick)
  disposePostZoomRefresh?.()
  disposePostZoomRefresh = null
})
</script>

<template>
  <AppHeader />

  <div class="workspace">
    <AppSidebar :sections="sections" :type-map="typeMap" :status="status">
      <template v-if="SHOW_CALIBRATION" #calibration>
        <CalibrationPanel @reposition="handleReposition" />
      </template>
    </AppSidebar>

    <div class="workspace-main">
      <div class="map-shell">
        <MapLocationSearch :locations="mapLocations" @select="handleSelectLocation" />
        <!-- Leaflet mounts here -->
        <div ref="mapEl" class="map-container" />
      </div>
      <ClanBaseDrawer :open="isDrawerOpen" @close="handleCloseDrawer" />
    </div>
  </div>

  <footer class="app-footer">
    <span>Chernarus+ · 15.36 × 15.36 km</span>
    <span class="footer-sep">·</span>
    <span>Tiles <strong>xam.nu v1.27</strong></span>
    <span class="footer-sep">·</span>
    <span>Leaflet 1.9.4</span>
    <span class="footer-right">Scroll = zoom · Arrastar = mover · Clique = info</span>
  </footer>
</template>

<style scoped>
.workspace {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.map-container {
  flex: 1;
  width: 100%;
  height: 100%;
  min-height: 0;
  background: #060c06;
  cursor: crosshair;
}

.map-shell {
  position: relative;
  display: flex;
  flex: 1;
  min-width: 0;
  min-height: 0;
}

.workspace-main {
  display: flex;
  flex: 1;
  min-width: 0;
  min-height: 0;
}

.app-footer {
  height: 28px;
  background: var(--surface);
  border-top: 1px solid var(--border);
  display: flex;
  align-items: center;
  padding: 0 16px;
  gap: 10px;
  flex-shrink: 0;
  font-size: 0.68rem;
  color: var(--text-subtle);
}
.app-footer strong {
  color: var(--text-muted);
  font-weight: 500;
}
.footer-sep {
  color: var(--border-hi);
}
.footer-right {
  margin-left: auto;
  font-size: 0.65rem;
}
</style>
