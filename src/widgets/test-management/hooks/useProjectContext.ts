import {useState, useEffect, useCallback} from 'react';
import {type ApiRouter} from '@/api/api';

// AppSettings type matching backend definition
interface AppSettings {
  testCaseProjects?: Array<{id: string; key: string; name?: string; [key: string]: unknown}>;
  testRunProjects?: Array<{id: string; key: string; name?: string; [key: string]: unknown}>;
  testSuiteProjects?: Array<{id: string; key: string; name?: string; [key: string]: unknown}>;
  testCaseIssueType?: string;
  testRunIssueType?: string;
  testSuiteCustomFieldName?: string;
  [key: string]: unknown;
}

interface ProjectContext {
  projectId: string | null;
  projectKey: string | null;
  projectName?: string;
  settings: AppSettings;
}

interface UseProjectContextResult {
  projectId: string | null;
  projectKey: string | null;
  projectName?: string;
  settings: AppSettings;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

export function useProjectContext(
  api: ReturnType<typeof import('@/api').createApi<ApiRouter>>
): UseProjectContextResult {
  const [context, setContext] = useState<ProjectContext>({
    projectId: null,
    projectKey: null,
    settings: {} as AppSettings
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchContext = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      // Try to get projectId from YTApp.entity as fallback for query parameter
      let projectId: string | undefined;
      if (YTApp.entity?.type === 'project') {
        projectId = (YTApp.entity as any).key || YTApp.entity.id;
      }

      const response = await api.global.context.GET({ projectId });
      
      // Prefer projectKey over projectId (as per original getProjectId logic)
      setContext({
        projectId: response.projectId,
        projectKey: response.projectKey,
        projectName: undefined, // Not available in global context
        settings: response.settings
      });
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to fetch project context'));
    } finally {
      setLoading(false);
    }
  }, [api]);

  useEffect(() => {
    fetchContext();
  }, [fetchContext]);

  return {
    projectId: context.projectKey || context.projectId,
    projectKey: context.projectKey,
    projectName: context.projectName,
    settings: context.settings,
    loading,
    error,
    refetch: fetchContext
  };
}

