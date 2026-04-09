import { computed, ref, watch } from 'vue'
import { defineStore } from 'pinia'
import type {
  BaseStructureOption,
  ClanBase,
  ClanBaseCreateDraft,
  ClanMember,
  StartCreateFromPoiPayload,
} from '@/types'

const BASE_STORAGE_KEY = 'dayzmap:clan-bases:v1'

type PersistedClanBaseState = {
  currentMemberId: string
  bases: ClanBase[]
}

const STRUCTURE_IMAGES = import.meta.glob('@/assets/images/*.webp', {
  eager: true,
  import: 'default',
}) as Record<string, string>

const structureOptionsSeed: BaseStructureOption[] = Object.entries(STRUCTURE_IMAGES)
  .map(([path, imageSrc]) => {
    const filename = path.split('/').pop()?.replace(/\.webp$/i, '')
    if (!filename) return null

    return {
      id: filename,
      label: filename.replaceAll('_', ' ').replace(/\b\w/g, (char) => char.toUpperCase()),
      imageSrc,
    }
  })
  .filter((item): item is BaseStructureOption => item !== null)
  .sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))

const clanMembersSeed: ClanMember[] = [
  { id: 'm1', name: 'Gabriel', tag: 'KZT', role: 'Líder', avatarColor: '#f59e0b' },
  { id: 'm2', name: 'Nina', tag: 'KZT', role: 'Builder', avatarColor: '#10b981' },
  { id: 'm3', name: 'Rafa', tag: 'KZT', role: 'Sniper', avatarColor: '#0ea5e9' },
  { id: 'm4', name: 'Theo', tag: 'KZT', role: 'Farmer', avatarColor: '#ef4444' },
  { id: 'm5', name: 'Maya', tag: 'KZT', role: 'Scout', avatarColor: '#8b5cf6' },
]

const baseSeed: ClanBase[] = [
  {
    id: 'base-seed-1',
    name: 'Forte Vybor',
    x: 4800,
    z: 7800,
    sourceType: 'poi',
    sourcePoiId: 'poi-seed-vybor',
    structureId: structureOptionsSeed[0]?.id,
    ownerMemberId: 'm1',
    gateCode: '4521',
    isClanWide: false,
    accessMemberIds: ['m2'],
    pendingRequestMemberIds: ['m3'],
    createdAt: new Date('2026-04-02T10:00:00.000Z').toISOString(),
  },
  {
    id: 'base-seed-2',
    name: 'Refúgio Norte',
    x: 11300,
    z: 12950,
    sourceType: 'free',
    structureId: structureOptionsSeed[1]?.id,
    ownerMemberId: 'm2',
    gateCode: '900',
    isClanWide: true,
    accessMemberIds: ['m4'],
    pendingRequestMemberIds: [],
    createdAt: new Date('2026-04-06T19:30:00.000Z').toISOString(),
  },
]

function sanitizeCodeInput(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 6)
}

function isCodeValid(code: string): boolean {
  return /^\d{1,6}$/.test(code)
}

function canMemberSeeCode(memberId: string, base: ClanBase): boolean {
  if (base.ownerMemberId === memberId) return true
  if (base.isClanWide) return true
  return base.accessMemberIds.includes(memberId)
}

function normalizeBase(base: ClanBase): ClanBase {
  return {
    ...base,
    gateCode: sanitizeCodeInput(base.gateCode),
    accessMemberIds: Array.from(new Set(base.accessMemberIds)),
    pendingRequestMemberIds: Array.from(new Set(base.pendingRequestMemberIds)),
  }
}

function loadPersistedState(): PersistedClanBaseState | null {
  try {
    const raw = localStorage.getItem(BASE_STORAGE_KEY)
    if (!raw) return null

    const parsed = JSON.parse(raw) as PersistedClanBaseState
    if (!Array.isArray(parsed.bases) || typeof parsed.currentMemberId !== 'string') return null

    return {
      currentMemberId: parsed.currentMemberId,
      bases: parsed.bases.map(normalizeBase),
    }
  } catch {
    return null
  }
}

export const useClanBaseStore = defineStore('clanBase', () => {
  const members = ref<ClanMember[]>(clanMembersSeed)
  const structureOptions = ref<BaseStructureOption[]>(structureOptionsSeed)

  const persisted = loadPersistedState()

  const currentMemberId = ref(
    persisted?.currentMemberId && clanMembersSeed.some((member) => member.id === persisted.currentMemberId)
      ? persisted.currentMemberId
      : clanMembersSeed[0]?.id ?? '',
  )
  const bases = ref<ClanBase[]>(persisted?.bases?.length ? persisted.bases : baseSeed)
  const selectedBaseId = ref<string | null>(null)
  const createDraft = ref<ClanBaseCreateDraft | null>(null)

  const currentMember = computed(
    () => members.value.find((member) => member.id === currentMemberId.value) ?? null,
  )

  const selectedBase = computed(
    () => bases.value.find((base) => base.id === selectedBaseId.value) ?? null,
  )

  const isDrawerOpen = computed(() => Boolean(selectedBaseId.value || createDraft.value))

  function persistState() {
    const payload: PersistedClanBaseState = {
      currentMemberId: currentMemberId.value,
      bases: bases.value,
    }
    localStorage.setItem(BASE_STORAGE_KEY, JSON.stringify(payload))
  }

  watch([currentMemberId, bases], persistState, { deep: true })

  function selectMember(id: string) {
    if (!members.value.some((member) => member.id === id)) return
    currentMemberId.value = id
  }

  function selectBase(id: string | null) {
    selectedBaseId.value = id
    if (id) createDraft.value = null
  }

  function closeDrawer() {
    selectedBaseId.value = null
    createDraft.value = null
  }

  function startCreateFromPoi(payload: StartCreateFromPoiPayload) {
    const matchingStructure = structureOptions.value.find(
      (structure) => structure.imageSrc === payload.structureImageSrc,
    )

    createDraft.value = {
      name: payload.poiName,
      x: Math.round(payload.x),
      z: Math.round(payload.z),
      sourceType: 'poi',
      sourcePoiId: payload.poiId,
      structureId: matchingStructure?.id,
      gateCode: '',
      isClanWide: false,
      accessMemberIds: [],
    }
    selectedBaseId.value = null
  }

  function startCreateFromMapClick(x: number, z: number) {
    const roundedX = Math.round(x)
    const roundedZ = Math.round(z)

    createDraft.value = {
      name: `Base ${roundedX}/${roundedZ}`,
      x: roundedX,
      z: roundedZ,
      sourceType: 'free',
      gateCode: '',
      isClanWide: false,
      accessMemberIds: [],
    }
    selectedBaseId.value = null
  }

  function createBase(draft: ClanBaseCreateDraft) {
    const sanitizedCode = sanitizeCodeInput(draft.gateCode)
    if (!isCodeValid(sanitizedCode)) {
      throw new Error('A senha deve conter de 1 a 6 dígitos numéricos.')
    }
    if (!draft.structureId) {
      throw new Error('Selecione uma estrutura de referência.')
    }

    const nowIso = new Date().toISOString()
    const baseId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

    const nextBase: ClanBase = {
      id: baseId,
      name: draft.name.trim() || `Base ${Math.round(draft.x)}/${Math.round(draft.z)}`,
      x: Math.round(draft.x),
      z: Math.round(draft.z),
      sourceType: draft.sourceType,
      sourcePoiId: draft.sourcePoiId,
      structureId: draft.structureId,
      ownerMemberId: currentMemberId.value,
      gateCode: sanitizedCode,
      isClanWide: draft.isClanWide,
      accessMemberIds: Array.from(new Set(draft.accessMemberIds.filter((id) => id !== currentMemberId.value))),
      pendingRequestMemberIds: [],
      createdAt: nowIso,
    }

    bases.value = [nextBase, ...bases.value]
    createDraft.value = null
    selectedBaseId.value = nextBase.id
  }

  function updateBase(id: string, patch: Partial<ClanBase>) {
    bases.value = bases.value.map((base) => {
      if (base.id !== id) return base

      const gateCode =
        typeof patch.gateCode === 'string' ? sanitizeCodeInput(patch.gateCode) : base.gateCode
      if (!isCodeValid(gateCode)) {
        throw new Error('A senha deve conter de 1 a 6 dígitos numéricos.')
      }

      return normalizeBase({
        ...base,
        ...patch,
        gateCode,
      })
    })
  }

  function requestAccess(baseId: string, memberId: string) {
    bases.value = bases.value.map((base) => {
      if (base.id !== baseId) return base
      if (base.ownerMemberId === memberId || base.isClanWide || base.accessMemberIds.includes(memberId)) {
        return base
      }
      if (base.pendingRequestMemberIds.includes(memberId)) return base

      return {
        ...base,
        pendingRequestMemberIds: [...base.pendingRequestMemberIds, memberId],
      }
    })
  }

  function approveRequest(baseId: string, memberId: string) {
    bases.value = bases.value.map((base) => {
      if (base.id !== baseId) return base
      if (!base.pendingRequestMemberIds.includes(memberId)) return base

      return {
        ...base,
        pendingRequestMemberIds: base.pendingRequestMemberIds.filter((id) => id !== memberId),
        accessMemberIds: base.accessMemberIds.includes(memberId)
          ? base.accessMemberIds
          : [...base.accessMemberIds, memberId],
      }
    })
  }

  function rejectRequest(baseId: string, memberId: string) {
    bases.value = bases.value.map((base) => {
      if (base.id !== baseId) return base
      return {
        ...base,
        pendingRequestMemberIds: base.pendingRequestMemberIds.filter((id) => id !== memberId),
      }
    })
  }

  function grantManualAccess(baseId: string, memberId: string) {
    bases.value = bases.value.map((base) => {
      if (base.id !== baseId) return base
      if (base.ownerMemberId === memberId || base.accessMemberIds.includes(memberId)) return base

      return {
        ...base,
        accessMemberIds: [...base.accessMemberIds, memberId],
        pendingRequestMemberIds: base.pendingRequestMemberIds.filter((id) => id !== memberId),
      }
    })
  }

  function revokeManualAccess(baseId: string, memberId: string) {
    bases.value = bases.value.map((base) => {
      if (base.id !== baseId) return base
      return {
        ...base,
        accessMemberIds: base.accessMemberIds.filter((id) => id !== memberId),
      }
    })
  }

  function canCurrentMemberSeeCode(base: ClanBase) {
    return canMemberSeeCode(currentMemberId.value, base)
  }

  function canCurrentMemberManage(base: ClanBase) {
    return base.ownerMemberId === currentMemberId.value
  }

  function sanitizeGateCodeInput(raw: string): string {
    return sanitizeCodeInput(raw)
  }

  return {
    members,
    structureOptions,
    currentMemberId,
    currentMember,
    bases,
    selectedBaseId,
    selectedBase,
    createDraft,
    isDrawerOpen,
    selectMember,
    selectBase,
    closeDrawer,
    startCreateFromPoi,
    startCreateFromMapClick,
    createBase,
    updateBase,
    requestAccess,
    approveRequest,
    rejectRequest,
    grantManualAccess,
    revokeManualAccess,
    canCurrentMemberSeeCode,
    canCurrentMemberManage,
    sanitizeGateCodeInput,
  }
})
