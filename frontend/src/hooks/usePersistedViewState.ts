import { useEffect, useMemo } from 'react';
import { STORAGE_KEY } from '../app/constants';
import type { PersistedState, ViewMode } from '../app/types';
import { loadPersistedState } from '../app/utils';

export type PersistedSyncState = {
  state: PersistedState;
  viewMode: ViewMode;
  callRootID: string | null;
  dataflowRootID: string | null;
};

export function useInitialPersistedViewState(): {
  persisted: PersistedState;
  urlParams: URLSearchParams;
} {
  const persisted = useMemo(loadPersistedState, []);
  const urlParams = useMemo(() => new URLSearchParams(window.location.search), []);
  return { persisted, urlParams };
}

export function usePersistedViewState(sync: PersistedSyncState): void {
  const { state, viewMode, callRootID, dataflowRootID } = sync;

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));

    const params = new URLSearchParams(window.location.search);
    params.set('view', viewMode);

    if (callRootID) params.set('function', callRootID);
    else params.delete('function');

    if (dataflowRootID) params.set('node', dataflowRootID);
    else params.delete('node');

    const qs = params.toString();
    const nextURL = qs ? `${window.location.pathname}?${qs}` : window.location.pathname;
    window.history.replaceState({}, '', nextURL);
  }, [callRootID, dataflowRootID, state, viewMode]);
}
