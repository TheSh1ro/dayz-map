import { ref, watch, type Ref } from 'vue'
import * as L from 'leaflet'
import { useMapStore } from '@/stores/mapStore'
import { calibState, finishPick } from '@/composables/useCalibration'
import { SEC_META, TIER_COLOR, TIER_LABEL, DEFAULT_VISIBLE_SECTION } from '@/config'
import type { LmSection, LmType, LootmapData } from '@/types'
import { izurviveToLeaflet } from '@/utils/mapCoordinates'

export function useLootmap(mapRef: Ref<L.Map | null>) {
  const mapStore = useMapStore()

  const sections = ref<LmSection[]>([])
  const typeMap = ref<Record<string, LmType>>({})
  const status = ref<{ loading: boolean; error: string | null }>({
    loading: true,
    error: null,
  })

  // Leaflet LayerGroups live outside Pinia (non-serialisable)
  const layerGroups: Record<string, L.LayerGroup> = {}
  // All markers kept for calibration repositioning
  const allMarkers: Array<{ marker: L.CircleMarker; lmLat: number; lmLng: number }> = []

  // ─── Build from data ─────────────────────────────────────────────────────────
  function buildFromData(data: LootmapData) {
    const map = mapRef.value
    if (!map) return

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
        let count = 0

        for (const obj of btype.objects ?? []) {
          if (!Array.isArray(obj.positions) || !obj.positions.length) continue
          const displayName = obj.displayName ?? obj.name
          const cats = (obj.categories ?? []).join(', ')

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
            const tc = TIER_COLOR[String(tier)] ?? TIER_COLOR['-1']
            const tl = TIER_LABEL[String(tier)] ?? TIER_LABEL['-1']
            const rad = tier >= 4 ? 5 : tier >= 3 ? 4 : 3

            const cm = L.circleMarker(ll, {
              renderer,
              radius: rad,
              color: tc,
              fillColor: tc,
              fillOpacity: 0.75,
              weight: 1.5,
            })
              .bindPopup(
                `<div class="pu-name">${displayName}</div>` +
                  `<div class="pu-type">${btype.name} <span style="color:${tc};font-weight:600">${tl}</span></div>` +
                  (cats ? `<div class="pu-cats">${cats}</div>` : ''),
              )
              .on('click', function (e: any) {
                if (calibState.pickingSlot >= 0) {
                  L.DomEvent.stopPropagation(e)
                  finishPick(lmLat, lmLng)
                }
              })

            cm.addTo(group)
            allMarkers.push({ marker: cm, lmLat, lmLng })
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

    // Apply initial visibility
    for (const [tid, on] of Object.entries(mapStore.typeVis)) {
      const group = layerGroups[tid]
      if (on && group) group.addTo(map)
    }

    // React to future filter changes
    watch(
      () => ({ ...mapStore.typeVis }),
      (vis) => {
        for (const [tid, on] of Object.entries(vis)) {
          const group = layerGroups[tid]
          if (!group) continue
          if (on) group.addTo(map)
          else map.removeLayer(group)
        }
      },
    )

    // Calibration: map click → snap to nearest visible marker
    map.on('click', (e: any) => {
      if (calibState.pickingSlot < 0 || !allMarkers.length) return
      let best: (typeof allMarkers)[0] | null = null
      let bestD = Infinity
      const pt = map.latLngToLayerPoint(e.latlng)
      for (const m of allMarkers) {
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
    for (const { marker, lmLat, lmLng } of allMarkers) {
      marker.setLatLng(izurviveToLeaflet(lmLat, lmLng))
    }
  }

  return { sections, typeMap, status, load, repositionAllMarkers }
}
