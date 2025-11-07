/**
 * Dashboard Data Hook
 * Custom hook for fetching and caching dashboard data
 */

import { useState, useCallback, useRef } from 'react';
import { fetchWithRetry, isDataStale } from '../utils/dashboardHelpers';

interface CachedData<T> {
  data: T | null;
  timestamp: number;
}

interface UseDashboardDataOptions {
  maxAge?: number; // Maximum age of cached data in milliseconds
  retries?: number; // Number of retry attempts
  onError?: (error: Error) => void; // Error callback
}

/**
 * Custom hook for fetching and caching dashboard data
 * @param fetchFn - Function to fetch data
 * @param options - Options for data fetching
 * @returns Data, loading state, error, and refresh function
 */
export function useDashboardData<T>(
  fetchFn: () => Promise<T>,
  options: UseDashboardDataOptions = {}
) {
  const {
    maxAge = 5 * 60 * 1000, // 5 minutes default
    retries = 3,
    onError,
  } = options;

  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const cacheRef = useRef<CachedData<T>>({ data: null, timestamp: 0 });

  /**
   * Fetch data with caching and retry logic
   */
  const fetchData = useCallback(
    async (forceRefresh = false) => {
      try {
        // Check if we have cached data and it's not stale
        if (
          !forceRefresh &&
          cacheRef.current.data &&
          !isDataStale(cacheRef.current.timestamp, maxAge)
        ) {
          setData(cacheRef.current.data);
          return cacheRef.current.data;
        }

        setLoading(true);
        setError(null);

        const result = await fetchWithRetry(fetchFn, retries);

        // Update cache
        cacheRef.current = {
          data: result,
          timestamp: Date.now(),
        };

        setData(result);
        setLoading(false);
        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Unknown error');
        setError(error);
        setLoading(false);
        
        if (onError) {
          onError(error);
        }
        
        return null;
      }
    },
    [fetchFn, maxAge, retries, onError]
  );

  /**
   * Refresh data (force fetch)
   */
  const refresh = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  /**
   * Clear cached data
   */
  const clearCache = useCallback(() => {
    cacheRef.current = { data: null, timestamp: 0 };
    setData(null);
  }, []);

  return {
    data,
    loading,
    error,
    fetchData,
    refresh,
    clearCache,
  };
}

/**
 * Hook for managing multiple loading states
 */
export function useLoadingStates() {
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});

  const setLoading = useCallback((key: string, value: boolean) => {
    setLoadingStates((prev) => ({
      ...prev,
      [key]: value,
    }));
  }, []);

  const isAnyLoading = useCallback(() => {
    return Object.values(loadingStates).some((loading) => loading);
  }, [loadingStates]);

  const resetAll = useCallback(() => {
    setLoadingStates({});
  }, []);

  return {
    loadingStates,
    setLoading,
    isAnyLoading,
    resetAll,
  };
}


