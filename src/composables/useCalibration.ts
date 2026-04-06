import { reactive } from 'vue'
import type { CalibSlot } from '@/types'

/**
 * Module-level singleton — shared between useLootmap and CalibrationPanel.
 * Holds calibration constants and the interactive pick state.
 */
export const calibState = reactive({
  cSX: 44.246,
  cOX: 7962.8,
  cSZ: 2535.853,
  cOZ: 7964.6,
  cUseMercator: true,
  slots: [null, null] as [CalibSlot | null, CalibSlot | null],
  pickingSlot: -1 as number,
  hint: 'Ative uma categoria, clique "Capturar" e depois clique num marcador conhecido.',
})

export function mercYfn(latDeg: number): number {
  const r = (latDeg * Math.PI) / 180
  return Math.log(Math.tan(Math.PI / 4 + r / 2))
}

export function startPick(slot: 0 | 1) {
  calibState.pickingSlot = slot
  calibState.hint = `Clique num marcador visível no mapa para capturar o Ponto ${slot + 1}…`
}

export function finishPick(lmLat: number, lmLng: number) {
  const slot = calibState.pickingSlot
  if (slot < 0) return
  calibState.slots[slot as 0 | 1] = { lmLat, lmLng }
  calibState.pickingSlot = -1
  calibState.hint =
    slot === 0
      ? '✓ Pt 1 capturado! Informe coords do jogo e capture o Pt 2.'
      : '✓ Pt 2 capturado! Informe as coords do jogo e clique CALIBRAR.'
}

/**
 * @param onComplete Called after constants are updated, so caller can reposition markers.
 */
export function applyCalib(
  pt0GameX: number,
  pt0GameZ: number,
  pt1GameX: number,
  pt1GameZ: number,
  useMercator: boolean,
  onComplete: () => void,
) {
  if (!calibState.slots[0] || !calibState.slots[1]) {
    calibState.hint = '⚠ Complete os 2 pontos antes de calibrar.'
    return
  }
  const pts = [
    { ...calibState.slots[0], gX: pt0GameX, gZ: pt0GameZ },
    { ...calibState.slots[1], gX: pt1GameX, gZ: pt1GameZ },
  ]
  calibState.cUseMercator = useMercator
  calibState.cSX = (pts[1].gX - pts[0].gX) / (pts[1].lmLng - pts[0].lmLng)
  calibState.cOX = pts[0].gX - calibState.cSX * pts[0].lmLng

  if (useMercator) {
    const m0 = mercYfn(pts[0].lmLat)
    const m1 = mercYfn(pts[1].lmLat)
    calibState.cSZ = (pts[1].gZ - pts[0].gZ) / (m1 - m0)
    calibState.cOZ = pts[0].gZ - calibState.cSZ * m0
  } else {
    calibState.cSZ = (pts[1].gZ - pts[0].gZ) / (pts[1].lmLat - pts[0].lmLat)
    calibState.cOZ = pts[0].gZ - calibState.cSZ * pts[0].lmLat
  }

  calibState.hint =
    `✓ Calibrado  sX=${calibState.cSX.toFixed(3)} oX=${calibState.cOX.toFixed(1)}` +
    `  sZ=${calibState.cSZ.toFixed(3)} oZ=${calibState.cOZ.toFixed(1)}`

  onComplete()
}
