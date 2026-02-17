import { useCallback, useEffect, useState } from 'react';
import { api } from '../api';
import type { QueryDescriptor, QueryResult } from '../api';
import { parseKVInput } from '../app/utils';

type UseWorkbenchQueryParams = {
  queries: QueryDescriptor[];
  onBusy?: (message: string | null) => void;
  onError?: (message: string | null) => void;
};

export type WorkbenchQueryState = {
  selectedQueryName: string;
  setSelectedQueryName: (name: string) => void;
  queryParamText: string;
  setQueryParamText: (value: string) => void;
  queryLimit: number;
  setQueryLimit: (value: number) => void;
  queryResult: QueryResult | null;
  setQueryResult: (result: QueryResult | null) => void;
  executeSelectedQuery: () => Promise<void>;
};

export function useWorkbenchQuery(params: UseWorkbenchQueryParams): WorkbenchQueryState {
  const { queries, onBusy, onError } = params;

  const [selectedQueryName, setSelectedQueryName] = useState('');
  const [queryParamText, setQueryParamText] = useState('');
  const [queryLimit, setQueryLimit] = useState(500);
  const [queryResult, setQueryResult] = useState<QueryResult | null>(null);

  useEffect(() => {
    if (!selectedQueryName && queries.length > 0) {
      setSelectedQueryName(queries[0].name);
    }
  }, [queries, selectedQueryName]);

  const executeSelectedQuery = useCallback(async () => {
    if (!selectedQueryName) return;

    try {
      onBusy?.(`Running ${selectedQueryName}...`);
      onError?.(null);
      const paramsRaw = parseKVInput(queryParamText);
      const result = await api.getQueryByName(selectedQueryName, { ...paramsRaw, limit: queryLimit });
      setQueryResult(result);
    } catch (err) {
      onError?.((err as Error).message);
    } finally {
      onBusy?.(null);
    }
  }, [onBusy, onError, queryLimit, queryParamText, selectedQueryName]);

  return {
    selectedQueryName,
    setSelectedQueryName,
    queryParamText,
    setQueryParamText,
    queryLimit,
    setQueryLimit,
    queryResult,
    setQueryResult,
    executeSelectedQuery,
  };
}
