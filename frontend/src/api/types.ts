export type PackageNode = {
  id: string;
  file_count: number;
  function_count: number;
  total_loc: number;
  total_complexity: number;
  avg_complexity: number;
  max_complexity: number;
};

export type PackageEdge = {
  source: string;
  target: string;
  weight: number;
};

export type PackageGraph = {
  nodes: PackageNode[];
  edges: PackageEdge[];
};

export type DataflowNode = {
  id: string;
  name: string;
  kind: string;
  package: string;
  file: string;
  line: number;
  depth: number;
};

export type DataflowEdge = {
  source: string;
  target: string;
  kind: string;
};

export type DataflowResponse = {
  root_id: string;
  direction: 'forward' | 'backward';
  nodes: DataflowNode[];
  edges: DataflowEdge[];
};

export type Neighbor = {
  direction: 'caller' | 'callee';
  id: string;
  name: string;
  package: string;
  file: string;
  line: number;
};

export type NeighborhoodResponse = {
  center: Neighbor | null;
  neighbors: Neighbor[];
};

export type CallGraphNode = {
  id: string;
  name: string;
  package: string;
  file: string;
  line: number;
  depth: number;
};

export type CallGraphEdge = {
  source: string;
  target: string;
  kind: string;
};

export type CallGraphResponse = {
  center_id: string;
  direction: 'both' | 'callers' | 'callees';
  max_depth: number;
  max_nodes: number;
  nodes: CallGraphNode[];
  edges: CallGraphEdge[];
};

export type Symbol = {
  id: string;
  name: string;
  kind: string;
  package: string;
  file: string;
  line: number;
};

export type FunctionDetail = {
  function_id: string;
  name: string;
  package: string;
  file: string;
  line: number;
  end_line: number;
  signature: string;
  complexity: number;
  loc: number;
  fan_in: number;
  fan_out: number;
  num_params: number;
  num_locals: number;
  num_calls: number;
  num_branches: number;
  num_returns: number;
  finding_count: number;
  callers: string;
  callees: string;
};

export type SourceResponse = {
  file: string;
  content: string;
};

export type PackageFunction = {
  function_id: string;
  name: string;
};

export type QueryDescriptor = {
  name: string;
  description: string;
};

export type QueryResult = {
  query: string;
  limit: number;
  truncated: boolean;
  rows: Array<Record<string, string | number | null>>;
};

export type HotspotRow = {
  function_id: string;
  name: string;
  package: string;
  file: string;
  complexity: number;
  loc: number;
  fan_in: number;
  fan_out: number;
  finding_count: number;
  hotspot_score: number;
};

export type ImpactRow = {
  id: string;
  name: string;
  package: string;
  file: string;
  line: number;
  depth: number;
};

export type TypeInterfaceRow = {
  interface_id: string;
  interface_name: string;
  interface_package: string;
  concrete_id: string;
  concrete_name: string;
  concrete_package: string;
  method_count: number;
};

export type TypeMethodRow = {
  type_id: string;
  type_name: string;
  method_id: string;
  method_name: string;
  signature: string;
  complexity: number;
  loc: number;
};

export type TypeHierarchyRow = {
  type_id: string;
  type_name: string;
  type_package: string;
  embedded_id: string;
  embedded_name: string;
  embedded_package: string;
  depth: number;
};

export type XrefRow = {
  def_id: string;
  use_id: string;
  use_name: string;
  use_kind: string;
  use_package: string;
  use_file: string;
  use_line: number;
  edge_kind: string;
};

export type FileOutlineRow = {
  id: string;
  parent_id: string;
  kind: string;
  name: string;
  start_line: number;
  end_line: number;
  depth: number;
};
