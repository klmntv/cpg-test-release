import type { HttpClient } from '../client';
import type { QueryDescriptor, QueryResult } from '../types';

export interface WorkbenchApi {
  getQueries(signal?: AbortSignal): Promise<QueryDescriptor[]>;
  getQueryByName(
    name: string,
    params?: Record<string, string | number | undefined>,
    signal?: AbortSignal
  ): Promise<QueryResult>;
}

export function createWorkbenchApi(client: HttpClient): WorkbenchApi {
  return {
    getQueries: (signal?: AbortSignal) => client.get<QueryDescriptor[]>('/queries', { signal }),
    getQueryByName: (name: string, params: Record<string, string | number | undefined> = {}, signal?: AbortSignal) =>
      client.get<QueryResult>(`/query/${encodeURIComponent(name)}`, { params, signal }),
  };
}
