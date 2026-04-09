export interface ClanMember {
  id: string
  name: string
  tag?: string
  role?: string
  avatarColor?: string
}

export interface BaseStructureOption {
  id: string
  label: string
  imageSrc: string
}

export interface ClanBase {
  id: string
  name: string
  x: number
  z: number
  sourceType: 'poi' | 'free'
  sourcePoiId?: string
  structureId?: string
  ownerMemberId: string
  gateCode: string
  isClanWide: boolean
  accessMemberIds: string[]
  pendingRequestMemberIds: string[]
  createdAt: string
}

export interface ClanBaseCreateDraft {
  name: string
  x: number
  z: number
  sourceType: 'poi' | 'free'
  sourcePoiId?: string
  structureId?: string
  gateCode: string
  isClanWide: boolean
  accessMemberIds: string[]
}

export interface StartCreateFromPoiPayload {
  poiId: string
  poiName: string
  x: number
  z: number
  structureImageSrc?: string
}
