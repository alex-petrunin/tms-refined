import {useState, useEffect, useCallback} from 'react';
import {type ApiRouter} from '@/api/api';

interface TestRun {
  id: string;
  testCaseIDs: string[];
  testSuiteID: string;
  status: string;
  executionTarget: {
    id: string;
    name: string;
    type: string;
    ref: string;
  };
}

interface UseTestRunsOptions {
  limit?: number;
  offset?: number;
  suiteId?: string;
  status?: string;
  testCaseId?: string;
}

interface UseTestRunsResult {
  testRuns: TestRun[];
  total: number;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useTestRuns(
  api: ReturnType<typeof import('@/api').createApi<ApiRouter>>,
  options: UseTestRunsOptions = {}
): UseTestRunsResult {
  const [testRuns, setTestRuns] = useState<TestRun[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTestRuns = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params: Record<string, unknown> = {};
      if (options.limit !== undefined) params.limit = options.limit;
      if (options.offset !== undefined) params.offset = options.offset;
      if (options.suiteId) params.suiteId = options.suiteId;
      if (options.status) params.status = options.status;
      if (options.testCaseId) params.testCaseId = options.testCaseId;

      const response = await api.project.testRuns.GET(params as any);
      
      // Handle both single item and list responses
      if ('items' in response) {
        setTestRuns(response.items);
        setTotal(response.total);
      } else {
        // Single item response
        setTestRuns([response]);
        setTotal(1);
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch test runs'));
    } finally {
      setLoading(false);
    }
  }, [api, options.limit, options.offset, options.suiteId, options.status, options.testCaseId]);

  useEffect(() => {
    fetchTestRuns();
  }, [fetchTestRuns]);

  return {
    testRuns,
    total,
    loading,
    error,
    refetch: fetchTestRuns
  };
}

