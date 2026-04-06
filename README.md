# DayZ Map — Vue 3 + TypeScript + Pinia

Mapa interativo de Chernarus+ com overlay de loot, construído com Vue 3 Composition API, TypeScript e Pinia.

## Stack

- **Vue 3** — Composition API com `<script setup>`
- **TypeScript** — tipagem estrita em todo o projeto
- **Pinia** — gerenciamento de estado; visibilidade dos filtros persistida no `localStorage`
- **Leaflet 1.9.4** — mapa interativo com CRS.Simple
- **Vite** — bundler

## Estrutura

```
src/
├── config.ts                  # Feature flags + constantes (tiles, tiers, seções)
├── main.ts                    # Entrada da aplicação
├── App.vue                    # Componente raiz; conecta mapa e lootmap
├── assets/main.css            # Tema dark global + overrides Leaflet
├── types/index.ts             # Interfaces TypeScript
├── stores/
│   └── mapStore.ts            # Pinia store — tile, coords, zoom, filtros (persistidos)
├── composables/
│   ├── useLeafletMap.ts       # Inicialização do mapa, tiles, coords HUD
│   ├── useLootmap.ts          # Fetch de dados, criação de markers, gestão de layers
│   └── useCalibration.ts      # Estado de calibração (singleton reativo)
└── components/
    ├── AppHeader.vue           # Barra superior — logo, toggle de tile, stats
    ├── AppSidebar.vue          # Sidebar — coords, header de filtros, toggle all
    ├── FilterSection.vue       # Seção colapsável com tipos de loot
    └── CalibrationPanel.vue   # Painel de calibração de 2 pontos (condicional)
```

## Instalação

```bash
npm install
npm run dev
```

## Funcionalidades

### Filtros com persistência
O estado de visibilidade de cada tipo de marcador é salvo automaticamente no `localStorage`
via Pinia (`dayzmap:filters_v1`). Ao recarregar a página, o estado é restaurado.

**Padrão:** apenas os tipos da seção **Urban** ficam visíveis na primeira abertura.

### Toggle All
Botão no cabeçalho da sidebar que ativa/desativa todos os filtros de uma vez.
Cada seção também possui seu próprio toggle individual (pill switch).

### Tile: Satélite como padrão
A visão de satélite é carregada por padrão. Alterne para Topográfico pelo toggle no header.

### Módulo de Calibração
Desativado por padrão. Para habilitar, edite `src/config.ts`:

```ts
export const SHOW_CALIBRATION = true
```

O painel aparece na base da sidebar e permite calibrar a projeção de 2 pontos entre
as coordenadas iZurvive (lat/lng) e as coordenadas do jogo (X/Z).

### Fallback de dados
1. Tenta buscar o JSON do iZurvive via `fetch`
2. Se bloqueado por CORS, tenta carregar `lootmap.js` local com `const LOOTMAP = {...};`
3. Exibe mensagem de erro com instruções caso ambos falhem

## Coordenadas

```
Chernarus+: x=0 (oeste) → 15360 (leste) | z=0 (sul) → 15360 (norte)
CRS.Simple:  lng = x * S | lat = (z − MAP_M) * S   onde S = 256/15360
```
