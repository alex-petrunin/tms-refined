import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useHost } from '@/widgets/common/hooks/use-host.tsx';
import { createApi } from '@/api';

export interface IntegrationConfig {
  projectUrl?: string;
  pipelineRef?: string;
  token?: string;
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

