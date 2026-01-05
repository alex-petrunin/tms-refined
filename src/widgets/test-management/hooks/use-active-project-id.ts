import { useProjectMetadata } from "./use-project-metadata";
import { useAppState } from "./use-app-state";

export const useActiveProjectId = () => {
  const { state } = useAppState();
  const projectMetadata = useProjectMetadata(state.selectedProjectKey ?? "");
  return projectMetadata?.id ?? null;
};

