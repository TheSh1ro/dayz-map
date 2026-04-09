import { onUnmounted, watch, type Ref } from 'vue'
import * as L from 'leaflet'
import type { ClanBase, ClanMember } from '@/types'
import { gameToLeaflet } from '@/utils/mapCoordinates'
import { MAP_M, S } from '@/config'

type UseClanBasesLayerOptions = {
  mapRef: Ref<L.Map | null>
  basesRef: Ref<ClanBase[]>
  membersRef: Ref<ClanMember[]>
  currentMemberIdRef: Ref<string>
  selectedBaseIdRef: Ref<string | null>
  editableRef: Ref<boolean>
  createDraftRef: Ref<{
    x: number
    z: number
    sourceType: 'poi' | 'free'
  } | null>
  onSelectBase: (baseId: string) => void
  onMapCreateClick: (x: number, z: number) => void
}

export function useClanBasesLayer(options: UseClanBasesLayerOptions) {
  let layerGroup: L.LayerGroup | null = null
  let mapClickHandler: ((event: L.LeafletMouseEvent) => void) | null = null
  let previewMarker: L.CircleMarker | null = null
  let renderer: any = null

  const markerMap = new Map<string, L.Marker>()

  function leafletToGame(latlng: L.LatLng) {
    return {
      x: Math.round(latlng.lng / S),
      z: Math.round(latlng.lat / S + MAP_M),
    }
  }

  function clearLayer() {
    markerMap.clear()
    layerGroup?.clearLayers()
    previewMarker = null
  }

  function canCurrentMemberAccess(base: ClanBase) {
    return (
      base.ownerMemberId === options.currentMemberIdRef.value ||
      base.isClanWide ||
      base.accessMemberIds.includes(options.currentMemberIdRef.value)
    )
  }

  function getMarkerColor(base: ClanBase) {
    if (base.isClanWide) return '#22c55e'
    return canCurrentMemberAccess(base) ? '#2563eb' : '#ef4444'
  }

  function buildMarkerHtml(base: ClanBase, isSelected: boolean) {
    const color = getMarkerColor(base)
    const hasAccess = canCurrentMemberAccess(base)
    const iconClass = hasAccess ? 'fa-solid fa-house' : 'fa-solid fa-lock'
    const stateClass = hasAccess ? 'is-accessible' : 'is-locked'
    const selectedClass = isSelected ? 'is-selected' : ''

    return `
      <div
        class="clan-base-marker ${stateClass} ${selectedClass}"
        style="--marker-color: ${color};"
      >
        <div class="clan-base-marker-pin">
          <i class="${iconClass}" aria-hidden="true"></i>
        </div>
      </div>
    `
  }

  function renderBases() {
    const map = options.mapRef.value
    if (!map || !layerGroup) return

    clearLayer()

    for (const base of options.basesRef.value) {
      const isSelected = options.selectedBaseIdRef.value === base.id
      const hasAccess = canCurrentMemberAccess(base)
      const marker = L.marker(gameToLeaflet(base.x, base.z), {
        bubblingMouseEvents: false,
        keyboard: false,
        zIndexOffset: isSelected ? 200 : hasAccess ? 120 : 80,
        icon: L.divIcon({
          className: 'clan-base-marker-wrap',
          html: buildMarkerHtml(base, isSelected),
          iconSize: [34, 34],
          iconAnchor: [17, 17],
          tooltipAnchor: [0, -18],
        }),
      })

      marker.bindTooltip(`${base.name} · ${hasAccess ? 'Com acesso' : 'Sem acesso'}`, {
        direction: 'top',
        offset: [0, -8],
        opacity: 0.95,
      })

      marker.on('click', (event: L.LeafletMouseEvent) => {
        if (event.originalEvent) L.DomEvent.stopPropagation(event.originalEvent)
        options.onSelectBase(base.id)
      })

      marker.addTo(layerGroup)
      markerMap.set(base.id, marker)
    }
  }

  function renderDraftPreview() {
    if (!layerGroup) return

    if (!options.editableRef.value) return

    const draft = options.createDraftRef.value
    if (!draft || draft.sourceType !== 'free') return

    previewMarker = L.circleMarker(gameToLeaflet(draft.x, draft.z), {
      renderer: renderer ?? undefined,
      interactive: false,
      bubblingMouseEvents: false,
      radius: 7,
      color: '#67e8f9',
      fillColor: '#22d3ee',
      fillOpacity: 0.3,
      weight: 2,
    })
    previewMarker.addTo(layerGroup)
  }

  function refreshBaseMarkers() {
    for (const base of options.basesRef.value) {
      markerMap.get(base.id)?.setLatLng(gameToLeaflet(base.x, base.z))
    }

    const draft = options.createDraftRef.value
    if (previewMarker && draft && draft.sourceType === 'free') {
      previewMarker.setLatLng(gameToLeaflet(draft.x, draft.z))
    }
  }

  function ensureLayer() {
    const map = options.mapRef.value
    if (!map || layerGroup) return

    renderer = (L as any).svg({ padding: 0.5 })
    layerGroup = L.layerGroup().addTo(map)

    mapClickHandler = (event: L.LeafletMouseEvent) => {
      if (!options.editableRef.value) return
      const coords = leafletToGame(event.latlng)
      options.onMapCreateClick(coords.x, coords.z)
    }

    map.on('click', mapClickHandler)
  }

  watch(
    [
      () => options.mapRef.value,
      () => options.basesRef.value,
      () => options.membersRef.value,
      () => options.currentMemberIdRef.value,
      () => options.selectedBaseIdRef.value,
      () => options.editableRef.value,
      () => options.createDraftRef.value,
    ],
    () => {
      ensureLayer()
      renderBases()
      renderDraftPreview()
    },
    { immediate: true },
  )

  onUnmounted(() => {
    const map = options.mapRef.value
    if (map && mapClickHandler) {
      map.off('click', mapClickHandler)
    }

    clearLayer()
    layerGroup?.remove()
    layerGroup = null
    mapClickHandler = null
    renderer = null
  })

  return {
    refreshBaseMarkers,
  }
}
