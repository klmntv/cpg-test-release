import { useMemo } from 'react';
import type {
  CallGraphEdge,
  CallGraphNode,
  DataflowEdge,
  DataflowNode,
  HotspotRow,
  ImpactRow,
  QueryResult,
  TypeHierarchyRow,
  TypeInterfaceRow,
} from '../api';
import type { PackageGraph } from '../api';
import type { GraphData, GraphLink, GraphNode, ModuleKey, ViewMode } from '../app/types';
import { detectModule } from '../app/utils';

export type UseGraphDataParams = {
  viewMode: ViewMode;

  packageGraph: PackageGraph | null;
  topN: number;
  minEdgeWeight: number;
  packageModuleFilter: ModuleKey | 'all';
  packageNameFilter: string;

  callNodes: CallGraphNode[];
  callEdges: CallGraphEdge[];
  callRootID: string | null;

  dataflowNodes: DataflowNode[];
  dataflowEdges: DataflowEdge[];
  dataflowRootID: string | null;

  hotspots: HotspotRow[];

  impactRows: ImpactRow[];
  impactRootID: string | null;

  typeInterfaces: TypeInterfaceRow[];
  typeHierarchy: TypeHierarchyRow[];

  queryResult: QueryResult | null;
};

export type UseGraphDataResult = {
  graphData: GraphData;
  isEmpty: boolean;
};

export function useGraphData(params: UseGraphDataParams): UseGraphDataResult {
  const {
    viewMode,
    packageGraph,
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
  } = params;

  const queryGraphData = useMemo(() => {
    const rows = queryResult?.rows ?? [];
    const nodes = new Map<string, GraphNode>();
    const links: GraphLink[] = [];

    const ensureNode = (id: string, fallbackName?: string) => {
      if (!nodes.has(id)) {
        nodes.set(id, {
          id,
          name: fallbackName || id,
          val: 6,
          graphKind: 'query',
          kind: 'query',
        });
      }
      return nodes.get(id) as GraphNode;
    };

    for (const row of rows) {
      const source = typeof row.source === 'string' ? row.source : null;
      const target = typeof row.target === 'string' ? row.target : null;
      const id =
        (typeof row.id === 'string' && row.id) ||
        (typeof row.function_id === 'string' && row.function_id) ||
        (typeof row.type_id === 'string' && row.type_id) ||
        null;
      const name =
        (typeof row.name === 'string' && row.name) ||
        (typeof row.method_name === 'string' && row.method_name) ||
        (typeof row.type_name === 'string' && row.type_name) ||
        undefined;

      if (source && target) {
        const src = ensureNode(source, source);
        const dst = ensureNode(target, target);
        src.kind = 'function';
        dst.kind = 'function';
        src.graphKind = 'function';
        dst.graphKind = 'function';
        links.push({ source, target, kind: 'query' });
        continue;
      }

      if (id) {
        const node = ensureNode(id, name);
        node.kind = 'function';
        node.graphKind = 'function';

        if (typeof row.package === 'string') {
          node.package = row.package;
          node.module = detectModule(row.package);
        }
        if (typeof row.file === 'string') node.file = row.file;
        if (typeof row.line === 'number') node.line = row.line;
      }
    }

    if (links.length === 0 && nodes.size > 0) {
      const rootID = '__query_root__';
      nodes.set(rootID, {
        id: rootID,
        name: queryResult?.query || 'Query',
        isCenter: true,
        val: 12,
        graphKind: 'virtual',
      });
      for (const nodeID of nodes.keys()) {
        if (nodeID === rootID) continue;
        links.push({ source: rootID, target: nodeID, kind: 'query' });
      }
    }

    return {
      nodes: Array.from(nodes.values()).slice(0, 320),
      links: links.slice(0, 600),
    } satisfies GraphData;
  }, [queryResult]);

  const packageGraphData = useMemo(() => {
    if (!packageGraph) return { nodes: [] as GraphNode[], links: [] as GraphLink[] };

    const filtered = packageGraph.nodes
      .filter((node) => {
        if (packageModuleFilter !== 'all' && detectModule(node.id) !== packageModuleFilter) return false;
        if (packageNameFilter && !node.id.toLowerCase().includes(packageNameFilter.toLowerCase())) return false;
        return true;
      })
      .sort((a, b) => b.total_complexity - a.total_complexity)
      .slice(0, topN);

    const selectedIDs = new Set(filtered.map((node) => node.id));

    const links: GraphLink[] = packageGraph.edges
      .filter((edge) => edge.weight >= minEdgeWeight && selectedIDs.has(edge.source) && selectedIDs.has(edge.target))
      .map((edge) => ({
        source: edge.source,
        target: edge.target,
        weight: edge.weight,
        kind: 'package_dep',
      }));

    const connected = new Set<string>();
    links.forEach((link) => {
      connected.add(link.source as string);
      connected.add(link.target as string);
    });

    const nodes: GraphNode[] = filtered
      .filter((node) => connected.has(node.id))
      .map((node) => ({
        id: node.id,
        name: node.id,
        val: Math.max(2, Math.min(22, Math.log2(node.total_complexity + 1) * 2.1)),
        module: detectModule(node.id),
        package: node.id,
        graphKind: 'package',
      }));

    return { nodes, links } satisfies GraphData;
  }, [minEdgeWeight, packageGraph, packageModuleFilter, packageNameFilter, topN]);

  const callGraphData = useMemo(() => {
    if (!callNodes.length) return { nodes: [] as GraphNode[], links: [] as GraphLink[] };

    const nodes: GraphNode[] = callNodes.map((node) => ({
      id: node.id,
      name: node.name,
      package: node.package,
      module: detectModule(node.package || ''),
      val: Math.max(4, 14 - node.depth * 1.4),
      kind: 'function',
      file: node.file,
      line: node.line,
      depth: node.depth,
      graphKind: 'function',
      isCenter: node.id === callRootID,
    }));

    const links: GraphLink[] = callEdges.map((edge) => ({
      source: edge.source,
      target: edge.target,
      kind: edge.kind,
    }));

    return { nodes, links } satisfies GraphData;
  }, [callEdges, callNodes, callRootID]);

  const dataflowGraphData = useMemo(() => {
    if (dataflowNodes.length === 0) return { nodes: [] as GraphNode[], links: [] as GraphLink[] };

    const nodes: GraphNode[] = dataflowNodes.map((node) => ({
      id: node.id,
      name: node.name || node.id,
      kind: node.kind,
      package: node.package,
      module: detectModule(node.package || ''),
      file: node.file,
      line: node.line,
      depth: node.depth,
      isCenter: node.id === dataflowRootID,
      val: Math.max(3, 11 - node.depth * 0.5),
      graphKind: 'dataflow',
    }));

    const links: GraphLink[] = dataflowEdges.map((edge) => ({
      source: edge.source,
      target: edge.target,
      kind: edge.kind,
      weight: edge.kind === 'dfg' ? 3 : 1,
    }));

    return { nodes, links } satisfies GraphData;
  }, [dataflowEdges, dataflowNodes, dataflowRootID]);

  const hotspotsGraphData = useMemo(() => {
    if (!hotspots.length) return { nodes: [] as GraphNode[], links: [] as GraphLink[] };

    const rootID = '__hotspots__';
    const nodes: GraphNode[] = [
      {
        id: rootID,
        name: 'Hotspots',
        val: 16,
        isCenter: true,
        graphKind: 'virtual',
      },
      ...hotspots.map((row) => ({
        id: row.function_id,
        name: row.name,
        package: row.package,
        module: detectModule(row.package || ''),
        file: row.file,
        val: Math.max(5, Math.min(16, row.hotspot_score * 0.9)),
        kind: 'function',
        graphKind: 'function' as const,
      })),
    ];

    const links: GraphLink[] = hotspots.map((row) => ({
      source: rootID,
      target: row.function_id,
      kind: 'hotspot',
      weight: row.hotspot_score,
    }));

    return { nodes, links } satisfies GraphData;
  }, [hotspots]);

  const impactGraphData = useMemo(() => {
    if (!impactRows.length) return { nodes: [] as GraphNode[], links: [] as GraphLink[] };

    const root = impactRows.find((row) => row.id === impactRootID) ?? impactRows[0];
    const rootID = root?.id || impactRootID;
    if (!rootID) return { nodes: [] as GraphNode[], links: [] as GraphLink[] };

    const nodes: GraphNode[] = impactRows.map((row) => ({
      id: row.id,
      name: row.name,
      package: row.package,
      module: detectModule(row.package || ''),
      file: row.file,
      line: row.line,
      depth: row.depth,
      val: Math.max(4, 13 - row.depth),
      kind: 'function',
      graphKind: 'function',
      isCenter: row.id === rootID,
    }));

    const links: GraphLink[] = impactRows
      .filter((row) => row.id !== rootID)
      .map((row) => ({
        source: rootID,
        target: row.id,
        kind: 'impact',
      }));

    return { nodes, links } satisfies GraphData;
  }, [impactRootID, impactRows]);

  const typesGraphData = useMemo(() => {
    const nodes = new Map<string, GraphNode>();
    const links: GraphLink[] = [];

    for (const row of typeInterfaces) {
      const ifaceID = `iface:${row.interface_id || row.interface_name}`;
      const concreteID = `type:${row.concrete_id || row.concrete_name}`;

      if (!nodes.has(ifaceID)) {
        nodes.set(ifaceID, {
          id: ifaceID,
          name: row.interface_name,
          package: row.interface_package,
          module: detectModule(row.interface_package || ''),
          val: 11,
          graphKind: 'type',
          kind: 'interface',
          typeName: row.interface_name,
        });
      }

      if (!nodes.has(concreteID)) {
        nodes.set(concreteID, {
          id: concreteID,
          name: row.concrete_name,
          package: row.concrete_package,
          module: detectModule(row.concrete_package || ''),
          val: Math.max(6, 6 + row.method_count * 0.25),
          graphKind: 'type',
          kind: 'type',
          typeName: row.concrete_name,
        });
      }

      links.push({ source: ifaceID, target: concreteID, kind: 'implements' });
    }

    for (const row of typeHierarchy) {
      const typeID = `h:${row.type_id || row.type_name}`;
      const embeddedID = `h:${row.embedded_id || row.embedded_name}`;

      if (!nodes.has(typeID)) {
        nodes.set(typeID, {
          id: typeID,
          name: row.type_name,
          package: row.type_package,
          module: detectModule(row.type_package || ''),
          val: 8,
          graphKind: 'type',
          kind: 'type',
          typeName: row.type_name,
        });
      }

      if (row.embedded_name && !nodes.has(embeddedID)) {
        nodes.set(embeddedID, {
          id: embeddedID,
          name: row.embedded_name,
          package: row.embedded_package,
          module: detectModule(row.embedded_package || ''),
          val: Math.max(5, 7 - row.depth * 0.3),
          graphKind: 'type',
          kind: 'type',
          typeName: row.embedded_name,
        });
      }

      if (row.embedded_name) {
        links.push({ source: typeID, target: embeddedID, kind: 'embeds' });
      }
    }

    return {
      nodes: Array.from(nodes.values()).slice(0, 420),
      links: links.slice(0, 700),
    } satisfies GraphData;
  }, [typeHierarchy, typeInterfaces]);

  const graphData = useMemo(() => {
    switch (viewMode) {
      case 'calls':
        return callGraphData;
      case 'dataflow':
        return dataflowGraphData;
      case 'hotspots':
        return hotspotsGraphData;
      case 'impact':
        return impactGraphData;
      case 'types':
        return typesGraphData;
      case 'workbench':
        return queryGraphData;
      default:
        return packageGraphData;
    }
  }, [
    callGraphData,
    dataflowGraphData,
    hotspotsGraphData,
    impactGraphData,
    packageGraphData,
    queryGraphData,
    typesGraphData,
    viewMode,
  ]);

  return {
    graphData,
    isEmpty: graphData.nodes.length === 0,
  };
}
