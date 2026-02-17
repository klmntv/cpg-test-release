import type { HttpClient } from '../client';
import type { TypeHierarchyRow, TypeInterfaceRow, TypeMethodRow } from '../types';

export interface TypesApi {
  getTypeInterfaces(name?: string, limit?: number, signal?: AbortSignal): Promise<TypeInterfaceRow[]>;
  getTypeMethods(name: string, limit?: number, signal?: AbortSignal): Promise<TypeMethodRow[]>;
  getTypeHierarchy(name: string, limit?: number, signal?: AbortSignal): Promise<TypeHierarchyRow[]>;
}

export function createTypesApi(client: HttpClient): TypesApi {
  return {
    getTypeInterfaces: (name = '', limit = 200, signal?: AbortSignal) =>
      client.get<TypeInterfaceRow[]>('/types/interfaces', { params: { name, limit }, signal }),
    getTypeMethods: (name: string, limit = 300, signal?: AbortSignal) =>
      client.get<TypeMethodRow[]>('/types/methods', { params: { name, limit }, signal }),
    getTypeHierarchy: (name: string, limit = 300, signal?: AbortSignal) =>
      client.get<TypeHierarchyRow[]>('/types/hierarchy', { params: { name, limit }, signal }),
  };
}
