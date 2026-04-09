import * as L from 'leaflet'
import { MAP_M, S } from '@/config'
import { calibState, mercYfn } from '@/composables/useCalibration'
import type { MapLocation } from '@/types'

export function gameToLeaflet(x: number, z: number): L.LatLng {
  return L.latLng((z - MAP_M) * S, x * S)
}

export function izurviveToGame(lat: number, lng: number): { x: number; z: number } {
  const x = lng * calibState.cSX + calibState.cOX
  const z = calibState.cUseMercator
    ? mercYfn(lat) * calibState.cSZ + calibState.cOZ
    : lat * calibState.cSZ + calibState.cOZ
  return { x, z }
}

export function izurviveToLeaflet(lat: number, lng: number): L.LatLng {
  const { x, z } = izurviveToGame(lat, lng)
  return gameToLeaflet(x, z)
}

export function mapLocationToLeaflet(location: Pick<MapLocation, 'lat' | 'lng'>): L.LatLng {
  return izurviveToLeaflet(location.lat, location.lng)
}
