<script setup lang="ts">
import { ref, watch } from 'vue'
import { useLeafletMap } from '@/composables/useLeafletMap'
import { useLootmap } from '@/composables/useLootmap'
import { SHOW_CALIBRATION } from '@/config'
import AppHeader from '@/components/AppHeader.vue'
import AppSidebar from '@/components/AppSidebar.vue'
import CalibrationPanel from '@/components/CalibrationPanel.vue'

// ─── Map container ref ────────────────────────────────────────────────────────
const mapEl = ref<HTMLElement | null>(null)

// ─── Map composable ───────────────────────────────────────────────────────────
const { mapInstance } = useLeafletMap(mapEl)

// ─── Lootmap composable ───────────────────────────────────────────────────────
const { sections, typeMap, status, load, repositionAllMarkers } = useLootmap(mapInstance)

// Load as soon as the map is ready
watch(mapInstance, (map) => { if (map) load() }, { once: true })
</script>

<template>
  <AppHeader />

  <div class="workspace">
    <AppSidebar :sections="sections" :type-map="typeMap" :status="status">
      <template v-if="SHOW_CALIBRATION" #calibration>
        <CalibrationPanel @reposition="repositionAllMarkers" />
      </template>
    </AppSidebar>

    <!-- Leaflet mounts here -->
    <div ref="mapEl" class="map-container" />
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
  background: #060c06;
  cursor: crosshair;
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
.footer-sep { color: var(--border-hi); }
.footer-right {
  margin-left: auto;
  font-size: 0.65rem;
}
</style>
