import { createHttpClient } from './client';
import { ApiError } from './errors';
import { createGraphApi, type GraphApi } from './modules/graph';
import { createSourceApi, type SourceApi } from './modules/source';
import { createSymbolsApi, type SymbolsApi } from './modules/symbols';
import { createTypesApi, type TypesApi } from './modules/types';
import { createWorkbenchApi, type WorkbenchApi } from './modules/workbench';

export * from './types';
export { ApiError };

export interface ApiClient {
  graph: GraphApi;
  symbols: SymbolsApi;
  source: SourceApi;
  types: TypesApi;
  workbench: WorkbenchApi;
}

const http = createHttpClient('/api');

const graph = createGraphApi(http);
const symbols = createSymbolsApi(http);
const source = createSourceApi(http);
const types = createTypesApi(http);
const workbench = createWorkbenchApi(http);

export const apiClient: ApiClient = {
  graph,
  symbols,
  source,
  types,
  workbench,
};

// Backward-compatible facade for existing callsites.
export const api = {
  getPackageGraph: graph.getPackageGraph,
  getNeighborhood: graph.getNeighborhood,
  getCallGraph: graph.getCallGraph,
  getDataflowSlice: graph.getDataflowSlice,
  getFunctionsByPackage: graph.getFunctionsByPackage,
  getFunctionDetail: graph.getFunctionDetail,
  getHotspots: graph.getHotspots,
  getImpact: graph.getImpact,
  getSource: source.getSource,
  getXrefs: source.getXrefs,
  getFileOutline: source.getFileOutline,
  getSymbols: symbols.getSymbols,
  getQueries: workbench.getQueries,
  getQueryByName: workbench.getQueryByName,
  getTypeInterfaces: types.getTypeInterfaces,
  getTypeMethods: types.getTypeMethods,
  getTypeHierarchy: types.getTypeHierarchy,
};
