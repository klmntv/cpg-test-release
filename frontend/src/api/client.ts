import { ApiError } from './errors';

export type FetchParams = {
  params?: Record<string, string | number | undefined>;
  signal?: AbortSignal;
};

export type HttpClient = {
  get<T>(path: string, options?: FetchParams): Promise<T>;
};

function buildURL(apiBase: string, path: string, params?: Record<string, string | number | undefined>): string {
  const url = new URL(path, window.location.origin);
  url.pathname = apiBase + url.pathname;

  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value === undefined) return;
      url.searchParams.set(key, String(value));
    });
  }

  return url.toString();
}

export function createHttpClient(apiBase = '/api'): HttpClient {
  return {
    async get<T>(path: string, options: FetchParams = {}): Promise<T> {
      const url = buildURL(apiBase, path, options.params);
      const response = await fetch(url, { signal: options.signal });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({ error: response.statusText }));
        const message = (payload as { error?: string }).error || response.statusText;
        throw new ApiError(message, response.status, url);
      }

      return response.json() as Promise<T>;
    },
  };
}
