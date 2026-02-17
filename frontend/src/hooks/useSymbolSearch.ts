import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import type { Symbol } from '../api';

type UseSymbolSearchParams = {
  initialKind?: string;
  initialPackageFilter?: string;
  initialSignatureFilter?: string;
  debounceMs?: number;
  onError?: (message: string | null) => void;
};

export type SymbolSearchState = {
  searchQuery: string;
  setSearchQuery: (value: string) => void;
  searchKind: string;
  setSearchKind: (value: string) => void;
  searchPackageFilter: string;
  setSearchPackageFilter: (value: string) => void;
  searchSignatureFilter: string;
  setSearchSignatureFilter: (value: string) => void;
  symbolSearching: boolean;
  symbols: Symbol[];
  runSearchNow: () => void;
  clearSymbols: () => void;
};

export function useSymbolSearch(params: UseSymbolSearchParams = {}): SymbolSearchState {
  const {
    initialKind = '',
    initialPackageFilter = '',
    initialSignatureFilter = '',
    debounceMs = 250,
    onError,
  } = params;

  const [searchQuery, setSearchQueryState] = useState('');
  const [searchKind, setSearchKind] = useState(initialKind);
  const [searchPackageFilter, setSearchPackageFilter] = useState(initialPackageFilter);
  const [searchSignatureFilter, setSearchSignatureFilter] = useState(initialSignatureFilter);
  const [symbolSearching, setSymbolSearching] = useState(false);
  const [symbols, setSymbols] = useState<Symbol[]>([]);

  const abortRef = useRef<AbortController | null>(null);
  const runImmediateRef = useRef(false);

  const setSearchQuery = (value: string) => {
    setSearchQueryState(value);
  };

  const runSearchNow = () => {
    runImmediateRef.current = true;
    setSearchQueryState((prev) => prev.trim());
  };

  const clearSymbols = () => setSymbols([]);

  useEffect(() => {
    const query = searchQuery.trim();
    if (!query) {
      setSymbols([]);
      setSymbolSearching(false);
      return;
    }

    const ac = new AbortController();
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = ac;

    setSymbolSearching(true);
    const timeout = setTimeout(
      () => {
        api
          .getSymbols(query, {
            kind: searchKind || undefined,
            package: searchPackageFilter || undefined,
            signature: searchSignatureFilter || undefined,
            limit: 90,
            signal: ac.signal,
          })
          .then((rows) => {
            setSymbols(rows);
            onError?.(null);
          })
          .catch((err) => {
            if (ac.signal.aborted) return;
            const message = (err as Error).message;
            onError?.(message);
          })
          .finally(() => {
            if (!ac.signal.aborted) setSymbolSearching(false);
          });
      },
      runImmediateRef.current ? 0 : debounceMs
    );

    runImmediateRef.current = false;

    return () => {
      clearTimeout(timeout);
      ac.abort();
    };
  }, [debounceMs, onError, searchKind, searchPackageFilter, searchQuery, searchSignatureFilter]);

  return {
    searchQuery,
    setSearchQuery,
    searchKind,
    setSearchKind,
    searchPackageFilter,
    setSearchPackageFilter,
    searchSignatureFilter,
    setSearchSignatureFilter,
    symbolSearching,
    symbols,
    runSearchNow,
    clearSymbols,
  };
}
