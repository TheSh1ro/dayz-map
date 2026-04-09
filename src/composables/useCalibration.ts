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
  const slot0 = calibState.slots[0]
  const slot1 = calibState.slots[1]
  if (!slot0 || !slot1) {
    calibState.hint = '⚠ Complete os 2 pontos antes de calibrar.'
    return
  }
  const pt0 = { ...slot0, gX: pt0GameX, gZ: pt0GameZ }
  const pt1 = { ...slot1, gX: pt1GameX, gZ: pt1GameZ }
  calibState.cUseMercator = useMercator
  calibState.cSX = (pt1.gX - pt0.gX) / (pt1.lmLng - pt0.lmLng)
  calibState.cOX = pt0.gX - calibState.cSX * pt0.lmLng

  if (useMercator) {
    const m0 = mercYfn(pt0.lmLat)
    const m1 = mercYfn(pt1.lmLat)
    calibState.cSZ = (pt1.gZ - pt0.gZ) / (m1 - m0)
    calibState.cOZ = pt0.gZ - calibState.cSZ * m0
  } else {
    calibState.cSZ = (pt1.gZ - pt0.gZ) / (pt1.lmLat - pt0.lmLat)
    calibState.cOZ = pt0.gZ - calibState.cSZ * pt0.lmLat
  }

  calibState.hint =
    `✓ Calibrado  sX=${calibState.cSX.toFixed(3)} oX=${calibState.cOX.toFixed(1)}` +
    `  sZ=${calibState.cSZ.toFixed(3)} oZ=${calibState.cOZ.toFixed(1)}`

  onComplete()
}
