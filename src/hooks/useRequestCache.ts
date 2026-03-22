import { useCallback, useRef, useState } from "react";

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface UseRequestCacheOptions {
  staleTime?: number;
  cacheTime?: number;
}

export function useRequestCache<T>(options: UseRequestCacheOptions = {}) {
  const { staleTime = 30000, cacheTime = 300000 } = options;

  const cache = useRef<Map<string, CacheEntry<T>>>(new Map());
  const pendingRequests = useRef<Map<string, Promise<T>>>(new Map());

  const getCached = useCallback(
    (key: string): T | null => {
      const entry = cache.current.get(key);
      if (!entry) return null;

      const isExpired = Date.now() - entry.timestamp > cacheTime;

      if (isExpired) {
        cache.current.delete(key);
        return null;
      }

      return entry.data;
    },
    [staleTime, cacheTime],
  );

  const setCached = useCallback((key: string, data: T) => {
    cache.current.set(key, { data, timestamp: Date.now() });
  }, []);

  const fetchWithCache = useCallback(
    async (
      key: string,
      fetcher: () => Promise<T>,
      options?: { forceRefresh?: boolean },
    ): Promise<T> => {
      if (!options?.forceRefresh) {
        const cached = getCached(key);
        if (cached) {
          return cached;
        }
      }

      const pending = pendingRequests.current.get(key);
      if (pending) {
        return pending;
      }

      const request = fetcher().then((data) => {
        setCached(key, data);
        pendingRequests.current.delete(key);
        return data;
      }).catch((error) => {
        pendingRequests.current.delete(key);
        throw error;
      });

      pendingRequests.current.set(key, request);
      return request;
    },
    [getCached, setCached],
  );

  const invalidateCache = useCallback((key?: string) => {
    if (key) {
      cache.current.delete(key);
    } else {
      cache.current.clear();
    }
  }, []);

  return {
    getCached,
    fetchWithCache,
    setCached,
    invalidateCache,
  };
}

export function useAsync<T>(
  fetcher: () => Promise<T>,
  deps: unknown[],
  options: UseRequestCacheOptions & { enabled?: boolean } = {},
) {
  const { enabled = true, ...cacheOptions } = options;
  const { fetchWithCache } = useRequestCache<T>(cacheOptions);
  const cacheKey = JSON.stringify(deps);

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(
    async (forceRefresh = false) => {
      if (!enabled) return;

      setLoading(true);
      setError(null);

      try {
        const result = await fetchWithCache(cacheKey, fetcher, { forceRefresh });
        setData(result);
      } catch (err) {
        setError(String(err));
      } finally {
        setLoading(false);
      }
    },
    [enabled, cacheKey, fetcher, fetchWithCache],
  );

  return { data, loading, error, reload: () => load(true), load };
}
