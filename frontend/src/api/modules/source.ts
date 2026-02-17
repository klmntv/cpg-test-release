import type { HttpClient } from '../client';
import type { FileOutlineRow, SourceResponse, XrefRow } from '../types';

export interface SourceApi {
  getSource(file: string, signal?: AbortSignal): Promise<SourceResponse>;
  getXrefs(defID: string, limit?: number, signal?: AbortSignal): Promise<XrefRow[]>;
  getFileOutline(file: string, limit?: number, signal?: AbortSignal): Promise<FileOutlineRow[]>;
}

export function createSourceApi(client: HttpClient): SourceApi {
  return {
    getSource: (file: string, signal?: AbortSignal) => client.get<SourceResponse>('/source', { params: { file }, signal }),
    getXrefs: (defID: string, limit = 400, signal?: AbortSignal) =>
      client.get<XrefRow[]>('/xrefs', { params: { def_id: defID, limit }, signal }),
    getFileOutline: (file: string, limit = 1200, signal?: AbortSignal) =>
      client.get<FileOutlineRow[]>('/file/outline', { params: { file, limit }, signal }),
  };
}
