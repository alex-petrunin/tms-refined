import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useHost } from '@/widgets/common/hooks/use-host.tsx';
import { createApi } from '@/api';

export interface IntegrationConfig {
  projectUrl?: string;
  projectId?: string;
  baseUrl?: string;
  pipelineRef?: string;
  token?: string;
  apiToken?: string;
  webhookSecret?: string;
}

export interface Integration {
  id: string;
  name: string;
  type: 'GITLAB' | 'GITHUB' | 'MANUAL';
  enabled: boolean;
  config: IntegrationConfig;
}

interface UseIntegrationsOptions {
  projectId?: string;
  type?: Integration['type'];
  enabled?: boolean;
}

interface UseIntegrationsResult {
  integrations: Integration[];
  total: number;
  loading: boolean;
  error: Error | null;
  refetch: () => void;
  createIntegration: (data: Omit<Integration, 'id'>) => Promise<Integration>;
  updateIntegration: (id: string, data: Partial<Omit<Integration, 'id'>>) => Promise<Integration>;
  deleteIntegration: (id: string) => Promise<void>;
  isCreating: boolean;
  isUpdating: boolean;
  isDeleting: boolean;
}

interface IntegrationsResponse {
  items: Integration[];
  total: number;
}

export function useIntegrations(
    options: UseIntegrationsOptions = {}
): UseIntegrationsResult {
  const host = useHost();
  const api = createApi(host);
  const queryClient = useQueryClient();

  const queryKey = [
    'integrations',
    options.projectId,
    options.type,
    options.enabled,
  ];

  const {
    data,
    isLoading,
    error,
    refetch,
  } = useQuery<IntegrationsResponse, Error>({
    queryKey,
    enabled: Boolean(options.projectId),
    queryFn: async () => {
      const params: Record<string, unknown> = {};

      if (options.projectId) params.projectId = options.projectId;
      if (options.type !== undefined) params.type = options.type;
      if (options.enabled !== undefined) params.enabled = options.enabled;

      const response = await api.project.integrations.GET(params as any);

      if ('items' in response) {
        return {
          items: response.items,
          total: response.total,
        };
      }

      return {
        items: [],
        total: 0,
      };
    },
    keepPreviousData: true,
    staleTime: 30_000,
  });

  const createMutation = useMutation({
    mutationFn: async (newIntegration: Omit<Integration, 'id'>) => {
      const response = await api.project.integrations.POST({
        projectId: options.projectId!,
        ...newIntegration,
      } as any);
      return response as Integration;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<Omit<Integration, 'id'>> }) => {
      const response = await api.project.integrations.PUT({
        projectId: options.projectId!,
        id,
        ...data,
      } as any);
      return response as Integration;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.project.integrations.DELETE({
        projectId: options.projectId!,
        id,
      } as any);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey });
    },
  });

  return {
    integrations: data?.items ?? [],
    total: data?.total ?? 0,
    loading: isLoading,
    error: error ?? null,
    refetch,
    createIntegration: async (newData) => {
      return createMutation.mutateAsync(newData);
    },
    updateIntegration: async (id, updateData) => {
      return updateMutation.mutateAsync({ id, data: updateData });
    },
    deleteIntegration: async (id) => {
      await deleteMutation.mutateAsync(id);
    },
    isCreating: createMutation.isLoading,
    isUpdating: updateMutation.isLoading,
    isDeleting: deleteMutation.isLoading,
  };
}

/**
 * Interface for execution target dropdown options
 */
export interface ExecutionTargetOption {
  key: string; // integrationId
  label: string; // e.g., "Manual: QA Team" or "GitLab CI: Staging"
  type: 'MANUAL' | 'GITLAB' | 'GITHUB';
  integration: Integration;
}

/**
 * Helper function to format integrations for RingUI Select dropdown
 * Returns options in format: {key: integrationId, label: "GitLab CI: Staging", type: "GITLAB"}
 * Only includes enabled integrations by default
 */
export function formatIntegrationsForSelect(
  integrations: Integration[],
  includeDisabled = false
): ExecutionTargetOption[] {
  return integrations
    .filter(integration => includeDisabled || integration.enabled)
    .map(integration => {
      const typeLabel = getIntegrationTypeLabel(integration.type);
      return {
        key: integration.id,
        label: `${typeLabel}: ${integration.name}`,
        type: integration.type,
        integration,
      };
    })
    .sort((a, b) => {
      // Sort by type first (Manual, then GitLab, then GitHub), then by name
      const typeOrder = { MANUAL: 0, GITLAB: 1, GITHUB: 2 };
      const typeCompare = typeOrder[a.type] - typeOrder[b.type];
      if (typeCompare !== 0) return typeCompare;
      return a.label.localeCompare(b.label);
    });
}

/**
 * Get human-readable label for integration type
 */
function getIntegrationTypeLabel(type: Integration['type']): string {
  switch (type) {
    case 'MANUAL':
      return 'Manual';
    case 'GITLAB':
      return 'GitLab CI';
    case 'GITHUB':
      return 'GitHub Actions';
    default:
      return type;
  }
}

/**
 * Hook specifically for fetching integrations formatted as Select options
 */
export function useIntegrationOptions(projectId?: string, includeDisabled = false) {
  const { integrations, loading, error, refetch } = useIntegrations({
    projectId,
    enabled: includeDisabled ? undefined : true,
  });

  const options = formatIntegrationsForSelect(integrations, includeDisabled);

  return {
    options,
    loading,
    error,
    refetch,
  };
}

