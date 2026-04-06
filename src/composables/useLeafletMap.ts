import { ref, watch, onMounted, onUnmounted, type Ref } from 'vue'
import L from 'leaflet'
import { useMapStore } from '@/stores/mapStore'
import { MAP_M, S, TILE_URLS } from '@/config'

export function useLeafletMap(containerRef: Ref<HTMLElement | null>) {
  const mapStore = useMapStore()
  const mapInstance = ref<L.Map | null>(null)

  // ─── Coordinate Helpers ───────────────────────────────────────────────────────
  function g2l(x: number, z: number): L.LatLng {
    return L.latLng((z - MAP_M) * S, x * S)
  }
  function l2g(ll: L.LatLng): { x: number; z: number } {
    return { x: Math.round(ll.lng / S), z: Math.round(ll.lat / S + MAP_M) }
  }

  const MAP_BOUNDS = L.latLngBounds(g2l(0, 0), g2l(MAP_M, MAP_M))

  const TILE_OPTS: L.TileLayerOptions = {
    tileSize: 256,
    noWrap: true,
    bounds: MAP_BOUNDS,
    minZoom: 0,
    maxZoom: 7,
    attribution:
      'Tiles © <a href="https://xam.nu" target="_blank">xam.nu</a> | DayZ © Bohemia Interactive',
  }

  const tileLayers: Record<string, L.TileLayer> = {}

  function initMap() {
    if (!containerRef.value) return

    const map = L.map(containerRef.value, {
      crs: L.CRS.Simple,
      minZoom: 2,
      maxZoom: 7,
      maxBounds: MAP_BOUNDS.pad(0.04),
      zoomControl: true,
      attributionControl: true,
    })
    map.fitBounds(MAP_BOUNDS)

    tileLayers.topographic = L.tileLayer(TILE_URLS.topographic, TILE_OPTS)
    tileLayers.satellite = L.tileLayer(TILE_URLS.satellite, TILE_OPTS)
    tileLayers[mapStore.currentTile].addTo(map)

    mapStore.zoom = map.getZoom()

    map.on('mousemove', (e) => {
      const g = l2g(e.latlng)
      mapStore.coords = {
        x: g.x.toLocaleString('pt-BR'),
        z: g.z.toLocaleString('pt-BR'),
      }
    })
    map.on('mouseout', () => {
      mapStore.coords = { x: '—', z: '—' }
    })
    map.on('zoomend', () => {
      mapStore.zoom = map.getZoom()
    })

    mapInstance.value = map
  }

  // Sync tile when store changes (e.g. from header toggle)
  watch(
    () => mapStore.currentTile,
    (next, prev) => {
      if (!mapInstance.value) return
      mapInstance.value.removeLayer(tileLayers[prev])
      tileLayers[next].addTo(mapInstance.value)
    },
  )

  function setTile(name: 'topographic' | 'satellite') {
    mapStore.currentTile = name
  }

  onMounted(initMap)
  onUnmounted(() => {
    mapInstance.value?.remove()
    mapInstance.value = null
  })

  return { mapInstance, MAP_BOUNDS, g2l, l2g, setTile }
}
