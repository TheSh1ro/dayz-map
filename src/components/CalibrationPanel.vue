<script setup lang="ts">
/**
 * Calibration panel — only mounted when SHOW_CALIBRATION is true in config.ts.
 * Allows two-point coordinate alignment between iZurvive latlng and DayZ game coords.
 */
import { ref } from 'vue'
import { calibState, startPick, applyCalib } from '@/composables/useCalibration'

const emit = defineEmits<{
  (e: 'reposition'): void
}>()

// Form values
const slotIndexes = [0, 1] as const
const inputs = ref<[{ gX: string; gZ: string }, { gX: string; gZ: string }]>([
  { gX: '', gZ: '' },
  { gX: '', gZ: '' },
])
const modeLinear = ref(false)

function pick(slot: 0 | 1) {
  startPick(slot)
}

function apply() {
  const parse = (s: string) => parseFloat(s.replace(',', '.'))
  const a = inputs.value[0]
  const b = inputs.value[1]
  if (!a || !b) return

  const gx0 = parse(a.gX),
    gz0 = parse(a.gZ)
  const gx1 = parse(b.gX),
    gz1 = parse(b.gZ)
  if ([gx0, gz0, gx1, gz1].some(isNaN)) {
    calibState.hint = '⚠ Preencha todos os campos antes de calibrar.'
    return
  }
  applyCalib(gx0, gz0, gx1, gz1, !modeLinear.value, () => emit('reposition'))
}
</script>

<template>
  <div class="calib-panel">
    <div class="calib-header">
      <span class="calib-icon">⊕</span>
      <span class="calib-title">Calibração de Escala</span>
    </div>

    <div v-for="slot in slotIndexes" :key="slot" class="calib-pt">
      <div class="calib-pt-top">
        <span class="calib-pt-label">Ponto {{ slot + 1 }}</span>
        <button
          class="pick-btn"
          :class="{ picking: calibState.pickingSlot === slot }"
          @click="pick(slot)"
        >
          {{ calibState.pickingSlot === slot ? '● Aguardando…' : '▶ Capturar' }}
        </button>
      </div>
      <div class="calib-captured">
        <span class="calib-cap-label">lat:</span>
        <span class="calib-cap-val">{{ calibState.slots[slot]?.lmLat.toFixed(5) ?? '—' }}</span>
        <span class="calib-cap-label" style="margin-left: 8px">lng:</span>
        <span class="calib-cap-val">{{ calibState.slots[slot]?.lmLng.toFixed(5) ?? '—' }}</span>
      </div>
      <div class="calib-inputs">
        <div class="calib-field">
          <label>X</label>
          <input
            v-model="inputs[slot].gX"
            class="calib-inp"
            type="text"
            :placeholder="slot === 0 ? 'ex: 6500' : 'ex: 13000'"
          />
        </div>
        <div class="calib-field">
          <label>Z</label>
          <input
            v-model="inputs[slot].gZ"
            class="calib-inp"
            type="text"
            :placeholder="slot === 0 ? 'ex: 2500' : 'ex: 11000'"
          />
        </div>
      </div>
    </div>

    <div class="calib-mode">
      <label class="calib-check-label">
        <input v-model="modeLinear" type="checkbox" />
        Modo Linear (em vez de Mercator)
      </label>
    </div>

    <button class="calib-apply" @click="apply">⊙ Calibrar</button>
    <p class="calib-hint">{{ calibState.hint }}</p>
  </div>
</template>

<style scoped>
.calib-panel {
  flex-shrink: 0;
  border-top: 1px solid var(--border);
  padding: 12px 14px;
  background: color-mix(in srgb, var(--warning) 4%, var(--surface));
}

.calib-header {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 10px;
}
.calib-icon {
  color: var(--warning);
  font-size: 0.85rem;
}
.calib-title {
  font-size: 0.72rem;
  font-weight: 600;
  color: var(--warning);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.calib-pt {
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 8px 10px;
  margin-bottom: 8px;
}

.calib-pt-top {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 5px;
}
.calib-pt-label {
  font-size: 0.68rem;
  font-weight: 600;
  color: var(--text-muted);
  text-transform: uppercase;
  letter-spacing: 0.06em;
}

.pick-btn {
  font-size: 0.65rem;
  font-family: 'Inter', sans-serif;
  padding: 2px 8px;
  border: 1px solid var(--border-hi);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  transition:
    border-color 0.12s,
    color 0.12s;
}
.pick-btn:hover {
  border-color: var(--warning);
  color: var(--warning);
}
.pick-btn.picking {
  border-color: var(--warning);
  color: var(--warning);
  animation: blink 1s ease-in-out infinite;
}
@keyframes blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.4;
  }
}

.calib-captured {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-bottom: 6px;
  font-size: 0.63rem;
}
.calib-cap-label {
  color: var(--text-subtle);
}
.calib-cap-val {
  font-family: 'JetBrains Mono', monospace;
  color: var(--text-muted);
}

.calib-inputs {
  display: flex;
  gap: 6px;
}
.calib-field {
  flex: 1;
  display: flex;
  align-items: center;
  gap: 4px;
}
.calib-field label {
  font-size: 0.65rem;
  color: var(--text-subtle);
  width: 12px;
  flex-shrink: 0;
}
.calib-inp {
  flex: 1;
  font-family: 'JetBrains Mono', monospace;
  font-size: 0.7rem;
  background: var(--surface);
  border: 1px solid var(--border-hi);
  color: var(--text);
  padding: 3px 6px;
  border-radius: var(--radius-sm);
  width: 100%;
}
.calib-inp:focus {
  outline: none;
  border-color: var(--warning);
}

.calib-mode {
  margin: 8px 0;
}
.calib-check-label {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 0.68rem;
  color: var(--text-muted);
  cursor: pointer;
}
.calib-check-label input {
  accent-color: var(--warning);
}

.calib-apply {
  width: 100%;
  padding: 6px;
  font-family: 'Inter', sans-serif;
  font-size: 0.72rem;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid var(--warning);
  border-radius: var(--radius-sm);
  background: color-mix(in srgb, var(--warning) 10%, transparent);
  color: var(--warning);
  letter-spacing: 0.04em;
  transition: background 0.15s;
}
.calib-apply:hover {
  background: color-mix(in srgb, var(--warning) 18%, transparent);
}

.calib-hint {
  font-size: 0.63rem;
  color: var(--text-subtle);
  margin-top: 7px;
  line-height: 1.5;
  min-height: 2.5em;
  font-family: 'JetBrains Mono', monospace;
}
</style>
