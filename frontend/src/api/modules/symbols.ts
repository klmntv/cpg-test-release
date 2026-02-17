import type { HttpClient } from '../client';
import type { Symbol } from '../types';

export type SymbolsQuery = {
  kind?: string;
  package?: string;
  signature?: string;
  limit?: number;
  signal?: AbortSignal;
};

export interface SymbolsApi {
  getSymbols(query: string, options?: SymbolsQuery): Promise<Symbol[]>;
}

export function createSymbolsApi(client: HttpClient): SymbolsApi {
  return {
    getSymbols: (query: string, options: SymbolsQuery = {}) =>
      client.get<Symbol[]>('/symbols', {
        params: {
          q: query,
          kind: options.kind,
          package: options.package,
          signature: options.signature,
          limit: options.limit,
        },
        signal: options.signal,
      }),
  };
}
