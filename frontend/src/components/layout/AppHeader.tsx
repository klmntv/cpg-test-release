import type { CallGraphNode, QueryDescriptor } from '../../api';
import { moduleColors } from '../../app/constants';
import type { CallDirection, DataflowDirection, ModuleKey, ViewMode } from '../../app/types';
import { CallsControls } from '../controls/CallsControls';
import { DataflowControls } from '../controls/DataflowControls';
import { ImpactControls } from '../controls/ImpactControls';
import { PackagesControls } from '../controls/PackagesControls';
import { TypesControls } from '../controls/TypesControls';
import { WorkbenchControls } from '../controls/WorkbenchControls';
import { SymbolSearchPanel } from '../search/SymbolSearchPanel';
import { ViewTabs } from './ViewTabs';
import styles from './AppHeader.module.css';

type SeedFunction = {
  id: string;
  name: string;
  package?: string;
};

type AppHeaderProps = {
  viewMode: ViewMode;
  switchView: (mode: ViewMode) => void;

  searchQuery: string;
  setSearchQuery: (value: string) => void;
  runSearchNow: () => void;
  symbolSearching: boolean;
  searchKind: string;
  setSearchKind: (value: string) => void;
  searchPackageFilter: string;
  setSearchPackageFilter: (value: string) => void;
  searchSignatureFilter: string;
  setSearchSignatureFilter: (value: string) => void;

  hoverLabelsOnly: boolean;
  setHoverLabelsOnly: (value: boolean) => void;
  resetGraphView: () => void;

  topN: number;
  setTopN: (value: number) => void;
  minEdgeWeight: number;
  setMinEdgeWeight: (value: number) => void;
  packageModuleFilter: ModuleKey | 'all';
  setPackageModuleFilter: (value: ModuleKey | 'all') => void;
  packageNameFilter: string;
  setPackageNameFilter: (value: string) => void;

  callDirection: CallDirection;
  setCallDirection: (value: CallDirection) => void;
  callMaxDepth: number;
  setCallMaxDepth: (value: number) => void;
  callMaxNodes: number;
  setCallMaxNodes: (value: number) => void;
  callRootID: string | null;
  callTruncated: boolean;
  callEdgeCount: number;
  refreshCallGraph: () => void;
  loadDefaultCallGraph: () => void;
  callSeedFunctions: SeedFunction[];
  callNodes: CallGraphNode[];
  loadCallGraphByID: (id: string) => void;

  dataflowDirection: DataflowDirection;
  setDataflowDirection: (value: DataflowDirection) => void;
  dataflowMaxDepth: number;
  setDataflowMaxDepth: (value: number) => void;
  dataflowRootID: string | null;
  refreshDataflow: () => void;

  impactDepth: number;
  setImpactDepth: (value: number) => void;
  canRunImpact: boolean;
  runImpact: () => void;

  typeQuery: string;
  setTypeQuery: (value: string) => void;
  refreshTypeQuery: () => void;

  queries: QueryDescriptor[];
  selectedQueryName: string;
  setSelectedQueryName: (name: string) => void;
  queryLimit: number;
  setQueryLimit: (value: number) => void;
  queryParamText: string;
  setQueryParamText: (value: string) => void;
  executeSelectedQuery: () => void;

  showBackButton: boolean;
  switchToPackages: () => void;
};

export function AppHeader(props: AppHeaderProps) {
  const {
    viewMode,
    switchView,
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
    hoverLabelsOnly,
    setHoverLabelsOnly,
    resetGraphView,
    topN,
    setTopN,
    minEdgeWeight,
    setMinEdgeWeight,
    packageModuleFilter,
    setPackageModuleFilter,
    packageNameFilter,
    setPackageNameFilter,
    callDirection,
    setCallDirection,
    callMaxDepth,
    setCallMaxDepth,
    callMaxNodes,
    setCallMaxNodes,
    callRootID,
    callTruncated,
    callEdgeCount,
    refreshCallGraph,
    loadDefaultCallGraph,
    callSeedFunctions,
    callNodes,
    loadCallGraphByID,
    dataflowDirection,
    setDataflowDirection,
    dataflowMaxDepth,
    setDataflowMaxDepth,
    dataflowRootID,
    refreshDataflow,
    impactDepth,
    setImpactDepth,
    canRunImpact,
    runImpact,
    typeQuery,
    setTypeQuery,
    refreshTypeQuery,
    queries,
    selectedQueryName,
    setSelectedQueryName,
    queryLimit,
    setQueryLimit,
    queryParamText,
    setQueryParamText,
    executeSelectedQuery,
    showBackButton,
    switchToPackages,
  } = props;

  return (
    <header className={styles.header}>
      <div className={styles.topRow}>
        <div className={styles.brandBlock}>
          <h1 className={styles.title}>CPG NOMINAL</h1>
          <div className={styles.meta}>SYSTEM OVERVIEW // ANALYSIS ONLINE</div>
        </div>

        <div className={styles.navWrap}>
          <ViewTabs viewMode={viewMode} onSwitch={switchView} />
        </div>

        <div className={styles.searchWrap}>
          <SymbolSearchPanel
            searchQuery={searchQuery}
            setSearchQuery={setSearchQuery}
            runSearchNow={runSearchNow}
            symbolSearching={symbolSearching}
            searchKind={searchKind}
            setSearchKind={setSearchKind}
            searchPackageFilter={searchPackageFilter}
            setSearchPackageFilter={setSearchPackageFilter}
            searchSignatureFilter={searchSignatureFilter}
            setSearchSignatureFilter={setSearchSignatureFilter}
          />
        </div>
      </div>

      <div className={styles.controlRow}>
        <div className={styles.controlsColumn}>
          <div className={styles.baseControls}>
            <label className={styles.checkLabel}>
              <input type="checkbox" checked={hoverLabelsOnly} onChange={(event) => setHoverLabelsOnly(event.target.checked)} />
              Hover labels only
            </label>

            <button type="button" className={styles.actionButton} onClick={resetGraphView}>
              Reset view
            </button>
          </div>

          <div className={styles.viewControls}>
            {viewMode === 'packages' && (
              <PackagesControls
                topN={topN}
                setTopN={setTopN}
                minEdgeWeight={minEdgeWeight}
                setMinEdgeWeight={setMinEdgeWeight}
                packageModuleFilter={packageModuleFilter}
                setPackageModuleFilter={setPackageModuleFilter}
                packageNameFilter={packageNameFilter}
                setPackageNameFilter={setPackageNameFilter}
                moduleColors={moduleColors}
              />
            )}

            {viewMode === 'calls' && (
              <CallsControls
                callDirection={callDirection}
                setCallDirection={setCallDirection}
                callMaxDepth={callMaxDepth}
                setCallMaxDepth={setCallMaxDepth}
                callMaxNodes={callMaxNodes}
                setCallMaxNodes={setCallMaxNodes}
                callRootID={callRootID}
                callTruncated={callTruncated}
                callEdgeCount={callEdgeCount}
                refreshCallGraph={refreshCallGraph}
                loadDefaultCallGraph={loadDefaultCallGraph}
                seedFunctions={callSeedFunctions}
                callNodes={callNodes}
                loadCallGraphByID={loadCallGraphByID}
              />
            )}

            {viewMode === 'dataflow' && (
              <DataflowControls
                dataflowDirection={dataflowDirection}
                setDataflowDirection={setDataflowDirection}
                dataflowMaxDepth={dataflowMaxDepth}
                setDataflowMaxDepth={setDataflowMaxDepth}
                dataflowRootID={dataflowRootID}
                refreshDataflow={refreshDataflow}
              />
            )}

            {viewMode === 'impact' && (
              <ImpactControls impactDepth={impactDepth} setImpactDepth={setImpactDepth} canRunImpact={canRunImpact} runImpact={runImpact} />
            )}

            {viewMode === 'types' && (
              <TypesControls typeQuery={typeQuery} setTypeQuery={setTypeQuery} refreshTypeQuery={refreshTypeQuery} />
            )}

            {viewMode === 'workbench' && (
              <WorkbenchControls
                queries={queries}
                selectedQueryName={selectedQueryName}
                setSelectedQueryName={setSelectedQueryName}
                queryLimit={queryLimit}
                setQueryLimit={setQueryLimit}
                queryParamText={queryParamText}
                setQueryParamText={setQueryParamText}
                executeSelectedQuery={executeSelectedQuery}
              />
            )}
          </div>
        </div>

        {showBackButton && (
          <div className={styles.backWrap}>
            <button type="button" className={styles.backButton} onClick={switchToPackages}>
              Back to packages
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
