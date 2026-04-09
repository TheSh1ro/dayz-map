# DayZ Map

Mapa interativo de Chernarus+ construído com Vue 3, TypeScript, Pinia e Leaflet. O projeto já entrega a interface de exploração do mapa, visualização de POIs/loot e um fluxo completo de cadastro e gestão de bases de clã no frontend.

Este README foi reescrito para servir como documentação funcional e técnica do projeto, com foco em orientar o desenvolvimento do backend.

## Objetivo do produto

O sistema combina dois contextos de uso:

1. **Modo edição**
   Exibe o loot map com milhares de pontos de interesse agrupados por seções e tipos. Nesse modo o usuário pode filtrar markers e transformar um POI em base cadastrável.

2. **Modo bases do clã**
   Exibe apenas as bases já cadastradas, com regras de acesso, visualização de códigos de portão, aprovação de solicitações e gestão por proprietário.

Na prática, o frontend já modela um mini sistema colaborativo para clãs de DayZ, mas hoje tudo está local ao navegador. O backend deve transformar esse comportamento em dados persistidos, multiusuário e autorizados no servidor.

## Estado atual do projeto

### Stack

- Vue 3 com Composition API e `<script setup>`
- TypeScript com tipagem estrita
- Pinia para estado global
- Leaflet 1.9.4 com `CRS.Simple`
- Vite
- Font Awesome para ícones

### Execução local

```bash
npm install
npm run dev
```

### Scripts

- `npm run dev`: ambiente local com Vite
- `npm run build`: build de produção
- `npm run preview`: preview local do build
- `npm run type-check`: checagem TypeScript
- `npm run lint`: lint com oxlint e eslint
- `npm run format`: formatação em `src/`

### Situação de persistência hoje

Atualmente não existe backend integrado.

O projeto persiste apenas no `localStorage`:

- `dayzmap:filters_v1`: visibilidade dos tipos de loot
- `dayzmap:view-mode_v1`: modo atual da tela (`edit` ou `clan-bases`)
- `dayzmap:clan-bases:v2`: membro atual e lista de bases
- `dayzmap:clan-base-filters:v1`: filtros ativos das bases

Isso significa:

- não existe autenticação real
- não existe sincronização entre usuários
- não existe auditoria
- não existe controle de concorrência
- os códigos dos portões ficam expostos no cliente

## Arquitetura atual do frontend

### Entrada e composição

- `src/main.ts`: inicializa Vue, Pinia e CSS global
- `src/App.vue`: orquestra mapa, camadas de loot e bases, sidebar, busca e drawer

### Mapa e camadas

- `src/composables/useLeafletMap.ts`
  Inicializa o Leaflet, alterna tiles, calcula coordenadas, controla labels de localidades e expõe navegação para busca.

- `src/composables/useLootmap.ts`
  Carrega o dataset `LOOTMAP`, converte posições iZurvive para coordenadas do jogo, cria markers, aplica filtros e gera o popup que permite “Definir como base”.

- `src/composables/useClanBasesLayer.ts`
  Renderiza as bases do clã como markers próprios, controla seleção e, no modo de edição, permite criar base clicando diretamente no mapa.

### Estado global

- `src/stores/mapStore.ts`
  Guarda tile atual, coordenadas do cursor, zoom, contagem de POIs, modo da tela e filtros de loot.

- `src/stores/clanBaseStore.ts`
  Guarda membros, estruturas de referência, bases, base selecionada, rascunho de criação e filtros das bases.

### Componentes principais

- `src/components/AppHeader.vue`
  Header com toggle de tile, seletor do membro atual e estatísticas.

- `src/components/AppSidebar.vue`
  Sidebar com coordenadas, alternância entre modos e filtros.

- `src/components/MapLocationSearch.vue`
  Busca textual de localidades estáticas do mapa.

- `src/components/ClanBaseDrawer.vue`
  Painel lateral com criação, edição, exclusão, concessão de acesso e aprovação de solicitações.

- `src/components/FilterSection.vue`
  Seção colapsável de filtros por categoria de loot.

- `src/components/CalibrationPanel.vue`
  Painel opcional de calibração de coordenadas.

### Dados e utilitários

- `src/data/mapLocations.ts`
  Base estática de localidades pesquisáveis e labels do mapa.

- `src/utils/mapCoordinates.ts`
  Conversão entre coordenadas iZurvive, coordenadas do jogo e coordenadas Leaflet.

- `src/config.ts`
  Constantes do mapa, URLs de tiles, metadados das seções, flags e escala.

## Fontes de dados atuais

### 1. Tiles do mapa

São carregados a partir do `xam.nu`:

- topográfico
- satélite

As URLs ficam em `src/config.ts`.

### 2. Loot map

O frontend consome um objeto global `LOOTMAP`.

Na prática, o app tenta usar:

1. `window.LOOTMAP`, se já existir
2. `/lootmap.js`, carregado dinamicamente do diretório `public`

Formato esperado:

```ts
interface LootmapData {
  static: LootmapSection[]
}

interface LootmapSection {
  name: string
  types: LootmapType[]
}

interface LootmapType {
  name: string
  objects: LootmapObject[]
}

interface LootmapObject {
  name: string
  displayName?: string
  categories?: string[]
  positions: unknown[]
}
```

### 3. Localidades pesquisáveis

As localidades da busca não vêm de API. Estão versionadas em `src/data/mapLocations.ts`.

### 4. Estruturas de referência

As estruturas de referência usadas ao cadastrar uma base são montadas a partir de imagens em:

`src/assets/images/*.webp`

O frontend gera uma lista de opções automaticamente com:

- `id`
- `label`
- `imageSrc`

## Estatísticas do dataset atual

Os valores abaixo foram extraídos do `public/lootmap.js` usado hoje pelo frontend:

- 7 seções
- 33 tipos
- 199 objetos de loot/estrutura
- 8.791 posições no total

Distribuição por seção:

| Seção | Tipos | Objetos | Posições |
| --- | ---: | ---: | ---: |
| Military | 9 | 42 | 431 |
| Medical | 3 | 4 | 37 |
| Urban | 8 | 72 | 3.629 |
| Rural | 3 | 11 | 682 |
| Industrial | 3 | 55 | 3.548 |
| Coast | 2 | 3 | 211 |
| Landmark | 5 | 12 | 253 |

Esses números são úteis para o backend estimar volume inicial de carga, serialização, cache e paginação quando o dataset deixar de ser servido apenas como arquivo estático.

## Fluxos funcionais já implementados no frontend

### 1. Alternar entre modos

O usuário pode alternar entre:

- `edit`
- `clan-bases`

Comportamento:

- em `edit`, aparecem os markers de loot e filtros por seção/tipo
- em `clan-bases`, os markers de loot saem do mapa e ficam só as bases cadastradas

### 2. Buscar localidade

O usuário digita um nome, recebe sugestões e o mapa faz `flyTo` para a localidade selecionada.

Hoje isso é 100% local, sem backend.

### 3. Criar base a partir de POI

No popup de um marker de loot existe o botão `Definir como base`.

O frontend extrai do POI:

- identificador derivado do marker
- nome
- coordenadas do jogo (`x`, `z`)
- imagem sugerida da estrutura, quando existir

Depois abre um rascunho no drawer para completar:

- nome
- estrutura de referência
- códigos de portão
- visibilidade para o clã inteiro
- acessos manuais iniciais

### 4. Criar base por clique livre no mapa

No modo de edição, clicar em uma área livre cria um rascunho com:

- `sourceType = "free"`
- coordenadas arredondadas
- nome inicial baseado em `x/z`

### 5. Editar base existente

Se o membro atual for o proprietário da base, ele pode:

- editar nome
- editar estrutura de referência
- alterar códigos de portão
- marcar a base como aberta para o clã inteiro
- conceder acesso manual
- remover acesso manual
- aprovar solicitações pendentes
- recusar solicitações pendentes
- excluir a base

### 6. Solicitar acesso

Se o usuário não for dono nem tiver acesso, ele pode solicitar acesso à base.

O frontend adiciona o `memberId` em `pendingRequestMemberIds`.

### 7. Visualizar códigos do portão

O frontend só revela os códigos se o membro atual tiver acesso efetivo:

- ser o dono
- ou a base estar aberta para o clã inteiro
- ou o membro estar em `accessMemberIds`

Hoje essa regra é aplicada apenas no cliente.

## Modelo de domínio já implícito no frontend

### Membro do clã

Tipo atual:

```ts
interface ClanMember {
  id: string
  name: string
  tag?: string
  role?: string
  avatarColor?: string
}
```

Observações:

- hoje os membros são seed fixo no frontend
- o seletor de membro no header simula login/troca de identidade
- backend deve substituir esse mecanismo por autenticação real

### Base do clã

Tipo atual:

```ts
interface ClanBase {
  id: string
  name: string
  x: number
  z: number
  sourceType: 'poi' | 'free'
  sourcePoiId?: string
  structureId?: string
  ownerMemberId: string
  gateCodes: [string, string]
  isClanWide: boolean
  accessMemberIds: string[]
  pendingRequestMemberIds: string[]
  createdAt: string
}
```

Significado dos campos:

- `id`: identificador único da base
- `name`: nome amigável
- `x` e `z`: coordenadas no grid do mapa do jogo
- `sourceType`: origem da base, a partir de um POI conhecido ou clique livre
- `sourcePoiId`: vínculo opcional com um POI do lootmap
- `structureId`: estrutura visual usada como referência
- `ownerMemberId`: dono/administrador primário da base
- `gateCodes`: até dois códigos de portão, com 1 a 6 dígitos
- `isClanWide`: libera acesso efetivo para todo o clã
- `accessMemberIds`: acessos manuais adicionais
- `pendingRequestMemberIds`: fila de solicitações
- `createdAt`: timestamp ISO

### Rascunho de criação

```ts
interface ClanBaseCreateDraft {
  name: string
  x: number
  z: number
  sourceType: 'poi' | 'free'
  sourcePoiId?: string
  structureId?: string
  gateCodes: [string, string]
  isClanWide: boolean
  accessMemberIds: string[]
}
```

Isso existe só no frontend e não precisa virar entidade persistida no backend, a menos que se queira suportar rascunhos reais.

### Estrutura de referência

Tipo atual:

```ts
interface BaseStructureOption {
  id: string
  label: string
  imageSrc: string
}
```

Hoje as estruturas são derivadas das imagens locais. Para o backend, isso pode seguir dois caminhos:

1. continuar estático no frontend
2. virar catálogo vindo da API

Se o objetivo for padronização, versionamento ou gestão administrativa, o segundo caminho é melhor.

## Regras de negócio observadas no código

Estas regras já existem no frontend e devem ser preservadas no backend.

### Validação de códigos

- `gateCodes[0]` é obrigatório
- `gateCodes[1]` é opcional
- cada código aceita apenas dígitos
- cada código tem de 1 a 6 dígitos

### Acesso efetivo a uma base

Um membro tem acesso se:

- for o proprietário
- ou `isClanWide === true`
- ou estiver em `accessMemberIds`

### Solicitação de acesso

Não deve ser criada se:

- o membro já for proprietário
- a base já for pública para o clã
- o membro já tiver acesso manual
- o membro já estiver pendente

### Concessão manual

Ao conceder acesso:

- o membro entra em `accessMemberIds`
- ele sai de `pendingRequestMemberIds`, se estiver lá

### Exclusão de base

- remove a base do conjunto visível
- se a base estava selecionada, o drawer fecha

### Vínculo com POI

Quando uma base nasce de POI:

- `sourceType = "poi"`
- `sourcePoiId` é preenchido
- aquele POI deixa de ficar disponível para gerar outra base no modo de edição

Essa regra é importante para o backend: deve existir unicidade lógica para evitar múltiplas bases apontando para o mesmo `sourcePoiId`, ao menos dentro do mesmo contexto de clã.

## Mapa e coordenadas

### Dimensão

O mapa usa Chernarus+ com escala:

- `MAP_M = 15360`
- área aproximada: `15.36 x 15.36 km`

### Conversões

O projeto trabalha com três espaços de coordenadas:

1. coordenada iZurvive/lootmap
2. coordenada do jogo (`x`, `z`)
3. coordenada Leaflet (`lat`, `lng` em `CRS.Simple`)

Constantes principais em `src/config.ts`:

```ts
export const MAP_M = 15360
export const S = 256 / MAP_M
```

Conversão jogo -> Leaflet:

```ts
lat = (z - MAP_M) * S
lng = x * S
```

O backend não precisa servir coordenadas Leaflet. O ideal é trabalhar sempre com `x/z` como fonte oficial e deixar a conversão visual no frontend.

## O que o backend precisa resolver

### Problemas atuais

- todos os dados de bases ficam no navegador do usuário
- não existe identidade/autorização real
- dois usuários não enxergam o mesmo estado
- o seletor de membro do header é apenas simulação
- pedidos de acesso e aprovações não têm trilha de auditoria
- senhas dos portões ficam no cliente

### Responsabilidades esperadas do backend

- autenticar usuários reais
- modelar clãs e associação usuário-clã
- persistir bases
- persistir membros com acesso e solicitações pendentes
- aplicar autorização no servidor
- impedir duplicidade de base por POI
- registrar timestamps e, idealmente, auditoria
- entregar consultas filtráveis para o mapa

## Proposta de modelagem para o backend

Esta seção é uma proposta, não um contrato já existente no código.

### Entidades mínimas

#### `users`

- `id`
- `display_name`
- `email` ou outro identificador de login
- `avatar_color`
- `created_at`
- `updated_at`

#### `clans`

- `id`
- `name`
- `tag`
- `created_at`
- `updated_at`

#### `clan_memberships`

- `id`
- `clan_id`
- `user_id`
- `role`
- `status`
- `created_at`

#### `base_structures`

- `id`
- `label`
- `image_url`
- `is_active`
- `created_at`

#### `bases`

- `id`
- `clan_id`
- `name`
- `x`
- `z`
- `source_type`
- `source_poi_id`
- `structure_id`
- `owner_user_id`
- `gate_code_1`
- `gate_code_2`
- `is_clan_wide`
- `created_at`
- `updated_at`
- `deleted_at` opcional para soft delete

#### `base_access`

- `id`
- `base_id`
- `user_id`
- `granted_by_user_id`
- `created_at`

#### `base_access_requests`

- `id`
- `base_id`
- `user_id`
- `status` (`pending`, `approved`, `rejected`, `cancelled`)
- `requested_at`
- `resolved_at`
- `resolved_by_user_id`

#### `base_audit_logs` opcional, mas recomendado

- `id`
- `base_id`
- `actor_user_id`
- `event_type`
- `payload_json`
- `created_at`

### Observações importantes

- `gate_code_1` e `gate_code_2` não deveriam ficar apenas em texto puro no cliente
- se a aplicação precisa mostrar o código novamente, hash irreversível não resolve sozinho
- o ideal é criptografia em repouso no backend e autorização server-side antes de revelar os códigos
- `source_poi_id` deve ter restrição de unicidade por clã, se a regra for “um POI gera no máximo uma base por clã”

## Contratos de API sugeridos

O frontend ainda não consome esses endpoints. A lista abaixo é a sugestão mais alinhada ao comportamento já implementado.

### Autenticação e sessão

- `POST /auth/login`
- `POST /auth/logout`
- `GET /auth/me`

Resposta de `GET /auth/me`:

```json
{
  "user": {
    "id": "u1",
    "displayName": "Gabriel"
  },
  "clan": {
    "id": "c1",
    "name": "KZT",
    "tag": "KZT"
  },
  "membership": {
    "role": "leader"
  }
}
```

### Membros do clã

- `GET /clans/:clanId/members`

Resposta sugerida:

```json
[
  {
    "id": "u1",
    "name": "Gabriel",
    "tag": "KZT",
    "role": "Líder",
    "avatarColor": "#f59e0b"
  }
]
```

### Estruturas de referência

- `GET /base-structures`

### Bases

- `GET /clans/:clanId/bases`
- `POST /clans/:clanId/bases`
- `GET /clans/:clanId/bases/:baseId`
- `PATCH /clans/:clanId/bases/:baseId`
- `DELETE /clans/:clanId/bases/:baseId`

Payload sugerido para criação:

```json
{
  "name": "Forte Vybor",
  "x": 4800,
  "z": 7800,
  "sourceType": "poi",
  "sourcePoiId": "lms_Urban_house:foo:123",
  "structureId": "land_house_1w10",
  "gateCodes": ["4521", "7788"],
  "isClanWide": false,
  "accessMemberIds": ["u2"]
}
```

Resposta sugerida:

```json
{
  "id": "base_123",
  "name": "Forte Vybor",
  "x": 4800,
  "z": 7800,
  "sourceType": "poi",
  "sourcePoiId": "lms_Urban_house:foo:123",
  "structureId": "land_house_1w10",
  "ownerMemberId": "u1",
  "gateCodes": ["4521", "7788"],
  "isClanWide": false,
  "accessMemberIds": ["u2"],
  "pendingRequestMemberIds": [],
  "createdAt": "2026-04-09T18:00:00.000Z"
}
```

### Solicitações de acesso

- `POST /clans/:clanId/bases/:baseId/access-requests`
- `POST /clans/:clanId/bases/:baseId/access-requests/:requestId/approve`
- `POST /clans/:clanId/bases/:baseId/access-requests/:requestId/reject`

### Acessos manuais

- `POST /clans/:clanId/bases/:baseId/access-members`
- `DELETE /clans/:clanId/bases/:baseId/access-members/:userId`

### Revelação de códigos do portão

Há dois caminhos possíveis:

1. incluir `gateCodes` no payload da base apenas para usuários autorizados
2. expor um endpoint separado para leitura protegida

Sugestão mais segura:

- `GET /clans/:clanId/bases/:baseId/gate-codes`

Resposta:

```json
{
  "gateCodes": ["4521", "7788"]
}
```

Se o usuário não tiver acesso, o backend deve responder `403`.

## Contrato de leitura ideal para o frontend

Se o frontend continuar usando a tipagem atual, o backend pode devolver um formato muito próximo do store:

```ts
type ClanBaseResponse = {
  id: string
  name: string
  x: number
  z: number
  sourceType: 'poi' | 'free'
  sourcePoiId?: string
  structureId?: string
  ownerMemberId: string
  gateCodes?: [string, string]
  isClanWide: boolean
  accessMemberIds: string[]
  pendingRequestMemberIds: string[]
  createdAt: string
}
```

Observação:

- `gateCodes` pode ser omitido em listagens se o usuário não tiver acesso
- em listagens grandes, talvez seja melhor não enviar `pendingRequestMemberIds` completos para todos os usuários, apenas contadores

## Integrações que o backend não precisa assumir inicialmente

### Loot map

Hoje o loot map já funciona a partir de arquivo estático local. Portanto, o backend pode ser desenvolvido em fases:

1. primeiro entregar autenticação, membros e bases
2. depois decidir se o dataset de loot continua estático ou passa a ser servido/versionado via API

### Localidades do mapa

A busca textual de localidades pode continuar totalmente no frontend por enquanto.

## Riscos e decisões de produto

### 1. Identidade atual é simulada

O seletor de “membro” no header não representa login real. Isso precisa ser substituído por sessão/autenticação no backend.

### 2. Códigos de portão são sensíveis

No estado atual eles ficam em memória e `localStorage`. Em produção, isso é insuficiente.

### 3. Concorrência

Hoje não existe problema de concorrência porque tudo é local. Com backend, vale prever:

- edição simultânea de base
- aprovação simultânea da mesma solicitação
- exclusão enquanto outro usuário está visualizando

Se quiser robustez mínima:

- use `updated_at` para controle otimista
- valide transições de estado no servidor

### 4. Unicidade de POI

O frontend já bloqueia visualmente POIs usados para criar base. O backend deve validar isso no banco, não apenas confiar na UI.

## O que ainda não existe

- autenticação real
- usuários persistidos
- clãs persistidos
- integração HTTP
- paginação
- auditoria
- testes automatizados para regras de negócio
- sincronização em tempo real

## Sugestão de ordem de implementação do backend

### Fase 1

- autenticação
- usuário atual
- clã atual
- listagem de membros
- CRUD de bases
- concessão e remoção de acessos
- solicitação, aprovação e rejeição de acesso

### Fase 2

- auditoria
- criptografia dos códigos
- soft delete
- filtros e paginação server-side
- catálogo de estruturas vindo da API

### Fase 3

- WebSocket ou SSE para atualização em tempo real
- administração de múltiplos clãs
- gestão do lootmap pelo servidor

## Estrutura do repositório

```text
.
├── public/
│   └── lootmap.js                # dataset LOOTMAP usado em runtime
├── src/
│   ├── assets/
│   │   ├── images/              # imagens de estruturas/POIs
│   │   └── main.css             # tema global
│   ├── components/              # UI principal
│   ├── composables/             # mapa, lootmap, calibração, camada de bases
│   ├── data/
│   │   └── mapLocations.ts      # localidades estáticas para busca e labels
│   ├── stores/
│   │   ├── clanBaseStore.ts     # domínio principal das bases
│   │   └── mapStore.ts          # estado de mapa, modo e filtros
│   ├── types/
│   │   ├── clanBase.ts          # tipos de bases e membros
│   │   └── index.ts             # tipos compartilhados do mapa/loot
│   ├── utils/
│   │   └── mapCoordinates.ts    # conversões de coordenadas
│   ├── App.vue                  # composição principal
│   ├── config.ts                # constantes e feature flags
│   └── main.ts                  # bootstrap
├── lootmap.js                   # cópia local do dataset
├── index.html
├── package.json
└── vite.config.ts
```

## Resumo para quem vai desenvolver o backend

Se você vai começar o backend agora, trate estas três coisas como contrato funcional já estabelecido pelo frontend:

1. existe uma entidade central chamada **base do clã**
2. existe uma regra de **acesso efetivo** baseada em dono, clã inteiro ou concessão manual
3. existe um fluxo de **solicitação e aprovação de acesso** que já está refletido na UI

O frontend já está pronto para consumir um backend com:

- usuário autenticado
- lista de membros
- catálogo de estruturas
- CRUD de bases
- gestão de permissões de acesso
- proteção de leitura dos códigos de portão

Enquanto isso não existir, o sistema continuará funcionando apenas como experiência local no navegador.
