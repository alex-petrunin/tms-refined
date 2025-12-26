import { useQuery } from '@tanstack/react-query';
import { useHost } from '@/widgets/common/hooks/use-host.tsx';
import { createApi } from '@/api';

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

interface TestSuitesResponse {
  items: TestSuite[];
  total: number;
}

export function useTestSuites(
    options: UseTestSuitesOptions = {}
): UseTestSuitesResult {
  const host = useHost();
  const api = createApi(host);

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<TestSuitesResponse, Error>({
    queryKey: [
      'test-suites',
      options.projectId,
      options.limit,
      options.offset,
      options.search,
    ],
    enabled: Boolean(options.projectId),
    queryFn: async () => {
      const params: Record<string, unknown> = {};

      if (options.projectId) params.projectId = options.projectId;
      if (options.limit !== undefined) params.limit = options.limit;
      if (options.offset !== undefined) params.offset = options.offset;
      if (options.search) params.search = options.search;

      const response = await api.project.testSuites.GET(params as any);

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
    testSuites: data?.items ?? [],
    total: data?.total ?? 0,
    loading: isLoading,
    error: error ?? null,
    refetch,
  };
}
