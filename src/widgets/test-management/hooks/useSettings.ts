import { useQuery } from '@tanstack/react-query';
import { type HostAPI } from '../../../../@types/globals';
import {Project} from "@jetbrains/youtrack-enhanced-dx-tools/youtrack-types";

interface AppSettingsRes {
  testCaseProjects?: Project | null;
  testRunProjects?: Project | null;
  testSuiteProjects?: Project | null;
  testCaseIssueType?: string | null;
  testRunIssueType?: string | null;
  testSuiteCustomFieldName?: string | null;
}

interface UseSettingsResult {
  settings: AppSettings;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
}

/**
 * Fetch global App settings using TanStack Query.
 *
 * - Uses host.fetchApp with scope: false for global settings
 * - Cached by queryKey
 * - Automatically handles loading, error, and refetch
 */
export function useSettings(host: HostAPI): UseSettingsResult {
  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<AppSettingsRes, Error>({
    queryKey: ['app-settings', 'global'],
    queryFn: async () => {
      return (await host.fetchApp('global/settings', {
        method: 'GET',
        scope: false, // Global endpoints don't require entity context
      })) as AppSettingsRes;
    },
    enabled: Boolean(host),
    staleTime: 5 * 60 * 1000, // cache for 5 minutes (adjust as needed)
  });

  return {
    settings: data ?? ({} as AppSettings),
    loading: isLoading,
    error: error ?? null,
    refetch,
  };
}
