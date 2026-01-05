import {useQuery} from '@tanstack/react-query';
import {useHost} from '@/widgets/common/hooks/use-host';
import {createApi} from '@/api';

export const useSettings = (projectId: string) => {
  const host = useHost();
  const api = createApi(host);

  const query = useQuery({
    queryKey: ['settings', projectId],
    queryFn: async () => {
      return await api.project.settings.GET({
        projectId
      });
    },
    enabled: !!projectId
  });

  return {
    ...query,
    loading: query.isLoading || query.isFetching,
    loaded: query.isSuccess,
    error: query.error,
    data: query.data
  };
};

