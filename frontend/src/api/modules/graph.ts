import type { HttpClient } from '../client';
import type {
  CallGraphResponse,
  DataflowResponse,
  FunctionDetail,
  HotspotRow,
  ImpactRow,
  NeighborhoodResponse,
  PackageFunction,
  PackageGraph,
} from '../types';

export interface GraphApi {
  getPackageGraph(signal?: AbortSignal): Promise<PackageGraph>;
  getNeighborhood(functionId: string, signal?: AbortSignal): Promise<NeighborhoodResponse>;
  getCallGraph(
    functionId: string,
    direction: 'both' | 'callers' | 'callees',
    maxDepth: number,
    maxNodes: number,
    signal?: AbortSignal
  ): Promise<CallGraphResponse>;
  getDataflowSlice(
    nodeId: string,
    direction: 'forward' | 'backward',
    maxDepth?: number,
    signal?: AbortSignal
  ): Promise<DataflowResponse>;
  getFunctionsByPackage(pkg: string, signal?: AbortSignal): Promise<PackageFunction[]>;
  getFunctionDetail(id: string, signal?: AbortSignal): Promise<FunctionDetail>;
  getHotspots(limit?: number, signal?: AbortSignal): Promise<HotspotRow[]>;
  getImpact(functionId: string, maxDepth?: number, limit?: number, signal?: AbortSignal): Promise<ImpactRow[]>;
}

export function createGraphApi(client: HttpClient): GraphApi {
  return {
    getPackageGraph: (signal?: AbortSignal) => client.get<PackageGraph>('/graph/package', { signal }),
    getNeighborhood: (functionId: string, signal?: AbortSignal) =>
      client.get<NeighborhoodResponse>('/graph/neighborhood', { params: { function_id: functionId }, signal }),
    getCallGraph: (
      functionId: string,
      direction: 'both' | 'callers' | 'callees',
      maxDepth: number,
      maxNodes: number,
      signal?: AbortSignal
    ) =>
      client.get<CallGraphResponse>('/graph/call', {
        params: { function_id: functionId, direction, max_depth: maxDepth, max_nodes: maxNodes },
        signal,
      }),
    getDataflowSlice: (nodeId: string, direction: 'forward' | 'backward', maxDepth = 14, signal?: AbortSignal) =>
      client.get<DataflowResponse>('/graph/dataflow', {
        params: { node_id: nodeId, direction, max_depth: maxDepth },
        signal,
      }),
    getFunctionsByPackage: (pkg: string, signal?: AbortSignal) =>
      client.get<PackageFunction[]>('/functions', { params: { package: pkg }, signal }),
    getFunctionDetail: (id: string, signal?: AbortSignal) =>
      client.get<FunctionDetail>(`/function/${encodeURIComponent(id)}`, { signal }),
    getHotspots: (limit = 50, signal?: AbortSignal) =>
      client.get<HotspotRow[]>('/hotspots', { params: { limit }, signal }),
    getImpact: (functionId: string, maxDepth = 8, limit = 250, signal?: AbortSignal) =>
      client.get<ImpactRow[]>('/impact', { params: { function_id: functionId, max_depth: maxDepth, limit }, signal }),
  };
}
