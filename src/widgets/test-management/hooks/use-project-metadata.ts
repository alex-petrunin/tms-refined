import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useHost } from "@/widgets/common/hooks/use-host";

export const useProjectMetadata = (
  projectKey: string,
): { id: string; iconUrl: string; name: string; key: string } | null => {
  const host = useHost();
  const { data } = useQuery({
    queryKey: ["projectIds"],
    queryFn: async () => {
      const data = await host.fetchYouTrack("admin/projects", {
        query: { fields: "id,shortName,name,iconUrl" },
      });
      return (
        data as Array<{
          id: string;
          shortName: string;
          name: string;
          iconUrl: string;
        }>
      ).map((p) => ({
        key: p.shortName,
        id: p.id,
        iconUrl: p.iconUrl,
        name: p.name,
      }));
    },
  });
  
  return useMemo(() => {
    const project = data?.find((p) => p.key === projectKey);
    return project ?? null;
  }, [data, projectKey]);
};

