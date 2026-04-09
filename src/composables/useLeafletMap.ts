import { ref, watch, onMounted, onUnmounted, type Ref } from 'vue'
import * as L from 'leaflet'
import { useMapStore } from '@/stores/mapStore'
import { MAP_M, S, TILE_URLS } from '@/config'
import { MAP_LOCATIONS } from '@/data/mapLocations'
import { mapLocationToLeaflet } from '@/utils/mapCoordinates'
import type { MapLocation, TileType } from '@/types'

type LocationLabel = {
  location: MapLocation
  marker: L.Marker
  isVisible: boolean
}

const LABEL_PANE_NAME = 'settlement-label-pane'
const MAP_ANIMATING_CLASS = 'map-overlay-animating'

function escapeHtml(raw: string): string {
  return raw
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function useLeafletMap(containerRef: Ref<HTMLElement | null>) {
  const mapStore = useMapStore()
  const mapInstance = ref<L.Map | null>(null)
  const mapLocations = MAP_LOCATIONS

  const locationLabels: LocationLabel[] = []
  let locationLabelLayer: L.LayerGroup | null = null
  let resizeObserver: ResizeObserver | null = null
  let resizeRaf = 0
  let resizeSettleTimer: ReturnType<typeof setTimeout> | null = null

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

  function syncLocationLabelVisibility(map: L.Map | null = mapInstance.value) {
    if (!map || !locationLabelLayer) return

    const zoom = map.getZoom()
    for (const entry of locationLabels) {
      const shouldBeVisible = zoom >= entry.location.minZoom
      if (shouldBeVisible === entry.isVisible) continue

      if (shouldBeVisible) entry.marker.addTo(locationLabelLayer)
      else locationLabelLayer.removeLayer(entry.marker)
      entry.isVisible = shouldBeVisible
    }
  }

  function setMapAnimatingState(active: boolean) {
    const container = containerRef.value
    if (!container) return
    container.classList.toggle(MAP_ANIMATING_CLASS, active)
  }

  function refreshLocationLabels(map: L.Map | null = mapInstance.value) {
    if (!map || !locationLabelLayer) return

    syncLocationLabelVisibility(map)

    for (const entry of locationLabels) {
      if (!entry.isVisible) continue
      locationLabelLayer.removeLayer(entry.marker)
      entry.marker.addTo(locationLabelLayer)
    }
  }

  function initLocationLabels(map: L.Map) {
    if (!map.getPane(LABEL_PANE_NAME)) map.createPane(LABEL_PANE_NAME)
    map.getPane(LABEL_PANE_NAME)?.classList.add('settlement-label-pane')

    locationLabelLayer = L.layerGroup().addTo(map)
    locationLabels.length = 0

    for (const location of mapLocations) {
      const marker = L.marker(mapLocationToLeaflet(location), {
        pane: LABEL_PANE_NAME,
        icon: L.divIcon({
          className: 'settlement-label-icon',
          html:
            `<span class="settlement-label settlement-label-${location.type.toLowerCase()}">` +
            `${escapeHtml(location.name)}</span>`,
          iconSize: [0, 0],
        }),
        interactive: false,
        keyboard: false,
        bubblingMouseEvents: false,
      })

      locationLabels.push({ location, marker, isVisible: false })
    }

    syncLocationLabelVisibility(map)
  }

  function repositionLocationLabels() {
    for (const entry of locationLabels) {
      entry.marker.setLatLng(mapLocationToLeaflet(entry.location))
    }
    refreshLocationLabels()
  }

  function goToLocation(
    location: Pick<MapLocation, 'lat' | 'lng' | 'minZoom'>,
    targetZoom?: number,
  ) {
    const map = mapInstance.value
    if (!map) return

    const nextZoom =
      typeof targetZoom === 'number' ? targetZoom : Math.max(map.getZoom(), location.minZoom)

    map.flyTo(mapLocationToLeaflet(location), nextZoom, {
      animate: true,
      duration: 0.65,
      easeLinearity: 0.25,
    })
  }

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
    const currentTileLayer = tileLayers[mapStore.currentTile]
    if (currentTileLayer) currentTileLayer.addTo(map)
    initLocationLabels(map)

    mapStore.zoom = map.getZoom()

    map.on('mousemove', (e: L.LeafletMouseEvent) => {
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
      refreshLocationLabels(map)
    })
    map.on('moveend', () => {
      refreshLocationLabels(map)
    })

    mapInstance.value = map

    resizeObserver = new ResizeObserver(() => {
      if (!mapInstance.value) return
      setMapAnimatingState(true)
      if (resizeRaf) cancelAnimationFrame(resizeRaf)
      if (resizeSettleTimer) clearTimeout(resizeSettleTimer)
      resizeRaf = requestAnimationFrame(() => {
        mapInstance.value?.invalidateSize({ pan: false, debounceMoveend: true })
      })
      resizeSettleTimer = setTimeout(() => {
        setMapAnimatingState(false)
        refreshLocationLabels(mapInstance.value)
      }, 80)
    })
    resizeObserver.observe(containerRef.value)
  }

  // Sync tile when store changes (e.g. from header toggle)
  watch(
    () => mapStore.currentTile,
    (next, prev) => {
      if (!mapInstance.value) return
      const prevLayer = tileLayers[prev]
      const nextLayer = tileLayers[next]
      if (prevLayer) mapInstance.value.removeLayer(prevLayer)
      if (nextLayer) nextLayer.addTo(mapInstance.value)
    },
  )

  function setTile(name: TileType) {
    mapStore.currentTile = name
  }

  onMounted(initMap)
  onUnmounted(() => {
    if (resizeRaf) cancelAnimationFrame(resizeRaf)
    resizeRaf = 0
    if (resizeSettleTimer) clearTimeout(resizeSettleTimer)
    resizeSettleTimer = null
    resizeObserver?.disconnect()
    resizeObserver = null

    locationLabelLayer?.clearLayers()
    locationLabelLayer = null
    locationLabels.length = 0

    mapInstance.value?.remove()
    mapInstance.value = null
  })

  return {
    mapInstance,
    MAP_BOUNDS,
    g2l,
    l2g,
    setTile,
    mapLocations,
    goToLocation,
    repositionLocationLabels,
  }
}
