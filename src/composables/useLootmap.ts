import { ref, watch, type Ref } from 'vue'
import * as L from 'leaflet'
import { useMapStore } from '@/stores/mapStore'
import { useClanBaseStore } from '@/stores/clanBaseStore'
import { calibState, finishPick } from '@/composables/useCalibration'
import { SEC_META, DEFAULT_VISIBLE_SECTION } from '@/config'
import type { LmSection, LmType, LootmapData } from '@/types'
import { izurviveToGame, izurviveToLeaflet } from '@/utils/mapCoordinates'

const PREVIEW_IMAGES = import.meta.glob('@/assets/images/*.webp', {
  eager: true,
  import: 'default',
}) as Record<string, string>

const previewByLootName: Record<string, string> = Object.fromEntries(
  Object.entries(PREVIEW_IMAGES)
    .map(([path, src]) => {
      const filename = path.split('/').pop()
      if (!filename) return null
      return [filename.replace(/\.webp$/i, ''), src] as const
    })
    .filter((entry): entry is readonly [string, string] => entry !== null),
)

function escapeHtml(text: string) {
  return text
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

export function useLootmap(mapRef: Ref<L.Map | null>) {
  const mapStore = useMapStore()
  const clanBaseStore = useClanBaseStore()

  const sections = ref<LmSection[]>([])
  const typeMap = ref<Record<string, LmType>>({})
  const status = ref<{ loading: boolean; error: string | null }>({
    loading: true,
    error: null,
  })

  // Leaflet LayerGroups live outside Pinia (non-serialisable)
  const layerGroups: Record<string, L.LayerGroup> = {}
  // All markers kept for calibration repositioning
  const allMarkers: Array<{
    marker: L.CircleMarker
    lmLat: number
    lmLng: number
    baseRadius: number
    tid: string
    poiId: string | null
  }> = []
  const markersByType: Record<
    string,
    Array<{
      marker: L.CircleMarker
      poiId: string | null
    }>
  > = {}
  let refreshRaf = 0
  let isZoomAnimating = false
  let mapEventsBound = false
  let pendingVisibilitySync = false

  function radiusZoomFactor(zoom: number) {
    // Small points on overview, progressively larger when zooming in.
    if (zoom <= 2) return 0.55
    if (zoom >= 7) return 1.2
    return 0.55 + ((zoom - 2) / 5) * 0.65
  }

  function scaledRadius(baseRadius: number, zoom: number) {
    return Math.max(1, Math.round(baseRadius * radiusZoomFactor(zoom)))
  }

  function applyMarkerSizesByZoom(map: L.Map) {
    const zoom = map.getZoom()
    for (const m of allMarkers) {
      const r = scaledRadius(m.baseRadius, zoom)
      m.marker.setRadius(r)
      m.marker.setStyle({ weight: r <= 2 ? 1 : 1.25 })
    }
  }

  function refreshLootMarkers(map: L.Map | null = mapRef.value) {
    if (!map) return

    for (const { marker, lmLat, lmLng } of allMarkers) {
      marker.setLatLng(izurviveToLeaflet(lmLat, lmLng))
      if (typeof marker.redraw === 'function') marker.redraw()
    }

    applyMarkerSizesByZoom(map)

    for (const { marker } of allMarkers) {
      if (typeof marker.redraw === 'function') marker.redraw()
    }
  }

  function scheduleLootRefresh(map: L.Map | null = mapRef.value) {
    if (!map) return
    if (refreshRaf) cancelAnimationFrame(refreshRaf)
    refreshRaf = requestAnimationFrame(() => {
      refreshRaf = 0
      isZoomAnimating = false
      refreshLootMarkers(map)
      if (pendingVisibilitySync) {
        pendingVisibilitySync = false
        syncMarkerVisibility()
      }
    })
  }

  function bindMapEvents(map: L.Map) {
    if (mapEventsBound) return
    mapEventsBound = true

    map.on('zoomstart', () => {
      isZoomAnimating = true
    })
    map.on('zoomend', () => {
      scheduleLootRefresh(map)
    })
  }

  function usedPoiIds() {
    return new Set(
      clanBaseStore.bases
        .filter((base) => base.sourceType === 'poi' && Boolean(base.sourcePoiId))
        .map((base) => base.sourcePoiId as string),
    )
  }

  function syncMarkerVisibility() {
    const map = mapRef.value
    if (!map) return
    const mapIsAnimatingZoom = Boolean((map as L.Map & { _animatingZoom?: boolean })._animatingZoom)
    if (isZoomAnimating || mapIsAnimatingZoom) {
      pendingVisibilitySync = true
      return
    }

    const editMode = mapStore.isEditMode
    const blockedPoiIds = usedPoiIds()

    for (const [tid, group] of Object.entries(layerGroups)) {
      group.clearLayers()

      if (!editMode) {
        map.removeLayer(group)
        continue
      }

      for (const entry of markersByType[tid] ?? []) {
        const visibleByFilter = Boolean(mapStore.typeVis[tid])
        const availableForBase = !entry.poiId || !blockedPoiIds.has(entry.poiId)
        if (visibleByFilter && availableForBase) {
          group.addLayer(entry.marker)
        }
      }

      if (group.getLayers().length > 0) group.addTo(map)
      else map.removeLayer(group)
    }
  }

  // ─── Build from data ─────────────────────────────────────────────────────────
  function buildFromData(data: LootmapData) {
    const map = mapRef.value
    if (!map) return
    bindMapEvents(map)

    const staticSections = Array.isArray(data.static) ? data.static : []
    const allTypeIds: string[] = []
    const defaultOnTypeIds: string[] = []

    const newSections: LmSection[] = []
    const newTypeMap: Record<string, LmType> = {}

    const renderer = L.canvas({ padding: 0.5 })
    let totalCreated = 0

    for (const section of staticSections) {
      const sid = 'lms_' + section.name.replace(/\W/g, '_')
      const smeta = SEC_META[section.name] ?? { icon: '◉', color: '#888' }
      const secInfo: LmSection = {
        id: sid,
        label: section.name,
        color: smeta.color,
        icon: smeta.icon,
        typeIds: [],
        total: 0,
      }

      for (const btype of section.types ?? []) {
        const tid = sid + '_' + btype.name.replace(/\W/g, '_')
        const group = L.layerGroup()
        markersByType[tid] = []
        let count = 0

        for (const obj of btype.objects ?? []) {
          if (!Array.isArray(obj.positions) || !obj.positions.length) continue
          const displayName = obj.displayName ?? obj.name
          const cats = (obj.categories ?? []).join(', ')
          const previewSrc = previewByLootName[obj.name] ?? previewByLootName[obj.name.toLowerCase()]

          for (const pos of obj.positions) {
            if (!Array.isArray(pos) || pos.length < 2) continue
            const nums = (pos as unknown[]).filter((v): v is number => typeof v === 'number')
            if (nums.length < 2) continue
            const lmLat = nums[0]
            const lmLng = nums[1]
            if (lmLat === undefined || lmLng === undefined) continue

            const ll = izurviveToLeaflet(lmLat, lmLng)
            if (isNaN(ll.lat) || isNaN(ll.lng)) continue

            const tier = nums[2] ?? -1
            const rad = tier >= 4 ? 5 : tier >= 3 ? 4 : 3
            const markerColor = smeta.color

            const initialRadius = scaledRadius(rad, map.getZoom())
            const displayNameSafe = escapeHtml(displayName)
            const btypeNameSafe = escapeHtml(btype.name)
            const sectionNameSafe = escapeHtml(section.name)
            const catsSafe = escapeHtml(cats)
            const previewHtml = previewSrc
              ? `<div class="pu-preview-wrap"><img class="pu-preview" src="${previewSrc}" alt="Preview ${displayNameSafe}" loading="lazy" /></div>`
              : ''
            const poiId = encodeURIComponent(`${tid}:${obj.name}:${count}`)
            const poiName = encodeURIComponent(displayName)
            const structureSrc = encodeURIComponent(previewSrc ?? '')
            const gameCoords = izurviveToGame(lmLat, lmLng)

            const cm = L.circleMarker(ll, {
              renderer,
              radius: initialRadius,
              color: markerColor,
              fillColor: markerColor,
              fillOpacity: 0.75,
              weight: initialRadius <= 2 ? 1 : 1.25,
            })
              .bindPopup(
                `<div class="pu-name">${displayNameSafe}</div>` +
                  `<div class="pu-type">${btypeNameSafe} <span style="color:${markerColor};font-weight:600">${sectionNameSafe}</span></div>` +
                  previewHtml +
                  (cats ? `<div class="pu-cats">${catsSafe}</div>` : '') +
                  `<button type="button" class="pu-base-btn" data-poi-id="${poiId}" data-poi-name="${poiName}" data-poi-x="${Math.round(gameCoords.x)}" data-poi-z="${Math.round(gameCoords.z)}" data-structure-src="${structureSrc}">Definir como base</button>`,
              )
              .on('click', function (e: L.LeafletMouseEvent) {
                if (e.originalEvent) L.DomEvent.stopPropagation(e.originalEvent)
                if (calibState.pickingSlot >= 0) {
                  L.DomEvent.stopPropagation(e)
                  finishPick(lmLat, lmLng)
                }
              })

            markersByType[tid].push({ marker: cm, poiId })
            allMarkers.push({ marker: cm, lmLat, lmLng, baseRadius: rad, tid, poiId })
            count++
          }
        }

        if (count > 0) {
          newTypeMap[tid] = { id: tid, label: btype.name, secId: sid, color: smeta.color, count }
          layerGroups[tid] = group
          secInfo.typeIds.push(tid)
          secInfo.total += count
          allTypeIds.push(tid)
          if (section.name === DEFAULT_VISIBLE_SECTION) defaultOnTypeIds.push(tid)
          totalCreated += count
        }
      }

      if (secInfo.typeIds.length > 0) newSections.push(secInfo)
    }

    sections.value = newSections
    typeMap.value = newTypeMap
    status.value = { loading: false, error: null }
    mapStore.poiCount = totalCreated

    // Init filter state (restores localStorage or applies defaults)
    mapStore.initFilters(allTypeIds, defaultOnTypeIds)
    syncMarkerVisibility()

    // React to future filter changes
    watch(
      () => ({ ...mapStore.typeVis }),
      () => syncMarkerVisibility(),
    )
    watch(() => mapStore.viewMode, () => syncMarkerVisibility())
    watch(() => clanBaseStore.bases, () => syncMarkerVisibility(), { deep: true })

    // Calibration: map click → snap to nearest visible marker
    map.on('click', (e: L.LeafletMouseEvent) => {
      if (calibState.pickingSlot < 0 || !allMarkers.length || !mapStore.isEditMode) return
      const blockedPoiIds = usedPoiIds()
      let best: (typeof allMarkers)[0] | null = null
      let bestD = Infinity
      const pt = map.latLngToLayerPoint(e.latlng)
      for (const m of allMarkers) {
        const visibleByFilter = Boolean(mapStore.typeVis[m.tid])
        const availableForBase = !m.poiId || !blockedPoiIds.has(m.poiId)
        if (!visibleByFilter || !availableForBase) continue
        const d = pt.distanceTo(map.latLngToLayerPoint(m.marker.getLatLng()))
        if (d < bestD) {
          bestD = d
          best = m
        }
      }
      if (best && bestD < 120) finishPick(best.lmLat, best.lmLng)
      else
        calibState.hint =
          '⚠ Nenhum marcador próximo. Ative uma categoria e clique em cima de uma bolinha.'
    })
    applyMarkerSizesByZoom(map)
    if (!isZoomAnimating) refreshLootMarkers(map)
  }

  // ─── Load ─────────────────────────────────────────────────────────────────────
  async function load() {
    status.value = { loading: true, error: null }
    try {
      const w = window as Window & { LOOTMAP?: LootmapData }
      if (w.LOOTMAP) {
        buildFromData(w.LOOTMAP)
        return
      }

      await new Promise<void>((resolve, reject) => {
        const existing = document.querySelector<HTMLScriptElement>('script[data-lootmap-local="1"]')
        if (existing) {
          existing.addEventListener('load', () => resolve(), { once: true })
          existing.addEventListener('error', () => reject(new Error('Script load failed')), {
            once: true,
          })
          return
        }

        const s = document.createElement('script')
        s.src = '/lootmap.js'
        s.dataset.lootmapLocal = '1'
        s.onload = () => resolve()
        s.onerror = () => reject(new Error('Script load failed'))
        document.body.appendChild(s)
      })

      if (!w.LOOTMAP) throw new Error('LOOTMAP not defined')
      buildFromData(w.LOOTMAP)
    } catch {
      status.value = {
        loading: false,
        error:
          'Não foi possível carregar os dados locais.\n' +
          'Verifique se public/lootmap.js existe com:\n' +
          'var LOOTMAP = {...};',
      }
    }
  }

  // ─── Calibration helper ───────────────────────────────────────────────────────
  /** Called by CalibrationPanel after applyCalib updates calibState constants. */
  function repositionAllMarkers() {
    refreshLootMarkers()
  }

  return { sections, typeMap, status, load, repositionAllMarkers, refreshLootMarkers }
}
