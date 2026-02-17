export type ViewMode = 'packages' | 'calls' | 'dataflow' | 'hotspots' | 'impact' | 'types' | 'workbench';
export type DataflowDirection = 'forward' | 'backward';
export type CallDirection = 'both' | 'callers' | 'callees';
export type ModuleKey = 'prometheus' | 'client_golang' | 'adapter' | 'alertmanager' | 'other';
export type SidebarTab = 'detail' | 'source';

export type GraphNode = {
  id: string;
  name: string;
  val?: number;
  module?: ModuleKey;
  package?: string;
  isCenter?: boolean;
  kind?: string;
  file?: string;
  line?: number;
  depth?: number;
  graphKind?: 'package' | 'function' | 'dataflow' | 'type' | 'query' | 'virtual';
  typeName?: string;
};

export type GraphLink = {
  source: string | GraphNode;
  target: string | GraphNode;
  weight?: number;
  kind?: string;
};

export type GraphData = {
  nodes: GraphNode[];
  links: GraphLink[];
};

export type PersistedState = {
  viewMode?: ViewMode;
  topN?: number;
  minEdgeWeight?: number;
  packageModuleFilter?: ModuleKey | 'all';
  packageNameFilter?: string;
  callDirection?: CallDirection;
  callMaxDepth?: number;
  callMaxNodes?: number;
  dataflowDirection?: DataflowDirection;
  dataflowMaxDepth?: number;
  searchKind?: string;
  searchPackageFilter?: string;
  searchSignatureFilter?: string;
};
