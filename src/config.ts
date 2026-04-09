// ─── Feature Flags ────────────────────────────────────────────────────────────
/**
 * Set to `true` to show the calibration panel in the sidebar.
 * Intended for development/alignment purposes only.
 */
export const SHOW_CALIBRATION = false

// ─── Map Constants ─────────────────────────────────────────────────────────────
export const MAP_M = 15360
export const S = 256 / MAP_M

export const TILE_URLS = {
  topographic:
    'https://static.xam.nu/dayz/maps/chernarusplus/1.27/topographic/{z}/{x}/{y}.webp',
  satellite:
    'https://static.xam.nu/dayz/maps/chernarusplus/1.27/satellite/{z}/{x}/{y}.webp',
} as const

export const TIER_COLOR: Record<string, string> = {
  '-1': '#8b949e',
  1: '#3fb950',
  2: '#58a6ff',
  3: '#d29922',
  4: '#f85149',
  999: '#bc8cff',
}

export const TIER_LABEL: Record<string, string> = {
  '-1': '?',
  1: 'T1',
  2: 'T2',
  3: 'T3',
  4: 'T4',
  999: 'ÚNICO',
}

export const SEC_META: Record<string, { icon: string; color: string }> = {
  Military:   { icon: '★', color: '#f85149' },
  Medical:    { icon: '✚', color: '#bc8cff' },
  Urban:      { icon: '⬟', color: '#388bfd' },
  Rural:      { icon: '⌂', color: '#3fb950' },
  Industrial: { icon: '⚙', color: '#fb8f44' },
  Coast:      { icon: '⚓', color: '#39c5cf' },
  Wreck:      { icon: '✖', color: '#d29922' },
  Landmark:   { icon: '◆', color: '#e3b341' },
}

/** Only this section's types are visible by default */
export const DEFAULT_VISIBLE_SECTION = 'Urban'
