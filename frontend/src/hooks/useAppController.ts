import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { api } from '../api';
import type {
  FunctionDetail,
  HotspotRow,
  ImpactRow,
  PackageFunction,
  Symbol,
} from '../api';
import type {
  CallDirection,
  DataflowDirection,
  GraphNode,
  ModuleKey,
  PersistedState,
  SidebarTab,
  ViewMode,
} from '../app/types';
import { clamp } from '../app/utils';
import { useBootstrapData } from './useBootstrapData';
import { useCallGraph } from './useCallGraph';
import { useDataflowSlice } from './useDataflowSlice';
import { useGraphData } from './useGraphData';
import { useGraphViewport } from './useGraphViewport';
import { useInitialPersistedViewState, usePersistedViewState } from './usePersistedViewState';
import { useSourceExplorer } from './useSourceExplorer';
import { useSymbolSearch } from './useSymbolSearch';
import { useTypesExplorer } from './useTypesExplorer';
import { useWorkbenchQuery } from './useWorkbenchQuery';

export function useAppController() {
  const { persisted, urlParams } = useInitialPersistedViewState();
  const initialJumpDoneRef = useRef(false);

  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [viewMode, setViewMode] = useState<ViewMode>((urlParams.get('view') as ViewMode) || persisted.viewMode || 'packages');
  const [sidebarTab, setSidebarTab] = useState<SidebarTab>('detail');

  const [selectedPackage, setSelectedPackage] = useState<string | null>(null);
  const [packageFunctions, setPackageFunctions] = useState<PackageFunction[]>([]);
  const [packageFunctionsLoading, setPackageFunctionsLoading] = useState(false);

  const [topN, setTopN] = useState(clamp(persisted.topN ?? 120, 40, 280));
  const [minEdgeWeight, setMinEdgeWeight] = useState(clamp(persisted.minEdgeWeight ?? 3, 1, 24));
  const [packageModuleFilter, setPackageModuleFilter] = useState<ModuleKey | 'all'>(persisted.packageModuleFilter ?? 'all');
  const [packageNameFilter, setPackageNameFilter] = useState(persisted.packageNameFilter ?? '');

  const [detail, setDetail] = useState<FunctionDetail | null>(null);
  const [hotspots, setHotspots] = useState<HotspotRow[]>([]);
  const [impactRows, setImpactRows] = useState<ImpactRow[]>([]);
  const [impactRootID, setImpactRootID] = useState<string | null>(null);
  const [impactDepth, setImpactDepth] = useState(8);

  const [hoverNodeID, setHoverNodeID] = useState<string | null>(null);
  const [hoverLabelsOnly, setHoverLabelsOnly] = useState(true);

  const bootstrap = useBootstrapData(setError);

  const {
    callNodes,
    callEdges,
    callRootID,
    callDirection,
    callMaxDepth,
    callMaxNodes,
    callTruncated,
    setCallDirection,
    setCallMaxDepth,
    setCallMaxNodes,
    loadCallGraph,
    refreshCallGraph,
    clearCallGraph,
  } = useCallGraph({
    initialDirection: persisted.callDirection,
    initialMaxDepth: persisted.callMaxDepth,
    initialMaxNodes: persisted.callMaxNodes,
    onBusy: setBusy,
    onError: setError,
  });

  const {
    dataflowNodes,
    dataflowEdges,
    dataflowRootID,
    dataflowDirection,
    dataflowMaxDepth,
    setDataflowDirection,
    setDataflowMaxDepth,
    loadDataflowSlice,
    refreshDataflow,
    clearDataflow,
  } = useDataflowSlice({
    initialDirection: persisted.dataflowDirection,
    initialMaxDepth: persisted.dataflowMaxDepth,
    initialRootID: urlParams.get('node') || null,
    onBusy: setBusy,
    onError: setError,
  });

  const {
    source,
    sourceOutline,
    highlightLines,
    activeLine,
    xrefs,
    setActiveLine,
    setHighlightLines,
    setXrefs,
    openSourceWithLines,
    loadXrefsForDef,
    clearSource,
  } = useSourceExplorer({
    onBusy: setBusy,
    onError: setError,
  });

  const {
    searchQuery,
    setSearchQuery,
    searchKind,
    setSearchKind,
    searchPackageFilter,
    setSearchPackageFilter,
    searchSignatureFilter,
    setSearchSignatureFilter,
    symbolSearching,
    symbols,
    runSearchNow,
  } = useSymbolSearch({
    initialKind: persisted.searchKind,
    initialPackageFilter: persisted.searchPackageFilter,
    initialSignatureFilter: persisted.searchSignatureFilter,
    onError: setError,
  });

  const {
    typeQuery,
    setTypeQuery,
    typeInterfaces,
    selectedTypeName,
    setSelectedTypeName,
    typeMethods,
    typeHierarchy,
    refreshTypeQuery,
  } = useTypesExplorer({
    viewMode,
    onBusy: setBusy,
    onError: setError,
  });

  const {
    selectedQueryName,
    setSelectedQueryName,
    queryParamText,
    setQueryParamText,
    queryLimit,
    setQueryLimit,
    queryResult,
    executeSelectedQuery,
  } = useWorkbenchQuery({
    queries: bootstrap.queries,
    onBusy: setBusy,
    onError: setError,
  });

  const clearContextForGraph = useCallback(() => {
    setSelectedPackage(null);
    setPackageFunctions([]);
    setDetail(null);
    setXrefs([]);
  }, [setXrefs]);

  const loadFunctionDetail = useCallback(async (functionID: string) => {
    try {
      const response = await api.getFunctionDetail(functionID);
      setDetail(response);
      setError(null);
      return response;
    } catch (err) {
      setError((err as Error).message);
      return null;
    }
  }, []);

  const openSourceInSidebar = useCallback(
    async (file: string, lines: Array<number | null | undefined>, focusLine: number | null = null) => {
      setSidebarTab('source');
      await openSourceWithLines(file, lines, focusLine);
    },
    [openSourceWithLines]
  );

  const openCallGraph = useCallback(
    async (
      functionID: string,
      opts?: {
        direction?: CallDirection;
        maxDepth?: number;
        maxNodes?: number;
      }
    ) => {
      setError(null);
      setViewMode('calls');
      clearContextForGraph();
      const response = await loadCallGraph(functionID, opts);
      if (!response) return;

      const functionDetail = await loadFunctionDetail(functionID);
      if (functionDetail?.file) {
        await openSourceInSidebar(functionDetail.file, [functionDetail.line], functionDetail.line);
      }
    },
    [clearContextForGraph, loadCallGraph, loadFunctionDetail, openSourceInSidebar]
  );

  const openDataflowSlice = useCallback(
    async (nodeID: string, direction: DataflowDirection) => {
      setError(null);
      setViewMode('dataflow');
      clearContextForGraph();

      const response = await loadDataflowSlice(nodeID, direction);
      if (!response) return;

      const root = response.nodes.find((node) => node.id === response.root_id) ?? response.nodes[0];
      if (!root?.file) return;

      const lines = response.nodes.filter((node) => node.file === root.file).map((node) => node.line);
      await openSourceInSidebar(root.file, lines, root.line ?? null);
    },
    [clearContextForGraph, loadDataflowSlice, openSourceInSidebar]
  );

  const loadPackageFunctions = useCallback(async (pkg: string) => {
    try {
      setPackageFunctionsLoading(true);
      const rows = await api.getFunctionsByPackage(pkg);
      setPackageFunctions(rows || []);
      setError(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPackageFunctionsLoading(false);
    }
  }, []);

  const onPackageNodeClick = useCallback(
    async (pkg: string) => {
      setViewMode('packages');
      setSelectedPackage(pkg);
      clearCallGraph();
      clearDataflow();
      clearSource();
      setDetail(null);
      setXrefs([]);
      await loadPackageFunctions(pkg);
    },
    [clearCallGraph, clearDataflow, clearSource, loadPackageFunctions, setXrefs]
  );

  const runImpact = useCallback(
    async (functionID: string) => {
      try {
        setBusy('Computing impact...');
        setError(null);
        setViewMode('impact');
        setImpactRootID(functionID);
        const rows = await api.getImpact(functionID, impactDepth, 350);
        setImpactRows(rows);
      } catch (err) {
        setError((err as Error).message);
      } finally {
        setBusy(null);
      }
    },
    [impactDepth]
  );

  const runSelectedWorkbenchQuery = useCallback(async () => {
    await executeSelectedQuery();
    setViewMode('workbench');
  }, [executeSelectedQuery]);

  const loadDefaultCallGraph = useCallback(async () => {
    const directCandidate =
      detail?.function_id ||
      packageFunctions[0]?.function_id ||
      symbols.find((symbol) => symbol.kind === 'function')?.id ||
      hotspots[0]?.function_id ||
      null;

    if (directCandidate) {
      await openCallGraph(directCandidate);
      return;
    }

    try {
      setBusy('Finding seed function...');
      const rows = await api.getHotspots(8);
      setBusy(null);

      if (rows.length > 0) {
        setHotspots((prev) => (prev.length > 0 ? prev : rows));
        await openCallGraph(rows[0].function_id);
        return;
      }

      setViewMode('calls');
    } catch (err) {
      setError((err as Error).message);
      setBusy(null);
      setViewMode('calls');
    }
  }, [detail?.function_id, hotspots, openCallGraph, packageFunctions, symbols]);

  const switchToPackages = useCallback(() => {
    setViewMode('packages');
    clearCallGraph();
    clearDataflow();
    setDetail(null);
    setXrefs([]);
  }, [clearCallGraph, clearDataflow, setXrefs]);

  const switchView = useCallback(
    (mode: ViewMode) => {
      if (mode === 'calls' && !callRootID) {
        void loadDefaultCallGraph();
        return;
      }

      setViewMode(mode);

      if (mode === 'hotspots' && hotspots.length === 0) {
        setBusy('Loading hotspots...');
        api
          .getHotspots(80)
          .then((rows) => {
            setHotspots(rows);
            setError(null);
          })
          .catch((err) => setError((err as Error).message))
          .finally(() => setBusy(null));
      }

      if (mode === 'workbench' && queryResult === null && selectedQueryName) {
        void runSelectedWorkbenchQuery();
      }
    },
    [callRootID, hotspots.length, loadDefaultCallGraph, queryResult, runSelectedWorkbenchQuery, selectedQueryName]
  );

  const goFromSourceLine = useCallback(
    (lineNo: number) => {
      if (!source) return;
      setActiveLine(lineNo);

      const hit = sourceOutline
        .filter((row) => row.start_line <= lineNo && row.end_line >= lineNo)
        .sort((a, b) => a.end_line - a.start_line - (b.end_line - b.start_line))[0];

      if (!hit) return;

      if (hit.kind.includes('function') || hit.kind.includes('method')) {
        void openCallGraph(hit.id);
        return;
      }

      void loadXrefsForDef(hit.id, 300).then((rows) => {
        const lines = rows.filter((row) => row.use_file === source.file).map((row) => row.use_line);
        if (lines.length > 0) {
          setHighlightLines(Array.from(new Set([lineNo, ...lines])));
        }
        setSidebarTab('detail');
      });
    },
    [loadXrefsForDef, openCallGraph, setActiveLine, setHighlightLines, source, sourceOutline]
  );

  const onDataflowNodeClick = useCallback(
    async (nodeID: string) => {
      const picked = dataflowNodes.find((node) => node.id === nodeID);
      if (!picked?.file) return;

      const lines = dataflowNodes.filter((node) => node.file === picked.file).map((node) => node.line);
      await openSourceInSidebar(picked.file, lines, picked.line ?? null);
    },
    [dataflowNodes, openSourceInSidebar]
  );

  const onGraphNodeClick = useCallback(
    (node: GraphNode) => {
      if (viewMode === 'packages') {
        void onPackageNodeClick(node.id);
        return;
      }

      if (viewMode === 'calls') {
        if (node.kind === 'function') void openCallGraph(node.id);
        return;
      }

      if (viewMode === 'dataflow') {
        void onDataflowNodeClick(node.id);
        return;
      }

      if (viewMode === 'hotspots' || viewMode === 'impact') {
        if (node.kind === 'function') void openCallGraph(node.id);
        return;
      }

      if (viewMode === 'types') {
        if (node.typeName) {
          setSelectedTypeName(node.typeName);
          setViewMode('types');
        }
        return;
      }

      if (viewMode === 'workbench') {
        if (node.kind === 'function') void openCallGraph(node.id);
      }
    },
    [onDataflowNodeClick, onPackageNodeClick, openCallGraph, setSelectedTypeName, viewMode]
  );

  const onSymbolClick = useCallback(
    (symbol: Symbol) => {
      if (symbol.kind === 'function') {
        void openCallGraph(symbol.id);
      } else {
        void openDataflowSlice(symbol.id, dataflowDirection);
      }
    },
    [dataflowDirection, openCallGraph, openDataflowSlice]
  );

  useEffect(() => {
    if (initialJumpDoneRef.current || bootstrap.loading) return;
    initialJumpDoneRef.current = true;

    const functionFromURL = urlParams.get('function');
    const nodeFromURL = urlParams.get('node');

    if (functionFromURL) {
      void openCallGraph(functionFromURL);
      return;
    }

    if (nodeFromURL) {
      void openDataflowSlice(nodeFromURL, dataflowDirection);
    }
  }, [bootstrap.loading, dataflowDirection, openCallGraph, openDataflowSlice, urlParams]);

  const persistedState: PersistedState = useMemo(
    () => ({
      viewMode,
      topN,
      minEdgeWeight,
      packageModuleFilter,
      packageNameFilter,
      callDirection,
      callMaxDepth,
      callMaxNodes,
      dataflowDirection,
      dataflowMaxDepth,
      searchKind,
      searchPackageFilter,
      searchSignatureFilter,
    }),
    [
      callDirection,
      callMaxDepth,
      callMaxNodes,
      dataflowDirection,
      dataflowMaxDepth,
      minEdgeWeight,
      packageModuleFilter,
      packageNameFilter,
      searchKind,
      searchPackageFilter,
      searchSignatureFilter,
      topN,
      viewMode,
    ]
  );

  usePersistedViewState({
    state: persistedState,
    viewMode,
    callRootID,
    dataflowRootID,
  });

  const { graphData, isEmpty } = useGraphData({
    viewMode,
    packageGraph: bootstrap.packageGraph,
    topN,
    minEdgeWeight,
    packageModuleFilter,
    packageNameFilter,
    callNodes,
    callEdges,
    callRootID,
    dataflowNodes,
    dataflowEdges,
    dataflowRootID,
    hotspots,
    impactRows,
    impactRootID,
    typeInterfaces,
    typeHierarchy,
    queryResult,
  });

  const { fgRef, graphAreaRef, graphSize, fitGraphToViewport, onEngineStop } = useGraphViewport({
    viewMode,
    graphData,
    isEmpty,
  });

  const focusIDs = useMemo(() => {
    if (!hoverNodeID) return new Set<string>();

    const ids = new Set<string>([hoverNodeID]);
    for (const link of graphData.links) {
      const source = typeof link.source === 'string' ? link.source : link.source.id;
      const target = typeof link.target === 'string' ? link.target : link.target.id;
      if (source === hoverNodeID) ids.add(target);
      if (target === hoverNodeID) ids.add(source);
    }
    return ids;
  }, [graphData.links, hoverNodeID]);

  const highlightSet = useMemo(() => new Set(highlightLines), [highlightLines]);

  const callSeedFunctions = useMemo(() => {
    const seeds = new Map<string, { id: string; name: string; package?: string }>();

    if (detail) {
      seeds.set(detail.function_id, {
        id: detail.function_id,
        name: detail.name,
        package: detail.package,
      });
    }

    for (const row of hotspots.slice(0, 18)) {
      seeds.set(row.function_id, {
        id: row.function_id,
        name: row.name,
        package: row.package,
      });
    }

    for (const fn of packageFunctions.slice(0, 24)) {
      seeds.set(fn.function_id, {
        id: fn.function_id,
        name: fn.name,
      });
    }

    for (const symbol of symbols) {
      if (symbol.kind !== 'function') continue;
      seeds.set(symbol.id, {
        id: symbol.id,
        name: symbol.name,
        package: symbol.package,
      });
      if (seeds.size >= 42) break;
    }

    return Array.from(seeds.values());
  }, [detail, hotspots, packageFunctions, symbols]);

  const resetGraphView = useCallback(() => {
    fgRef.current?.d3ReheatSimulation();
    fitGraphToViewport(560, 98);
  }, [fgRef, fitGraphToViewport]);

  const dismissError = useCallback(() => setError(null), []);

  return {
    // errors + busy
    error,
    dismissError,
    busy,

    // layout
    viewMode,
    switchView,
    sidebarTab,
    setSidebarTab,

    // header search
    searchQuery,
    setSearchQuery,
    runSearchNow,
    symbolSearching,
    searchKind,
    setSearchKind,
    searchPackageFilter,
    setSearchPackageFilter,
    searchSignatureFilter,
    setSearchSignatureFilter,

    // header controls shared
    hoverLabelsOnly,
    setHoverLabelsOnly,
    resetGraphView,

    // package controls
    topN,
    setTopN,
    minEdgeWeight,
    setMinEdgeWeight,
    packageModuleFilter,
    setPackageModuleFilter,
    packageNameFilter,
    setPackageNameFilter,

    // calls controls
    callDirection,
    setCallDirection,
    callMaxDepth,
    setCallMaxDepth,
    callMaxNodes,
    setCallMaxNodes,
    callRootID,
    callTruncated,
    refreshCallGraph,
    loadDefaultCallGraph,
    callSeedFunctions,
    callNodes,
    callEdges,
    openCallGraph,

    // dataflow controls
    dataflowDirection,
    setDataflowDirection,
    dataflowMaxDepth,
    setDataflowMaxDepth,
    dataflowRootID,
    refreshDataflow,

    // impact controls
    impactDepth,
    setImpactDepth,
    detail,
    runImpact,

    // types controls
    typeQuery,
    setTypeQuery,
    refreshTypeQuery,

    // workbench controls
    queries: bootstrap.queries,
    selectedQueryName,
    setSelectedQueryName,
    queryLimit,
    setQueryLimit,
    queryParamText,
    setQueryParamText,
    runSelectedWorkbenchQuery,

    // common actions
    switchToPackages,

    // graph area
    loading: bootstrap.loading,
    isEmpty,
    graphData,
    graphSize,
    graphAreaRef,
    fgRef,
    hoverNodeID,
    setHoverNodeID,
    focusIDs,
    onGraphNodeClick,
    onEngineStop,

    // sidebar detail data
    packageFunctionsLoading,
    packageFunctions,
    selectedPackage,
    dataflowNodes,
    dataflowEdges,
    hotspots,
    impactRows,
    typeInterfaces,
    selectedTypeName,
    typeMethods,
    queryResult,
    xrefs,
    symbols,

    // sidebar detail actions
    onDataflowNodeClick,
    openSourceInSidebar,
    onSymbolClick,

    // source tab
    source,
    highlightSet,
    activeLine,
    goFromSourceLine,
  };
}
