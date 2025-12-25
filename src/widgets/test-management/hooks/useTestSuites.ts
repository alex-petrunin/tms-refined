import {useState, useEffect, useCallback} from 'react';
import {type ApiRouter} from '@/api/api';

interface TestSuite {
  id: string;
  name: string;
  description: string;
  testCaseIDs: string[];
}

interface UseTestSuitesOptions {
  projectId?: string;
  limit?: number;
  offset?: number;
  search?: string;
}

interface UseTestSuitesResult {
  testSuites: TestSuite[];
  total: number;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useTestSuites(
  api: ReturnType<typeof import('@/api').createApi<ApiRouter>>,
  options: UseTestSuitesOptions = {}
): UseTestSuitesResult {
  const [testSuites, setTestSuites] = useState<TestSuite[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTestSuites = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, unknown> = {};
      if (options.projectId) params.projectId = options.projectId;
      if (options.limit !== undefined) params.limit = options.limit;
      if (options.offset !== undefined) params.offset = options.offset;
      if (options.search) params.search = options.search;

      const response = await api.project.testSuites.GET(params as any);
      
      // Handle both single item and list responses
      if ('items' in response) {
        setTestSuites(response.items);
        setTotal(response.total);
      } else {
        // Single item response
        setTestSuites([response]);
        setTotal(1);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch test suites'));
    } finally {
      setLoading(false);
    }
  }, [api, options.projectId, options.limit, options.offset, options.search]);

  useEffect(() => {
    fetchTestSuites();
  }, [fetchTestSuites]);

  return {
    testSuites,
    total,
    loading,
    error,
    refetch: fetchTestSuites
  };
}

