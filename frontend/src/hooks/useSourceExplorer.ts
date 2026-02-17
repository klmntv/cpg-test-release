import { useCallback, useRef, useState } from 'react';
import { api } from '../api';
import type { FileOutlineRow, SourceResponse, XrefRow } from '../api';
import { uniquePositiveLines } from '../app/utils';

type UseSourceExplorerParams = {
  onBusy?: (message: string | null) => void;
  onError?: (message: string | null) => void;
};

export type SourceExplorerState = {
  source: SourceResponse | null;
  sourceOutline: FileOutlineRow[];
  highlightLines: number[];
  activeLine: number | null;
  xrefs: XrefRow[];
  setActiveLine: (line: number | null) => void;
  setHighlightLines: (lines: number[]) => void;
  setXrefs: (rows: XrefRow[]) => void;
  openSourceWithLines: (file: string, lines: Array<number | null | undefined>, focusLine?: number | null) => Promise<void>;
  loadXrefsForDef: (defID: string, limit?: number) => Promise<XrefRow[]>;
  clearSource: () => void;
};

export function useSourceExplorer(params: UseSourceExplorerParams = {}): SourceExplorerState {
  const { onBusy, onError } = params;
  const cacheRef = useRef<Map<string, unknown>>(new Map());

  const [source, setSource] = useState<SourceResponse | null>(null);
  const [sourceOutline, setSourceOutline] = useState<FileOutlineRow[]>([]);
  const [highlightLines, setHighlightLines] = useState<number[]>([]);
  const [activeLine, setActiveLine] = useState<number | null>(null);
  const [xrefs, setXrefs] = useState<XrefRow[]>([]);

  const cachedFetch = useCallback(async <T,>(key: string, load: () => Promise<T>): Promise<T> => {
    const cached = cacheRef.current.get(key);
    if (cached !== undefined) return cached as T;
    const value = await load();
    cacheRef.current.set(key, value as unknown);
    return value;
  }, []);

  const openSourceWithLines = useCallback(
    async (file: string, lines: Array<number | null | undefined>, focusLine: number | null = null) => {
      if (!file) return;

      try {
        onBusy?.('Loading source...');
        const [src, outline] = await Promise.all([
          cachedFetch(`src:${file}`, () => api.getSource(file)),
          cachedFetch(`outline:${file}`, () => api.getFileOutline(file)),
        ]);

        setSource(src);
        setSourceOutline(outline);
        setHighlightLines(uniquePositiveLines(lines));
        setActiveLine(focusLine);
        onError?.(null);
      } catch (err) {
        onError?.((err as Error).message);
      } finally {
        onBusy?.(null);
      }
    },
    [cachedFetch, onBusy, onError]
  );

  const loadXrefsForDef = useCallback(
    async (defID: string, limit = 300) => {
      try {
        onBusy?.('Finding references...');
        const rows = await api.getXrefs(defID, limit);
        setXrefs(rows);
        onError?.(null);
        return rows;
      } catch (err) {
        onError?.((err as Error).message);
        return [];
      } finally {
        onBusy?.(null);
      }
    },
    [onBusy, onError]
  );

  const clearSource = useCallback(() => {
    setSource(null);
    setSourceOutline([]);
    setHighlightLines([]);
    setActiveLine(null);
    setXrefs([]);
  }, []);

  return {
    source,
    sourceOutline,
    highlightLines,
    activeLine,
    xrefs,
    setActiveLine,
    setHighlightLines,
    setXrefs,
    openSourceWithLines,
    loadXrefsForDef,
    clearSource,
  };
}
