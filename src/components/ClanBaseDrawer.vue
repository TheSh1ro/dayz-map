<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useClanBaseStore } from '@/stores/clanBaseStore'
import type { ClanBaseCreateDraft, ClanMember } from '@/types'

const props = defineProps<{ open: boolean }>()
const emit = defineEmits<{ close: [] }>()

const clanBaseStore = useClanBaseStore()
const dateFormatter = new Intl.DateTimeFormat('pt-BR', {
  dateStyle: 'medium',
  timeStyle: 'short',
})
const gateLabels = ['Portão 1', 'Portão 2'] as const

const formName = ref('')
const formGateCodes = ref<[string, string]>(['', ''])
const formStructureId = ref('')
const formIsClanWide = ref(false)
const formManualAccessIds = ref<string[]>([])
const formError = ref<string | null>(null)

const showCreateCodes = ref<[boolean, boolean]>([false, false])
const showCurrentBaseCodes = ref<[boolean, boolean]>([false, false])
const showEditCodes = ref<[boolean, boolean]>([false, false])
const isEditingName = ref(false)
const isEditingStructure = ref(false)
const editName = ref('')
const editStructureId = ref('')
const editGateCodes = ref<[string, string]>(['', ''])
const detailsError = ref<string | null>(null)
const editError = ref<string | null>(null)
const grantMemberId = ref('')
const editSaveDelayMs = 700
let editSaveTimeout: ReturnType<typeof setTimeout> | null = null

const createDraft = computed(() => clanBaseStore.createDraft)
const selectedBase = computed(() => clanBaseStore.selectedBase)

const isCreateMode = computed(() => Boolean(createDraft.value))
const isViewMode = computed(() => Boolean(selectedBase.value))

const currentMemberId = computed(() => clanBaseStore.currentMemberId)

const canManageSelectedBase = computed(() =>
  selectedBase.value ? clanBaseStore.canCurrentMemberManage(selectedBase.value) : false,
)

const canSeeSelectedBaseCode = computed(() =>
  selectedBase.value ? clanBaseStore.canCurrentMemberSeeCode(selectedBase.value) : false,
)
const isSelectedBaseOwner = computed(
  () => Boolean(selectedBase.value) && selectedBase.value?.ownerMemberId === currentMemberId.value,
)

const currentOwner = computed(() => {
  if (!selectedBase.value) return null
  return (
    clanBaseStore.members.find((member) => member.id === selectedBase.value?.ownerMemberId) ?? null
  )
})

const currentStructure = computed(() => {
  if (!selectedBase.value?.structureId) return null
  return (
    clanBaseStore.structureOptions.find(
      (structure) => structure.id === selectedBase.value?.structureId,
    ) ?? null
  )
})

const createStructure = computed(() => {
  if (!formStructureId.value) return null
  return (
    clanBaseStore.structureOptions.find((structure) => structure.id === formStructureId.value) ??
    null
  )
})

const editStructure = computed(() => {
  if (!editStructureId.value) return null
  return (
    clanBaseStore.structureOptions.find((structure) => structure.id === editStructureId.value) ??
    null
  )
})

const previewStructure = computed(() =>
  canManageSelectedBase.value && isEditingStructure.value ? editStructure.value : currentStructure.value,
)

const allMembers = computed(() => clanBaseStore.members)

const createMemberChoices = computed(() =>
  allMembers.value.filter((member) => member.id !== currentMemberId.value),
)

const pendingMembers = computed<ClanMember[]>(() => {
  if (!selectedBase.value) return []
  return selectedBase.value.pendingRequestMemberIds
    .map((memberId) => allMembers.value.find((member) => member.id === memberId))
    .filter((member): member is ClanMember => Boolean(member))
})

const manualAccessMembers = computed<ClanMember[]>(() => {
  if (!selectedBase.value) return []
  return selectedBase.value.accessMemberIds
    .map((memberId) => allMembers.value.find((member) => member.id === memberId))
    .filter((member): member is ClanMember => Boolean(member))
})

const effectiveAccessMembers = computed<ClanMember[]>(() => {
  if (!selectedBase.value) return []

  const effectiveIds = new Set<string>()
  effectiveIds.add(selectedBase.value.ownerMemberId)

  if (selectedBase.value.isClanWide) {
    for (const member of allMembers.value) effectiveIds.add(member.id)
  } else {
    for (const memberId of selectedBase.value.accessMemberIds) effectiveIds.add(memberId)
  }

  return [...effectiveIds]
    .map((memberId) => allMembers.value.find((member) => member.id === memberId))
    .filter((member): member is ClanMember => Boolean(member))
})

const availableGrantMembers = computed(() => {
  if (!selectedBase.value || selectedBase.value.isClanWide) return []

  return allMembers.value.filter((member) => {
    if (member.id === selectedBase.value?.ownerMemberId) return false
    return !selectedBase.value?.accessMemberIds.includes(member.id)
  })
})

const hasPendingForCurrentMember = computed(() => {
  if (!selectedBase.value) return false
  return selectedBase.value.pendingRequestMemberIds.includes(currentMemberId.value)
})

const createSourceLabel = computed(() =>
  createDraft.value?.sourceType === 'poi' ? 'Normal' : 'Personalizada',
)

const selectedBaseSourceLabel = computed(() =>
  selectedBase.value?.sourceType === 'poi' ? 'Normal' : 'Personalizada',
)

const selectedBaseAccessLabel = computed(() =>
  selectedBase.value?.isClanWide ? 'Clã inteiro' : 'Acesso controlado',
)

const selectedBaseCreatedAtLabel = computed(() => {
  if (!selectedBase.value?.createdAt) return 'Agora'
  return dateFormatter.format(new Date(selectedBase.value.createdAt))
})

const createCodePreviews = computed(() =>
  formGateCodes.value.map((code, index) =>
    formatGateCodePreview(code, showCreateCodes.value[index] ?? false),
  ),
)

const selectedBaseCodePreviews = computed(() => {
  if (!selectedBase.value) return ['não definida', 'não definida']

  return selectedBase.value.gateCodes.map((code, index) =>
    formatGateCodePreview(code, showCurrentBaseCodes.value[index] ?? false),
  )
})

watch(
  () => createDraft.value,
  (draft) => {
    if (!draft) return

    formName.value = draft.name
    formGateCodes.value = [...draft.gateCodes] as [string, string]
    formStructureId.value = draft.structureId ?? ''
    formIsClanWide.value = draft.isClanWide
    formManualAccessIds.value = [...draft.accessMemberIds]
    formError.value = null
    showCreateCodes.value = [false, false]
  },
  { immediate: true },
)

watch(
  () => selectedBase.value,
  (base) => {
    detailsError.value = null
    editError.value = null
    isEditingName.value = false
    isEditingStructure.value = false
    showCurrentBaseCodes.value = [false, false]
    showEditCodes.value = [false, false]
    editName.value = base?.name ?? ''
    editStructureId.value = base?.structureId ?? ''
    editGateCodes.value = base?.gateCodes ? ([...base.gateCodes] as [string, string]) : ['', '']
    grantMemberId.value = ''
    if (editSaveTimeout) {
      clearTimeout(editSaveTimeout)
      editSaveTimeout = null
    }
  },
  { immediate: true },
)

watch([() => selectedBase.value?.id, () => editGateCodes.value.join('|'), isSelectedBaseOwner], () => {
  if (editSaveTimeout) {
    clearTimeout(editSaveTimeout)
    editSaveTimeout = null
  }

  if (!selectedBase.value || !isSelectedBaseOwner.value) return
  if (haveSameGateCodes(editGateCodes.value, selectedBase.value.gateCodes)) return

  const baseId = selectedBase.value.id
  const gateCodes = [...editGateCodes.value] as [string, string]

  editSaveTimeout = setTimeout(() => {
    try {
      clanBaseStore.updateBase(baseId, { gateCodes })
      editError.value = null
    } catch (error) {
      editError.value =
        error instanceof Error ? error.message : 'Não foi possível salvar as senhas.'
    } finally {
      editSaveTimeout = null
    }
  }, editSaveDelayMs)
})

onBeforeUnmount(() => {
  if (editSaveTimeout) {
    clearTimeout(editSaveTimeout)
    editSaveTimeout = null
  }
})

function sanitizeGateCode(raw: string): string {
  return clanBaseStore.sanitizeGateCodeInput(raw)
}

function formatGateCodePreview(code: string, visible: boolean) {
  if (visible) return code || 'não definida'
  return code ? '•'.repeat(code.length) : 'não definida'
}

function haveSameGateCodes(left: [string, string], right: [string, string]) {
  return left[0] === right[0] && left[1] === right[1]
}

function onCreateGateInput(index: number, event: Event) {
  const target = event.target as HTMLInputElement
  const nextGateCodes = [...formGateCodes.value] as [string, string]
  nextGateCodes[index] = sanitizeGateCode(target.value)
  formGateCodes.value = nextGateCodes
}

function onEditGateInput(index: number, event: Event) {
  const target = event.target as HTMLInputElement
  const nextGateCodes = [...editGateCodes.value] as [string, string]
  nextGateCodes[index] = sanitizeGateCode(target.value)
  editGateCodes.value = nextGateCodes
}

function toggleCreateMember(memberId: string) {
  const set = new Set(formManualAccessIds.value)
  if (set.has(memberId)) set.delete(memberId)
  else set.add(memberId)
  formManualAccessIds.value = [...set]
}

function memberInitials(member: ClanMember) {
  return member.name
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase()
}

function memberAvatarStyle(member: ClanMember) {
  return {
    '--member-color': member.avatarColor ?? 'var(--accent)',
  }
}

function closeDrawer() {
  emit('close')
}

function startNameEdit() {
  if (!selectedBase.value) return
  detailsError.value = null
  editName.value = selectedBase.value.name
  isEditingName.value = true
}

function cancelNameEdit() {
  if (!selectedBase.value) return
  detailsError.value = null
  editName.value = selectedBase.value.name
  isEditingName.value = false
}

function saveName() {
  if (!selectedBase.value) return

  detailsError.value = null

  try {
    clanBaseStore.updateBase(selectedBase.value.id, {
      name: editName.value,
      structureId: selectedBase.value.structureId ?? editStructureId.value,
    })
    isEditingName.value = false
  } catch (error) {
    detailsError.value =
      error instanceof Error ? error.message : 'Não foi possível salvar o nome da base.'
  }
}

function startStructureEdit() {
  if (!selectedBase.value) return
  detailsError.value = null
  editStructureId.value = selectedBase.value.structureId ?? ''
  isEditingStructure.value = true
}

function cancelStructureEdit() {
  if (!selectedBase.value) return
  detailsError.value = null
  editStructureId.value = selectedBase.value.structureId ?? ''
  isEditingStructure.value = false
}

function saveStructure() {
  if (!selectedBase.value) return

  detailsError.value = null

  try {
    clanBaseStore.updateBase(selectedBase.value.id, {
      name: selectedBase.value.name,
      structureId: editStructureId.value,
    })
    isEditingStructure.value = false
  } catch (error) {
    detailsError.value =
      error instanceof Error ? error.message : 'Não foi possível salvar a estrutura da base.'
  }
}

function deleteSelectedBase() {
  if (!selectedBase.value) return

  const confirmed = window.confirm(`Excluir a base "${selectedBase.value.name}"?`)
  if (!confirmed) return

  if (editSaveTimeout) {
    clearTimeout(editSaveTimeout)
    editSaveTimeout = null
  }

  clanBaseStore.deleteBase(selectedBase.value.id)
}

function submitCreate() {
  if (!createDraft.value) return

  formError.value = null

  const draft: ClanBaseCreateDraft = {
    ...createDraft.value,
    name: formName.value.trim(),
    gateCodes: [...formGateCodes.value] as [string, string],
    structureId: formStructureId.value || undefined,
    isClanWide: formIsClanWide.value,
    accessMemberIds: formManualAccessIds.value,
  }

  try {
    clanBaseStore.createBase(draft)
  } catch (error) {
    formError.value = error instanceof Error ? error.message : 'Não foi possível criar a base.'
  }
}

function setClanWide(enabled: boolean) {
  if (!selectedBase.value) return
  clanBaseStore.updateBase(selectedBase.value.id, { isClanWide: enabled })
}

function grantManualAccess() {
  if (!selectedBase.value || !grantMemberId.value) return
  clanBaseStore.grantManualAccess(selectedBase.value.id, grantMemberId.value)
  grantMemberId.value = ''
}

function revokeManualAccess(memberId: string) {
  if (!selectedBase.value) return
  clanBaseStore.revokeManualAccess(selectedBase.value.id, memberId)
}

function approve(memberId: string) {
  if (!selectedBase.value) return
  clanBaseStore.approveRequest(selectedBase.value.id, memberId)
}

function reject(memberId: string) {
  if (!selectedBase.value) return
  clanBaseStore.rejectRequest(selectedBase.value.id, memberId)
}

function requestAccess() {
  if (!selectedBase.value) return
  clanBaseStore.requestAccess(selectedBase.value.id, currentMemberId.value)
}
</script>

<template>
  <aside class="base-drawer" :class="{ open: props.open }">
    <div class="drawer-header">
      <div>
        <p class="drawer-kicker">Bases do clã</p>
        <h2>
          {{ isCreateMode ? 'Nova base' : isViewMode ? 'INFORMAÇÕES DA BASE' : 'Painel de base' }}
        </h2>
      </div>
      <button type="button" class="close-btn" @click="closeDrawer">Fechar</button>
    </div>

    <div v-if="isCreateMode" class="drawer-content">
      <section class="summary-card">
        <p class="section-kicker">Rascunho</p>
        <h3>{{ formName || 'Nova base sem nome' }}</h3>
        <p class="summary-description">
          Defina a referência da base e quem já entra com acesso liberado.
        </p>
        <div class="summary-badges">
          <span class="badge">{{ createSourceLabel }}</span>
          <span class="badge accent">X {{ createDraft?.x }} / Z {{ createDraft?.z }}</span>
        </div>
      </section>

      <section class="panel-card">
        <div class="card-header">
          <div>
            <p class="card-title">Identificação</p>
            <p class="card-caption">Nome, origem e estrutura de referência.</p>
          </div>
        </div>

        <label class="field">
          <span>Nome da base</span>
          <input v-model="formName" type="text" maxlength="60" placeholder="Nome da base" />
        </label>

        <div class="field static-field">
          <span>Origem</span>
          <p>{{ createSourceLabel }} · X {{ createDraft?.x }} / Z {{ createDraft?.z }}</p>
        </div>

        <label class="field">
          <span>Estrutura de referência</span>
          <select v-model="formStructureId">
            <option value="">Selecione...</option>
            <option
              v-for="structure in clanBaseStore.structureOptions"
              :key="structure.id"
              :value="structure.id"
            >
              {{ structure.label }}
            </option>
          </select>
        </label>

        <div v-if="createStructure" class="structure-card">
          <img
            class="structure-preview"
            :src="createStructure.imageSrc"
            :alt="`Estrutura ${createStructure.label}`"
          />
          <div class="structure-meta">
            <strong>{{ createStructure.label }}</strong>
            <span>Prévia da referência visual escolhida.</span>
          </div>
        </div>
      </section>

      <section class="panel-card">
        <div class="card-header">
          <div>
            <p class="card-title">Acesso inicial</p>
            <p class="card-caption">Portões, abrangência e membros liberados na criação.</p>
          </div>
        </div>

        <div v-for="(label, index) in gateLabels" :key="label" class="field">
          <span>{{ index === 0 ? label : `${label} (opcional)` }}</span>
          <div class="code-row">
            <input
              :value="formGateCodes[index]"
              :type="showCreateCodes[index] ? 'text' : 'password'"
              inputmode="numeric"
              maxlength="6"
              placeholder="1 a 6 dígitos"
              @input="onCreateGateInput(index, $event)"
            />
            <button
              type="button"
              class="ghost-btn"
              @click="showCreateCodes[index] = !showCreateCodes[index]"
            >
              {{ showCreateCodes[index] ? 'Ocultar' : 'Revelar' }}
            </button>
          </div>
          <small class="hint">Visualização: {{ createCodePreviews[index] }}</small>
        </div>

        <button
          type="button"
          class="switch-card"
          :class="{ on: formIsClanWide }"
          @click="formIsClanWide = !formIsClanWide"
        >
          <span class="switch-copy">
            <strong>Disponibilizar para o clã inteiro</strong>
            <small>
              {{
                formIsClanWide
                  ? 'Todos os membros entram automaticamente.'
                  : 'Somente o dono e acessos liberados manualmente entram.'
              }}
            </small>
          </span>
          <span class="switch-control" :class="{ on: formIsClanWide }">
            <span class="switch-thumb" />
          </span>
        </button>

        <div class="field">
          <div class="field-head">
            <span>Acesso manual</span>
            <small>{{ formManualAccessIds.length }} selecionado(s)</small>
          </div>

          <div v-if="createMemberChoices.length > 0" class="member-grid">
            <button
              v-for="member in createMemberChoices"
              :key="member.id"
              type="button"
              class="member-pill"
              :class="{ selected: formManualAccessIds.includes(member.id) }"
              @click="toggleCreateMember(member.id)"
            >
              <span class="member-avatar" :style="memberAvatarStyle(member)">
                {{ memberInitials(member) }}
              </span>
              <span class="member-copy">
                <strong>{{ member.name }}</strong>
                <small>{{ member.role ?? member.tag ?? 'Membro' }}</small>
              </span>
            </button>
          </div>

          <p v-else class="empty-note">Nenhum outro membro disponível para liberar acesso.</p>
        </div>
      </section>

      <p v-if="formError" class="error-msg">{{ formError }}</p>

      <div class="actions">
        <button type="button" class="primary-btn" @click="submitCreate">Salvar base</button>
        <button type="button" class="ghost-btn" @click="closeDrawer">Cancelar</button>
      </div>
    </div>

    <div v-else-if="isViewMode && selectedBase" class="drawer-content">
      <section class="summary-card">
        <div class="summary-head-row">
          <p class="section-kicker">Base selecionada</p>
          <div class="summary-actions">
            <span class="badge accent">{{ selectedBaseAccessLabel }}</span>
            <button
              v-if="canManageSelectedBase"
              type="button"
              class="icon-btn danger"
              aria-label="Excluir base"
              @click="deleteSelectedBase"
            >
              <i class="fa-solid fa-trash" aria-hidden="true"></i>
            </button>
          </div>
        </div>
        <div class="summary-title-row">
          <div class="summary-title-main">
            <template v-if="canManageSelectedBase && isEditingName">
              <div class="inline-edit-row">
                <input
                  v-model="editName"
                  type="text"
                  maxlength="60"
                  placeholder="Nome da base"
                  @keydown.enter.prevent="saveName"
                  @keydown.esc.prevent="cancelNameEdit"
                />
                <button type="button" class="icon-btn confirm" @click="saveName">
                  <i class="fa-solid fa-check" aria-hidden="true"></i>
                </button>
                <button type="button" class="icon-btn" @click="cancelNameEdit">
                  <i class="fa-solid fa-xmark" aria-hidden="true"></i>
                </button>
              </div>
            </template>
            <template v-else>
              <h3>{{ selectedBase.name }}</h3>
              <button
                v-if="canManageSelectedBase"
                type="button"
                class="icon-btn subtle"
                aria-label="Editar nome da base"
                @click="startNameEdit"
              >
                <i class="fa-solid fa-pen" aria-hidden="true"></i>
              </button>
            </template>
          </div>
        </div>
        <p class="summary-description">
          {{ currentOwner?.name ?? 'Desconhecido' }} · criada em {{ selectedBaseCreatedAtLabel }}
        </p>
        <p v-if="detailsError" class="error-msg">{{ detailsError }}</p>
        <div class="summary-badges">
          <span class="badge">{{ selectedBaseSourceLabel }}</span>
          <span class="badge">X {{ selectedBase.x }} / Z {{ selectedBase.z }}</span>
          <span v-if="previewStructure" class="badge">{{ previewStructure.label }}</span>
        </div>
      </section>

      <section class="panel-card">
        <div class="card-header">
          <div>
            <p class="card-title">Informações gerais</p>
            <!-- <p class="card-caption">Resumo rápido da base e sua referência visual.</p> -->
          </div>
        </div>

        <div class="info-grid">
          <div class="info-cell">
            <span>Dono</span>
            <strong>{{ currentOwner?.name ?? 'Desconhecido' }}</strong>
          </div>
          <div class="info-cell">
            <span>Acesso</span>
            <strong>{{ selectedBaseAccessLabel }}</strong>
          </div>
          <div class="info-cell">
            <span>Origem</span>
            <strong>{{ selectedBaseSourceLabel }}</strong>
          </div>
          <div class="info-cell">
            <span>Criada em</span>
            <strong>{{ selectedBaseCreatedAtLabel }}</strong>
          </div>
        </div>

        <div v-if="previewStructure" class="structure-card">
          <button
            v-if="canManageSelectedBase"
            type="button"
            class="structure-overlay-btn"
            aria-label="Editar estrutura de referência"
            @click="startStructureEdit"
          >
            <span class="structure-overlay-scrim">
              <i class="fa-solid fa-pen" aria-hidden="true"></i>
            </span>
          </button>
          <img
            class="structure-preview"
            :src="previewStructure.imageSrc"
            :alt="`Estrutura ${previewStructure.label}`"
          />
          <div class="structure-meta">
            <strong>{{ previewStructure.label }}</strong>
          </div>
        </div>
        <div v-if="canManageSelectedBase && isEditingStructure" class="field">
          <span>Estrutura de referência</span>
          <div class="inline-edit-stack">
            <select v-model="editStructureId">
              <option value="">Selecione...</option>
              <option
                v-for="structure in clanBaseStore.structureOptions"
                :key="structure.id"
                :value="structure.id"
              >
                {{ structure.label }}
              </option>
            </select>
            <div class="inline-action-row">
              <button type="button" class="ghost-btn" @click="cancelStructureEdit">Cancelar</button>
              <button type="button" class="primary-btn" @click="saveStructure">Salvar</button>
            </div>
          </div>
        </div>
      </section>

      <template v-if="canManageSelectedBase">

        <section class="panel-card">
          <div class="card-header">
            <div>
              <p class="card-title">Portões</p>
              <p class="card-caption">Edite as senhas de entrada da base.</p>
            </div>
          </div>

          <div v-for="(label, index) in gateLabels" :key="label" class="field">
            <span>{{ index === 0 ? label : `${label} (opcional)` }}</span>
            <div class="code-row">
              <input
                :value="editGateCodes[index]"
                :type="showEditCodes[index] ? 'text' : 'password'"
                inputmode="numeric"
                maxlength="6"
                placeholder="1 a 6 dígitos"
                @input="onEditGateInput(index, $event)"
              />
              <button
                type="button"
                class="ghost-btn"
                @click="showEditCodes[index] = !showEditCodes[index]"
              >
                {{ showEditCodes[index] ? 'Ocultar' : 'Revelar' }}
              </button>
            </div>
          </div>

          <p v-if="editError" class="error-msg">{{ editError }}</p>
        </section>

        <section class="panel-card">
          <div class="card-header">
            <div>
              <p class="card-title">Permissões</p>
              <p class="card-caption">Controle acesso geral, liberações manuais e solicitações.</p>
            </div>
          </div>

          <button
            type="button"
            class="switch-card"
            :class="{ on: selectedBase.isClanWide }"
            @click="setClanWide(!selectedBase.isClanWide)"
          >
            <span class="switch-copy">
              <strong>Disponibilizar para o clã inteiro</strong>
              <small>
                {{
                  selectedBase.isClanWide
                    ? 'Todos os membros do clã já entram automaticamente.'
                    : 'Somente acessos manuais e aprovações ficam liberados.'
                }}
              </small>
            </span>
            <span class="switch-control" :class="{ on: selectedBase.isClanWide }">
              <span class="switch-thumb" />
            </span>
          </button>

          <div class="field">
            <div class="field-head">
              <span>Acesso manual</span>
              <small>{{ manualAccessMembers.length }} liberado(s)</small>
            </div>

            <div v-if="!selectedBase.isClanWide" class="inline-row">
              <select v-model="grantMemberId">
                <option value="">Adicionar membro...</option>
                <option v-for="member in availableGrantMembers" :key="member.id" :value="member.id">
                  {{ member.name }}
                </option>
              </select>
              <button
                type="button"
                class="ghost-btn"
                :disabled="!grantMemberId"
                @click="grantManualAccess"
              >
                Adicionar
              </button>
            </div>

            <p v-else class="empty-note">
              Acesso manual fica secundário enquanto a base estiver aberta para o clã inteiro.
            </p>

            <div class="list-stack">
              <div v-for="member in manualAccessMembers" :key="member.id" class="member-row">
                <div class="member-info">
                  <span class="member-avatar small" :style="memberAvatarStyle(member)">
                    {{ memberInitials(member) }}
                  </span>
                  <div class="member-meta">
                    <strong>{{ member.name }}</strong>
                    <small>{{ member.role ?? member.tag ?? 'Membro' }}</small>
                  </div>
                </div>
                <button type="button" class="danger-btn" @click="revokeManualAccess(member.id)">
                  Remover
                </button>
              </div>

              <p v-if="manualAccessMembers.length === 0" class="empty-note">
                Nenhum acesso manual concedido.
              </p>
            </div>
          </div>

          <div class="field">
            <div class="field-head">
              <span>Solicitações pendentes</span>
              <small>{{ pendingMembers.length }} aguardando</small>
            </div>

            <div class="list-stack">
              <div v-for="member in pendingMembers" :key="member.id" class="member-row">
                <div class="member-info">
                  <span class="member-avatar small" :style="memberAvatarStyle(member)">
                    {{ memberInitials(member) }}
                  </span>
                  <div class="member-meta">
                    <strong>{{ member.name }}</strong>
                    <small>{{ member.role ?? member.tag ?? 'Membro' }}</small>
                  </div>
                </div>
                <div class="inline-row compact">
                  <button type="button" class="ghost-btn" @click="approve(member.id)">
                    Aprovar
                  </button>
                  <button type="button" class="danger-btn" @click="reject(member.id)">
                    Recusar
                  </button>
                </div>
              </div>

              <p v-if="pendingMembers.length === 0" class="empty-note">
                Sem solicitações pendentes.
              </p>
            </div>
          </div>
        </section>
      </template>

      <template v-else>
        <section class="panel-card">
          <div class="card-header">
            <div>
              <p class="card-title">Quem tem acesso a essa base</p>
              <!-- <p class="card-caption">
                Lista efetiva de acesso considerando dono, clã e permissões manuais.
              </p> -->
            </div>
          </div>

          <div class="member-list">
            <div v-for="member in effectiveAccessMembers" :key="member.id" class="member-row">
              <div class="member-info">
                <span class="member-avatar small" :style="memberAvatarStyle(member)">
                  {{ memberInitials(member) }}
                </span>
                <div class="member-meta">
                  <strong>{{ member.name }}</strong>
                  <small>{{ member.role ?? member.tag ?? 'Membro' }}</small>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section v-if="canSeeSelectedBaseCode" class="panel-card">
          <div class="card-header">
            <div>
              <p class="card-title">Senhas dos portões</p>
              <p class="card-caption">Exibição protegida das senhas atuais da base.</p>
            </div>
          </div>

          <div class="code-preview-card code-preview-stack">
            <div v-for="(label, index) in gateLabels" :key="label" class="code-preview-row">
              <div>
                <span class="code-preview-label">{{ label }}</span>
                <p class="code-preview-value">{{ selectedBaseCodePreviews[index] }}</p>
              </div>
              <button
                type="button"
                class="ghost-btn"
                @click="showCurrentBaseCodes[index] = !showCurrentBaseCodes[index]"
              >
                {{ showCurrentBaseCodes[index] ? 'Ocultar' : 'Revelar' }}
              </button>
            </div>
          </div>
        </section>

        <section v-else class="panel-card panel-card-highlight">
          <div class="card-header">
            <div>
              <p class="card-title">Acesso ao portão</p>
              <p class="card-caption">Você ainda não tem permissão para visualizar a senha.</p>
            </div>
          </div>

          <div class="request-card">
            <p>
              {{
                hasPendingForCurrentMember
                  ? 'Solicitação enviada. Aguarde a aprovação do dono da base.'
                  : 'Solicite acesso para receber as senhas dessa base.'
              }}
            </p>
            <button
              v-if="!hasPendingForCurrentMember"
              type="button"
              class="primary-btn"
              @click="requestAccess"
            >
              Solicitar acesso
            </button>
          </div>
        </section>
      </template>
    </div>

    <div v-else class="drawer-content empty-state">
      <section class="summary-card">
        <p class="section-kicker">Nenhuma base ativa</p>
        <h3>Selecione uma base no mapa</h3>
        <p class="summary-description">
          Clique em uma base existente para abrir detalhes ou em uma área livre para criar uma nova.
        </p>
      </section>
    </div>
  </aside>
</template>

<style scoped>
.base-drawer {
  width: 0;
  border-left: 1px solid transparent;
  background:
    linear-gradient(
      180deg,
      color-mix(in srgb, var(--surface-hi) 32%, transparent),
      transparent 24%
    ),
    var(--surface);
  overflow: hidden;
}

.base-drawer.open {
  width: 380px;
  border-left-color: var(--border);
}

.drawer-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 14px 12px;
  border-bottom: 1px solid var(--border);
}

.drawer-content {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 12px;
  overflow-y: auto;
  height: calc(100% - 72px);
}

.drawer-kicker,
.section-kicker,
.card-title,
.field > span,
.code-preview-label {
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-subtle);
}

.drawer-header h2 {
  margin-top: 2px;
  font-size: 1rem;
  color: var(--text-hi);
}

.summary-card,
.panel-card {
  border: 1px solid var(--border);
  border-radius: 14px;
  background: color-mix(in srgb, var(--surface-hi) 44%, transparent);
}

.summary-card {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 14px;
}

.summary-card h3 {
  font-size: 1.15rem;
  color: var(--text-hi);
}

.summary-description,
.card-caption,
.hint,
.empty-note,
.request-card p {
  font-size: 0.78rem;
  line-height: 1.5;
  color: var(--text-muted);
}

.summary-head-row,
.summary-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 8px;
}

.summary-title-main,
.summary-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
}

.summary-title-main {
  flex: 1;
}

.summary-title-main h3 {
  min-width: 0;
}

.summary-title-row {
  justify-content: flex-start;
}

.summary-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.badge {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid var(--border);
  background: color-mix(in srgb, var(--bg) 36%, transparent);
  font-size: 0.72rem;
  color: var(--text);
}

.badge.accent {
  border-color: color-mix(in srgb, var(--accent) 48%, var(--border));
  background: color-mix(in srgb, var(--accent) 16%, transparent);
  color: #dbeafe;
}

.panel-card {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding: 14px;
}

.panel-card-highlight {
  border-color: color-mix(in srgb, var(--accent) 44%, var(--border));
  background: color-mix(in srgb, var(--accent) 10%, transparent);
}

.card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.card-caption {
  margin-top: 4px;
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.inline-edit-row,
.inline-action-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.inline-edit-row {
  flex: 1;
}

.inline-edit-row input {
  flex: 1;
}

.inline-edit-stack {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.field-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
}

.field-head small {
  font-size: 0.72rem;
  color: var(--text-subtle);
}

.static-field p {
  font-size: 0.86rem;
  color: var(--text);
  line-height: 1.45;
}

input,
select {
  width: 100%;
  border: 1px solid var(--border-hi);
  border-radius: 10px;
  background: color-mix(in srgb, var(--bg) 45%, transparent);
  color: var(--text);
  padding: 9px 11px;
  font-size: 0.82rem;
  transition:
    border-color 0.12s ease,
    box-shadow 0.12s ease;
}

input:focus,
select:focus {
  outline: none;
  border-color: color-mix(in srgb, var(--accent) 72%, var(--border-hi));
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 35%, transparent);
}

.code-row,
.inline-row {
  display: flex;
  align-items: center;
  gap: 8px;
}

.code-row input,
.inline-row select {
  flex: 1;
}

.inline-row.compact {
  flex: 0 0 auto;
}

.switch-card {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: color-mix(in srgb, var(--bg) 22%, transparent);
  color: var(--text);
  cursor: pointer;
  text-align: left;
  transition:
    border-color 0.12s ease,
    background 0.12s ease;
}

.switch-card.on {
  border-color: color-mix(in srgb, var(--accent) 48%, var(--border));
  background: color-mix(in srgb, var(--accent) 12%, transparent);
}

.switch-copy {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.switch-copy strong {
  font-size: 0.84rem;
  font-weight: 600;
  color: var(--text-hi);
}

.switch-copy small {
  font-size: 0.74rem;
  line-height: 1.4;
  color: var(--text-muted);
}

.switch-control {
  flex-shrink: 0;
  width: 42px;
  height: 24px;
  border-radius: 999px;
  border: 1px solid var(--border-hi);
  background: color-mix(in srgb, var(--bg) 50%, transparent);
  padding: 2px;
  display: flex;
  align-items: center;
  transition:
    background 0.12s ease,
    border-color 0.12s ease;
}

.switch-control.on {
  background: var(--accent);
  border-color: var(--accent);
}

.switch-thumb {
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #fff;
  transition: transform 0.12s ease;
}

.switch-control.on .switch-thumb {
  transform: translateX(18px);
}

.structure-card {
  position: relative;
  border: 1px solid var(--border);
  border-radius: 12px;
  overflow: hidden;
  background: color-mix(in srgb, var(--bg) 26%, transparent);
}

.structure-card-compact {
  max-width: 220px;
}

.structure-preview {
  display: block;
  width: 100%;
  aspect-ratio: 16 / 9;
  object-fit: cover;
}

.structure-overlay-btn {
  position: absolute;
  inset: 0;
  z-index: 1;
  border: 0;
  padding: 0;
  background: transparent;
  cursor: pointer;
}

.structure-overlay-scrim {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: color-mix(in srgb, #020617 46%, transparent);
  color: white;
  opacity: 0;
  transition: opacity 0.14s ease;
}

.structure-overlay-btn:hover .structure-overlay-scrim,
.structure-overlay-btn:focus-visible .structure-overlay-scrim {
  opacity: 1;
}

.structure-overlay-scrim i {
  font-size: 1rem;
}

.structure-meta {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 10px 12px 12px;
}

.structure-meta strong {
  font-size: 0.85rem;
  color: var(--text-hi);
}

.structure-meta span {
  font-size: 0.74rem;
  color: var(--text-muted);
}

.member-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.member-pill,
.member-row,
.code-preview-card,
.request-card {
  border: 1px solid var(--border);
  border-radius: 12px;
  background: color-mix(in srgb, var(--bg) 20%, transparent);
}

.member-pill {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px;
  color: var(--text);
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.12s ease,
    background 0.12s ease,
    transform 0.12s ease;
}

.member-pill:hover {
  transform: translateY(-1px);
  border-color: var(--border-hi);
}

.member-pill.selected {
  border-color: color-mix(in srgb, var(--accent) 48%, var(--border));
  background: color-mix(in srgb, var(--accent) 12%, transparent);
}

.member-avatar {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  background: color-mix(in srgb, var(--member-color) 28%, #0f172a);
  border: 1px solid color-mix(in srgb, var(--member-color) 52%, var(--border));
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-size: 0.74rem;
  font-weight: 700;
  color: color-mix(in srgb, var(--member-color) 78%, white);
  flex-shrink: 0;
}

.member-avatar.small {
  width: 32px;
  height: 32px;
  font-size: 0.7rem;
}

.member-copy,
.member-meta {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.member-copy strong,
.member-meta strong {
  font-size: 0.8rem;
  color: var(--text);
}

.member-copy small,
.member-meta small {
  font-size: 0.7rem;
  color: var(--text-subtle);
}

.list-stack,
.member-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.member-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 10px;
}

.member-info {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.info-cell {
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 10px;
  background: color-mix(in srgb, var(--bg) 18%, transparent);
}

.info-cell span {
  display: block;
  font-size: 0.68rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--text-subtle);
  margin-bottom: 6px;
}

.info-cell strong {
  font-size: 0.82rem;
  line-height: 1.35;
  color: var(--text);
}

.code-preview-card,
.request-card {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 12px;
}

.code-preview-stack {
  flex-direction: column;
  align-items: stretch;
}

.code-preview-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.code-preview-value {
  margin-top: 4px;
  font-family: 'JetBrains Mono', monospace;
  font-size: 1rem;
  color: var(--text-hi);
}

.actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.single-action {
  justify-content: flex-start;
}

.primary-btn,
.ghost-btn,
.danger-btn,
.close-btn,
.icon-btn {
  border: 1px solid var(--border-hi);
  border-radius: 10px;
  font-size: 0.78rem;
  font-weight: 600;
  line-height: 1.2;
  padding: 9px 12px;
  cursor: pointer;
  transition:
    border-color 0.12s ease,
    background 0.12s ease,
    color 0.12s ease,
    box-shadow 0.12s ease;
}

.close-btn,
.ghost-btn {
  background: color-mix(in srgb, var(--bg) 72%, transparent);
  color: var(--text);
}

.icon-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  background: color-mix(in srgb, var(--bg) 72%, transparent);
  color: var(--text);
}

.close-btn:hover,
.ghost-btn:hover,
.icon-btn:hover {
  border-color: color-mix(in srgb, var(--accent) 52%, var(--border-hi));
  background: color-mix(in srgb, var(--accent) 12%, var(--bg));
  color: var(--text-hi);
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 20%, transparent);
}

.primary-btn {
  border-color: color-mix(in srgb, var(--accent) 60%, var(--border-hi));
  background: color-mix(in srgb, var(--accent) 22%, transparent);
  color: #e0f2fe;
}

.primary-btn:hover {
  background: color-mix(in srgb, var(--accent) 30%, transparent);
}

.danger-btn {
  border-color: color-mix(in srgb, var(--danger) 52%, var(--border-hi));
  background: color-mix(in srgb, var(--danger) 10%, transparent);
  color: #fecaca;
}

.danger-btn:hover {
  background: color-mix(in srgb, var(--danger) 16%, transparent);
}

.icon-btn.confirm {
  border-color: color-mix(in srgb, var(--accent) 60%, var(--border-hi));
  background: color-mix(in srgb, var(--accent) 22%, transparent);
  color: #e0f2fe;
}

.icon-btn.confirm:hover {
  background: color-mix(in srgb, var(--accent) 30%, transparent);
}

.icon-btn.danger {
  border-color: color-mix(in srgb, var(--danger) 52%, var(--border-hi));
  background: color-mix(in srgb, var(--danger) 10%, transparent);
  color: #fecaca;
}

.icon-btn.danger:hover {
  border-color: color-mix(in srgb, var(--danger) 70%, var(--border-hi));
  background: color-mix(in srgb, var(--danger) 16%, transparent);
  color: #ffe4e6;
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--danger) 18%, transparent);
}

.icon-btn.subtle {
  width: 28px;
  height: 28px;
}

button:disabled {
  cursor: not-allowed;
  opacity: 0.5;
}

.error-msg {
  color: var(--danger);
  font-size: 0.76rem;
}

.empty-state {
  justify-content: center;
}

@media (max-width: 1180px) {
  .base-drawer.open {
    width: 340px;
  }

  .member-grid,
  .info-grid {
    grid-template-columns: 1fr;
  }
}
</style>
