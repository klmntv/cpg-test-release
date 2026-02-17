import type { ModuleKey } from './types';

export const STORAGE_KEY = 'cpg.ide.state.v2';

export const moduleColors: Record<ModuleKey, string> = {
  prometheus: '#8ba4ff',
  client_golang: '#89e1bd',
  adapter: '#d7a9ff',
  alertmanager: '#f7bf6a',
  other: '#7d879f',
};
