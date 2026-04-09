export interface LmType {
  id: string
  label: string
  secId: string
  color: string
  count: number
}

export interface LmSection {
  id: string
  label: string
  color: string
  icon: string
  typeIds: string[]
  total: number
}

export interface CalibSlot {
  lmLat: number
  lmLng: number
}

export interface LootmapObject {
  name: string
  displayName?: string
  categories?: string[]
  positions: unknown[]
}

export interface LootmapType {
  name: string
  objects: LootmapObject[]
}

export interface LootmapSection {
  name: string
  types: LootmapType[]
}

export interface LootmapData {
  static: LootmapSection[]
}

export type TileType = 'topographic' | 'satellite'

export type MapLocationType =
  | 'Camp'
  | 'Capital'
  | 'City'
  | 'Hill'
  | 'Local'
  | 'Marine'
  | 'RailroadStation'
  | 'Ruin'
  | 'Village'

export type SettlementType = 'Capital' | 'City' | 'Village'

export interface MapLocation {
  name: string
  lat: number
  lng: number
  type: MapLocationType
  minZoom: number
}

export type SettlementLocation = MapLocation & { type: SettlementType }
