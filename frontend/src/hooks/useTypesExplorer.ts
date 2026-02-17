import { useEffect, useState } from 'react';
import { api } from '../api';
import type { TypeHierarchyRow, TypeInterfaceRow, TypeMethodRow } from '../api';
import type { ViewMode } from '../app/types';

type UseTypesExplorerParams = {
  viewMode: ViewMode;
  onBusy?: (message: string | null) => void;
  onError?: (message: string | null) => void;
};

export type TypesExplorerState = {
  typeQuery: string;
  setTypeQuery: (value: string) => void;
  typeInterfaces: TypeInterfaceRow[];
  selectedTypeName: string;
  setSelectedTypeName: (name: string) => void;
  typeMethods: TypeMethodRow[];
  typeHierarchy: TypeHierarchyRow[];
  refreshTypeQuery: () => void;
  clearTypesDetails: () => void;
};

export function useTypesExplorer(params: UseTypesExplorerParams): TypesExplorerState {
  const { viewMode, onBusy, onError } = params;

  const [typeQuery, setTypeQueryState] = useState('');
  const [typeInterfaces, setTypeInterfaces] = useState<TypeInterfaceRow[]>([]);
  const [selectedTypeName, setSelectedTypeName] = useState('');
  const [typeMethods, setTypeMethods] = useState<TypeMethodRow[]>([]);
  const [typeHierarchy, setTypeHierarchy] = useState<TypeHierarchyRow[]>([]);

  const setTypeQuery = (value: string) => setTypeQueryState(value);
  const refreshTypeQuery = () => setTypeQueryState((prev) => prev.trim());

  const clearTypesDetails = () => {
    setTypeMethods([]);
    setTypeHierarchy([]);
    setSelectedTypeName('');
  };

  useEffect(() => {
    if (viewMode !== 'types') return;

    const ac = new AbortController();
    const timeout = setTimeout(() => {
      api
        .getTypeInterfaces(typeQuery, 300, ac.signal)
        .then((rows) => {
          setTypeInterfaces(rows);
          onError?.(null);
        })
        .catch((err) => {
          if (ac.signal.aborted) return;
          onError?.((err as Error).message);
        });
    }, 200);

    return () => {
      clearTimeout(timeout);
      ac.abort();
    };
  }, [onError, typeQuery, viewMode]);

  useEffect(() => {
    if (!selectedTypeName) {
      setTypeMethods([]);
      setTypeHierarchy([]);
      return;
    }

    const ac = new AbortController();
    onBusy?.('Loading type details...');

    Promise.all([
      api.getTypeMethods(selectedTypeName, 500, ac.signal),
      api.getTypeHierarchy(selectedTypeName, 500, ac.signal),
    ])
      .then(([methods, hierarchy]) => {
        setTypeMethods(methods);
        setTypeHierarchy(hierarchy);
        onError?.(null);
      })
      .catch((err) => {
        if (ac.signal.aborted) return;
        onError?.((err as Error).message);
      })
      .finally(() => {
        if (!ac.signal.aborted) onBusy?.(null);
      });

    return () => ac.abort();
  }, [onBusy, onError, selectedTypeName]);

  return {
    typeQuery,
    setTypeQuery,
    typeInterfaces,
    selectedTypeName,
    setSelectedTypeName,
    typeMethods,
    typeHierarchy,
    refreshTypeQuery,
    clearTypesDetails,
  };
}
