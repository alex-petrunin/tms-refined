import { useQuery } from '@tanstack/react-query';
import { useHost } from '@/widgets/common/hooks/use-host.tsx';
import { createApi } from '@/api';

interface UseSuiteTestCasesCountOptions {
  projectId: string;
  suiteId: string;
  enabled?: boolean;
}

interface UseSuiteTestCasesCountResult {
  count: number;
  loading: boolean;
  error: Error | null;
}

interface TestCasesResponse {
  items: Array<unknown>;
  total: number;
}

/**
 * Hook to fetch live test case count for a specific test suite
 * This provides real-time data rather than cached/incremental counts
 */
export function useSuiteTestCasesCount(
  options: UseSuiteTestCasesCountOptions
): UseSuiteTestCasesCountResult {
  const host = useHost();
  const api = createApi(host);

  const {
    data,
    isLoading,
    error,
  } = useQuery<TestCasesResponse, Error>({
    queryKey: [
      'suite-test-cases-count',
      options.projectId,
      options.suiteId,
    ],
    enabled: options.enabled !== false && Boolean(options.projectId) && Boolean(options.suiteId),
    queryFn: async () => {
      const params: Record<string, unknown> = {
        projectId: options.projectId,
        suiteId: options.suiteId,
        limit: 1, // We only need the total, not the items
        offset: 0,
      };

      const response = await api.project.testCases.GET(params as any);

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
    staleTime: 10_000, // Refresh every 10 seconds for more live data
    refetchInterval: 30_000, // Auto-refetch every 30 seconds
  });

  return {
    count: data?.total ?? 0,
    loading: isLoading,
    error: error ?? null,
  };
}

