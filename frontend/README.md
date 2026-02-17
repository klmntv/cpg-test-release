# CPG IDE — Frontend

React + TypeScript + Vite SPA for exploring the Code Property Graph.

## Setup

```bash
npm install
```

## Dev

```bash
npm run dev
```

Starts Vite dev server with proxy to backend `http://localhost:8080`.

## Build

```bash
npm run build
```

Artifacts are emitted to `dist/`.

## Architecture

Frontend now follows a hybrid feature-first structure:

- `src/App.tsx`: orchestration shell only (view routing + top-level composition)
- `src/app/`: app-level types/constants/utils
- `src/api/`: modular API layer (`client`, `errors`, `modules`, `index` facade)
- `src/hooks/`: stateful domain hooks
- `src/components/`: UI split by domain (`layout`, `controls`, `search`, `graph`, `sidebar`)
- `src/styles/`: global tokens and base styles only
- `*.module.css`: local component styles

## API Layer

Use `src/api/index.ts` as the public frontend API entry:

- `apiClient.graph`
- `apiClient.symbols`
- `apiClient.source`
- `apiClient.types`
- `apiClient.workbench`

A backward-compatible `api` facade is preserved for existing callsites.

## Key Hooks

- `useAppController`: top-level orchestration hook powering `App.tsx`
- `useBootstrapData`: initial package graph + saved queries
- `usePersistedViewState`: localStorage + URL synchronization
- `useSymbolSearch`: debounced symbol search with abort support
- `useCallGraph`: call graph state and reloads
- `useDataflowSlice`: dataflow slice state and reloads
- `useTypesExplorer`: types/interfaces/methods/hierarchy loading
- `useWorkbenchQuery`: query execution and result state
- `useSourceExplorer`: source + outline + xrefs + highlighting
- `useGraphViewport`: resize, force tuning, auto-fit behavior
- `useGraphData`: view-specific graph mapping

## Adding a New View

1. Extend `ViewMode` in `src/app/types.ts`.
2. Add a tab in `src/components/layout/ViewTabs.tsx`.
3. Add controls (if needed) in `src/components/controls/`.
4. Add graph mapping in `src/hooks/useGraphData.ts`.
5. Handle node interactions in `src/App.tsx`.
6. Extend detail/source rendering in sidebar components.

## Styling Rules

- Keep global styles limited to reset/tokens/background in `src/styles/`.
- Put all component styling in local CSS modules.
- Avoid reintroducing broad global selectors.
