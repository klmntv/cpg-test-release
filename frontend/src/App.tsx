import { useEffect, useMemo, useRef, useState } from 'react';
import styles from './App.module.css';
import { AppHeader } from './components/layout/AppHeader';
import { ContextTrail } from './components/layout/ContextTrail';
import { GraphCanvas } from './components/graph/GraphCanvas';
import { Sidebar } from './components/sidebar/Sidebar';
import { useAppController } from './hooks/useAppController';

function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function App() {
  const c = useAppController();
  const mainRef = useRef<HTMLElement | null>(null);
  const [sidebarWidth, setSidebarWidth] = useState(360);
  const [isResizingSidebar, setIsResizingSidebar] = useState(false);
  const [isStackedLayout, setIsStackedLayout] = useState(() => window.innerWidth <= 1080);

  useEffect(() => {
    const onResize = () => {
      setIsStackedLayout(window.innerWidth <= 1080);
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  useEffect(() => {
    if (isStackedLayout) {
      setIsResizingSidebar(false);
    }
  }, [isStackedLayout]);

  useEffect(() => {
    if (!isResizingSidebar || isStackedLayout) return;

    const body = document.body;
    const previousCursor = body.style.cursor;
    const previousUserSelect = body.style.userSelect;
    body.style.cursor = 'col-resize';
    body.style.userSelect = 'none';

    const onMouseMove = (event: MouseEvent) => {
      const main = mainRef.current;
      if (!main) return;

      const rect = main.getBoundingClientRect();
      const minWidth = 280;
      const maxWidth = Math.min(760, Math.max(minWidth, rect.width - 420));
      const nextWidth = clampNumber(rect.right - event.clientX, minWidth, maxWidth);
      setSidebarWidth(nextWidth);
    };

    const onMouseUp = () => {
      setIsResizingSidebar(false);
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      body.style.cursor = previousCursor;
      body.style.userSelect = previousUserSelect;
    };
  }, [isResizingSidebar, isStackedLayout]);

  const mainStyle = useMemo(
    () => (isStackedLayout ? undefined : { gridTemplateColumns: `minmax(0, 1fr) ${Math.round(sidebarWidth)}px` }),
    [isStackedLayout, sidebarWidth]
  );

  if (c.error) {
    return (
      <div className={styles.errorScreen}>
        <div className={styles.errorCard}>
          {c.error}
          <div>
            <button type="button" className={styles.errorButton} onClick={c.dismissError}>
              Dismiss
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.app}>
      <AppHeader
        viewMode={c.viewMode}
        switchView={c.switchView}
        searchQuery={c.searchQuery}
        setSearchQuery={c.setSearchQuery}
        runSearchNow={c.runSearchNow}
        symbolSearching={c.symbolSearching}
        searchKind={c.searchKind}
        setSearchKind={c.setSearchKind}
        searchPackageFilter={c.searchPackageFilter}
        setSearchPackageFilter={c.setSearchPackageFilter}
        searchSignatureFilter={c.searchSignatureFilter}
        setSearchSignatureFilter={c.setSearchSignatureFilter}
        hoverLabelsOnly={c.hoverLabelsOnly}
        setHoverLabelsOnly={c.setHoverLabelsOnly}
        resetGraphView={c.resetGraphView}
        topN={c.topN}
        setTopN={c.setTopN}
        minEdgeWeight={c.minEdgeWeight}
        setMinEdgeWeight={c.setMinEdgeWeight}
        packageModuleFilter={c.packageModuleFilter}
        setPackageModuleFilter={c.setPackageModuleFilter}
        packageNameFilter={c.packageNameFilter}
        setPackageNameFilter={c.setPackageNameFilter}
        callDirection={c.callDirection}
        setCallDirection={c.setCallDirection}
        callMaxDepth={c.callMaxDepth}
        setCallMaxDepth={c.setCallMaxDepth}
        callMaxNodes={c.callMaxNodes}
        setCallMaxNodes={c.setCallMaxNodes}
        callRootID={c.callRootID}
        callTruncated={c.callTruncated}
        callEdgeCount={c.callEdges.length}
        refreshCallGraph={() => {
          void c.refreshCallGraph();
        }}
        loadDefaultCallGraph={() => {
          void c.loadDefaultCallGraph();
        }}
        callSeedFunctions={c.callSeedFunctions}
        callNodes={c.callNodes}
        loadCallGraphByID={(id) => {
          void c.openCallGraph(id);
        }}
        dataflowDirection={c.dataflowDirection}
        setDataflowDirection={c.setDataflowDirection}
        dataflowMaxDepth={c.dataflowMaxDepth}
        setDataflowMaxDepth={c.setDataflowMaxDepth}
        dataflowRootID={c.dataflowRootID}
        refreshDataflow={() => {
          void c.refreshDataflow();
        }}
        impactDepth={c.impactDepth}
        setImpactDepth={c.setImpactDepth}
        canRunImpact={Boolean(c.detail?.function_id || c.callRootID)}
        runImpact={() => {
          const functionID = c.detail?.function_id || c.callRootID;
          if (functionID) void c.runImpact(functionID);
        }}
        typeQuery={c.typeQuery}
        setTypeQuery={c.setTypeQuery}
        refreshTypeQuery={c.refreshTypeQuery}
        queries={c.queries}
        selectedQueryName={c.selectedQueryName}
        setSelectedQueryName={c.setSelectedQueryName}
        queryLimit={c.queryLimit}
        setQueryLimit={c.setQueryLimit}
        queryParamText={c.queryParamText}
        setQueryParamText={c.setQueryParamText}
        executeSelectedQuery={() => {
          void c.runSelectedWorkbenchQuery();
        }}
        showBackButton={c.viewMode !== 'packages'}
        switchToPackages={c.switchToPackages}
      />

      <ContextTrail
        viewMode={c.viewMode}
        selectedPackage={c.selectedPackage}
        packageModuleFilter={c.packageModuleFilter}
        callRootID={c.callRootID}
        callNodes={c.callNodes}
        callEdgeCount={c.callEdges.length}
        dataflowRootID={c.dataflowRootID}
        dataflowDirection={c.dataflowDirection}
        dataflowNodes={c.dataflowNodes}
        impactRootID={c.impactRows.find((row) => row.depth === 0)?.id || null}
        impactRows={c.impactRows}
        selectedTypeName={c.selectedTypeName}
        typeInterfacesCount={c.typeInterfaces.length}
        selectedQueryName={c.selectedQueryName}
        queryRowsCount={c.queryResult?.rows.length ?? 0}
        sourceFile={c.source?.file || null}
        activeLine={c.activeLine}
        busy={c.busy}
        onOpenCallByID={(id) => {
          void c.openCallGraph(id);
        }}
        onSwitchToSource={() => c.setSidebarTab('source')}
      />

      <main ref={mainRef} className={styles.main} style={mainStyle}>
        <GraphCanvas
          loading={c.loading}
          viewMode={c.viewMode}
          isEmpty={c.isEmpty}
          busy={c.busy}
          graphData={c.graphData}
          graphSize={c.graphSize}
          graphAreaRef={c.graphAreaRef}
          fgRef={c.fgRef}
          hoverNodeID={c.hoverNodeID}
          setHoverNodeID={c.setHoverNodeID}
          focusIDs={c.focusIDs}
          hoverLabelsOnly={c.hoverLabelsOnly}
          onNodeClick={c.onGraphNodeClick}
          onEngineStop={c.onEngineStop}
          onLoadDefaultCallGraph={() => {
            void c.loadDefaultCallGraph();
          }}
          callSeedFunctions={c.callSeedFunctions}
          onLoadSeedFunction={(id) => {
            void c.openCallGraph(id);
          }}
        />

        <div className={styles.sidebarShell}>
          {!isStackedLayout && (
            <div
              role="separator"
              aria-orientation="vertical"
              aria-label="Resize source panel"
              className={styles.resizeHandle}
              onMouseDown={(event) => {
                event.preventDefault();
                setIsResizingSidebar(true);
              }}
            />
          )}

          <Sidebar
            sidebarTab={c.sidebarTab}
            setSidebarTab={c.setSidebarTab}
            detailProps={{
              viewMode: c.viewMode,
              detail: c.detail,
              runImpactForDetail: (functionID) => {
                void c.runImpact(functionID);
              },
              loadCallGraphByID: (id) => {
                void c.openCallGraph(id);
              },
              packageFunctionsLoading: c.packageFunctionsLoading,
              packageFunctions: c.packageFunctions,
              selectedPackage: c.selectedPackage,
              callNodes: c.callNodes,
              dataflowDirection: c.dataflowDirection,
              dataflowNodes: c.dataflowNodes,
              dataflowEdgesCount: c.dataflowEdges.length,
              onDataflowNodeClick: (id) => {
                void c.onDataflowNodeClick(id);
              },
              hotspots: c.hotspots,
              impactRows: c.impactRows,
              typeInterfaces: c.typeInterfaces,
              selectedTypeName: c.selectedTypeName,
              typeMethods: c.typeMethods,
              queryResult: c.queryResult,
              xrefs: c.xrefs,
              onOpenXref: (file, line) => {
                void c.openSourceInSidebar(file, [line], line);
              },
              symbols: c.symbols,
              onSymbolClick: c.onSymbolClick,
            }}
            sourceProps={{
              source: c.source,
              highlightSet: c.highlightSet,
              activeLine: c.activeLine,
              onLineClick: c.goFromSourceLine,
            }}
          />
        </div>
      </main>
    </div>
  );
}

export default App;
