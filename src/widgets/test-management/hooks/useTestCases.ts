import { useQuery } from '@tanstack/react-query';
import { useHost } from '@/widgets/common/hooks/use-host.tsx';
import { createApi } from '@/api';

interface TestCase {
  id: string;
  issueId?: string;
  summary: string;
  description: string;
  suiteId?: string;
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

interface TestCasesResponse {
  items: TestCase[];
  total: number;
}

export function useTestCases(
  options: UseTestCasesOptions = {}
): UseTestCasesResult {
  const host = useHost();
  const api = createApi(host);

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<TestCasesResponse, Error>({
    queryKey: [
      'test-cases',
      options.projectId,
      options.limit,
      options.offset,
      options.search,
      options.suiteId,
    ],
    enabled: Boolean(options.projectId),
    queryFn: async () => {
      const params: Record<string, unknown> = {};

      if (options.projectId) params.projectId = options.projectId;
      if (options.limit !== undefined) params.limit = options.limit;
      if (options.offset !== undefined) params.offset = options.offset;
      if (options.search) params.search = options.search;
      if (options.suiteId) params.suiteId = options.suiteId;

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
    keepPreviousData: true,
    staleTime: 30_000,
  });

  return {
    testCases: data?.items ?? [],
    total: data?.total ?? 0,
    loading: isLoading,
    error: error ?? null,
    refetch,
  };
}
