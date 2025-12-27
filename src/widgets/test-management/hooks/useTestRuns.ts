import { useQuery } from '@tanstack/react-query';
import { useHost } from '@/widgets/common/hooks/use-host.tsx';
import { createApi } from '@/api';

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
  projectId?: string;
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

interface TestRunsResponse {
  items: TestRun[];
  total: number;
}

export function useTestRuns(
  options: UseTestRunsOptions = {}
): UseTestRunsResult {
  const host = useHost();
  const api = createApi(host);

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<TestRunsResponse, Error>({
    queryKey: [
      'test-runs',
      options.projectId,
      options.limit,
      options.offset,
      options.suiteId,
      options.status,
      options.testCaseId,
    ],
    enabled: Boolean(options.projectId),
    queryFn: async () => {
      const params: Record<string, unknown> = {};

      if (options.projectId) params.projectId = options.projectId;
      if (options.limit !== undefined) params.limit = options.limit;
      if (options.offset !== undefined) params.offset = options.offset;
      if (options.suiteId) params.suiteId = options.suiteId;
      if (options.status) params.status = options.status;
      if (options.testCaseId) params.testCaseId = options.testCaseId;

      const response = await api.project.testRuns.GET(params as any);

      // Normalize response shape
      if ('items' in response) {
        return {
          items: response.items,
          total: response.total,
        };
      }

      return {
        items: [response],
        total: 1,
      };
    },
    keepPreviousData: true,
    staleTime: 30_000,
  });

  return {
    testRuns: data?.items ?? [],
    total: data?.total ?? 0,
    loading: isLoading,
    error: error ?? null,
    refetch,
  };
}
