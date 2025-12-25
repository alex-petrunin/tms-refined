import {useState, useEffect, useCallback} from 'react';
import {type ApiRouter} from '@/api/api';

interface TestCase {
  id: string;
  summary: string;
  description: string;
  executionTargetSnapshot?: {
    id: string;
    name: string;
    type: string;
    ref: string;
  };
}

interface UseTestCasesOptions {
  projectId?: string;
  limit?: number;
  offset?: number;
  search?: string;
  suiteId?: string;
}

interface UseTestCasesResult {
  testCases: TestCase[];
  total: number;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useTestCases(
  api: ReturnType<typeof import('@/api').createApi<ApiRouter>>,
  options: UseTestCasesOptions = {}
): UseTestCasesResult {
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTestCases = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, unknown> = {};
      if (options.projectId) params.projectId = options.projectId;
      if (options.limit !== undefined) params.limit = options.limit;
      if (options.offset !== undefined) params.offset = options.offset;
      if (options.search) params.search = options.search;
      if (options.suiteId) params.suiteId = options.suiteId;

      const response = await api.project.testCases.GET(params as any);
      
      // Handle both single item and list responses
      if ('items' in response) {
        setTestCases(response.items);
        setTotal(response.total);
      } else {
        // Single item response
        setTestCases([response]);
        setTotal(1);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch test cases'));
    } finally {
      setLoading(false);
    }
  }, [api, options.projectId, options.limit, options.offset, options.search, options.suiteId]);

  useEffect(() => {
    fetchTestCases();
  }, [fetchTestCases]);

  return {
    testCases,
    total,
    loading,
    error,
    refetch: fetchTestCases
  };
}

