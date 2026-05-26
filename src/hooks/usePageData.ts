import { useCallback, useState } from 'react';

interface PageDataState<T> {
  data: T;
  loading: boolean;
  error: string | null;
}

/**
 * Generic hook for page-level data fetching with loading and error state.
 *
 * @example
 * const { data: orgs, loading, error, load } = usePageData<Entity[]>([]);
 * useEffect(() => { load(fetchEntities); }, [load]);
 */
export function usePageData<T>(initialData: T) {
  const [state, setState] = useState<PageDataState<T>>({
    data: initialData,
    loading: false,
    error: null,
  });

  const load = useCallback(async (fetcher: () => Promise<T>) => {
    setState(prev => ({ ...prev, loading: true, error: null }));
    try {
      const data = await fetcher();
      setState({ data, loading: false, error: null });
    } catch (err) {
      console.error(err);
      setState(prev => ({
        ...prev,
        loading: false,
        error: 'Failed to load data. Please try again.',
      }));
    }
  }, []);

  return {
    data: state.data,
    loading: state.loading,
    error: state.error,
    load,
  };
}
