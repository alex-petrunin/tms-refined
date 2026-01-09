import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useHost } from '@/widgets/common/hooks/use-host.tsx';
import { createApi } from '@/api';
import { useState, useCallback } from 'react';

interface ExecutionTarget {
  integrationId: string;
  name: string;
  type: string;
  config: Record<string, any>;
}

interface TestCaseInSuite {
  id: string;
  issueId?: string;
  summary: string;
  description: string;
  executionTarget?: ExecutionTarget;
}

interface TestSuite {
  id: string;
  name: string;
  description: string;
  testCaseCount: number;
}

interface SuiteWithCases extends TestSuite {
  cases: TestCaseInSuite[];
  casesLoaded: boolean;
}

interface UseSuitesWithCasesOptions {
  projectId?: string;
  autoExpandAll?: boolean;
  includeExecutionTargets?: boolean;
}

interface UseSuitesWithCasesResult {
  suites: SuiteWithCases[];
  loading: boolean;
  error: Error | null;
  refetch: () => void;
  loadCasesForSuite: (suiteId: string) => Promise<void>;
}

/**
 * Hook for fetching test suites with their nested test cases
 * Supports lazy loading of test cases when suites are expanded
 */
export function useSuitesWithCases(
  options: UseSuitesWithCasesOptions = {}
): UseSuitesWithCasesResult {
  const { projectId, autoExpandAll = false, includeExecutionTargets = true } = options;
  const host = useHost();
  const api = createApi(host);
  const queryClient = useQueryClient();
  const [loadedSuiteIds, setLoadedSuiteIds] = useState<Set<string>>(new Set());

  // Fetch all test suites
  const {
    data: suitesData,
    isLoading: suitesLoading,
    error: suitesError,
    refetch: refetchSuites,
  } = useQuery<{ items: TestSuite[]; total: number }, Error>({
    queryKey: ['test-suites', projectId],
    enabled: Boolean(projectId),
    queryFn: async () => {
      const params: Record<string, unknown> = {};
      if (projectId) params.projectId = projectId;
      params.limit = 100; // Fetch up to 100 suites

      const response = await api.project.testSuites.GET(params as any);
      
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
    staleTime: 30_000,
  });

  // Fetch test cases for all suites if autoExpandAll is true
  const {
    data: allCasesData,
    isLoading: casesLoading,
    error: casesError,
    refetch: refetchCases,
  } = useQuery<Record<string, TestCaseInSuite[]>, Error>({
    queryKey: ['suite-test-cases-all', projectId, includeExecutionTargets],
    enabled: Boolean(projectId) && Boolean(suitesData) && autoExpandAll,
    queryFn: async () => {
      if (!suitesData?.items) return {};
      
      const casesMap: Record<string, TestCaseInSuite[]> = {};
      
      // Fetch cases for each suite
      await Promise.all(
        suitesData.items.map(async (suite) => {
          try {
            const response = await api.project.testCases.GET({
              projectId,
              suiteId: suite.id,
              includeExecutionTarget: includeExecutionTargets,
              limit: 100,
            } as any);
            
            const cases = 'items' in response ? response.items : [response];
            casesMap[suite.id] = cases.map(c => ({
              id: c.id,
              issueId: c.issueId,
              summary: c.summary,
              description: c.description,
              executionTarget: c.executionTarget,
            }));
          } catch (err) {
            console.error(`Failed to load cases for suite ${suite.id}:`, err);
            casesMap[suite.id] = [];
          }
        })
      );
      
      return casesMap;
    },
    staleTime: 30_000,
  });

  // Function to load cases for a specific suite (lazy loading)
  const loadCasesForSuite = useCallback(async (suiteId: string): Promise<void> => {
    if (!projectId) return;
    
    try {
      const response = await api.project.testCases.GET({
        projectId,
        suiteId: suiteId,
        includeExecutionTarget: includeExecutionTargets,
        limit: 100,
      } as any);
      
      const cases = 'items' in response ? response.items : [response];
      const formattedCases = cases.map(c => ({
        id: c.id,
        issueId: c.issueId,
        summary: c.summary,
        description: c.description,
        executionTarget: c.executionTarget,
      }));
      
      // Update the query cache with the loaded cases
      queryClient.setQueryData(
        ['suite-cases', projectId, suiteId, includeExecutionTargets],
        formattedCases
      );
      
      // Mark this suite as loaded
      setLoadedSuiteIds(prev => new Set([...prev, suiteId]));
    } catch (err) {
      console.error(`Failed to load cases for suite ${suiteId}:`, err);
      throw err;
    }
  }, [projectId, api, includeExecutionTargets, queryClient]);

  // Combine suites with their cases
  const suitesWithCases: SuiteWithCases[] = (suitesData?.items || []).map(suite => {
    // For autoExpandAll mode, use allCasesData
    if (autoExpandAll) {
      return {
        ...suite,
        cases: allCasesData?.[suite.id] || [],
        casesLoaded: Boolean(allCasesData?.[suite.id]),
      };
    }
    
    // For lazy loading mode, check individual suite cache
    const cachedCases = queryClient.getQueryData<TestCaseInSuite[]>([
      'suite-cases',
      projectId,
      suite.id,
      includeExecutionTargets,
    ]);
    
    return {
      ...suite,
      cases: cachedCases || [],
      casesLoaded: Boolean(cachedCases) || loadedSuiteIds.has(suite.id),
    };
  });

  const refetch = useCallback(() => {
    refetchSuites();
    if (autoExpandAll) {
      refetchCases();
    } else {
      // Refetch all loaded suites
      loadedSuiteIds.forEach(suiteId => {
        queryClient.invalidateQueries({
          queryKey: ['suite-cases', projectId, suiteId, includeExecutionTargets],
        });
      });
    }
  }, [refetchSuites, refetchCases, autoExpandAll, loadedSuiteIds, queryClient, projectId, includeExecutionTargets]);

  return {
    suites: suitesWithCases,
    loading: suitesLoading || (autoExpandAll && casesLoading),
    error: suitesError || casesError || null,
    refetch,
    loadCasesForSuite,
  };
}

