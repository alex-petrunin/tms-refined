import { useQuery } from "@tanstack/react-query";
import { useHost } from "@/widgets/common/hooks/use-host";
import { createApi } from "@/api";

export const useTestCaseProjects = () => {
  const host = useHost();
  const api = createApi(host);
  
  return useQuery({
    queryKey: ['app', 'testCaseProjects'],
    queryFn: async () => {
      return await api.global.testCaseProject.GET({} as never);
    }
  });
};

