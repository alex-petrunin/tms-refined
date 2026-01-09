import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useHost } from '@/widgets/common/hooks/use-host.tsx';
import { createApi } from '@/api';
import { useCallback } from 'react';

interface ExecutionTarget {
  integrationId: string;
  name: string;
  type: string;
  config: Record<string, any>;
}

interface UpdateTestCaseTargetInput {
  testCaseId: string;
  projectId: string;
  executionTarget: ExecutionTarget | null;
}

interface UpdateTestCaseTargetOptions {
  onSuccess?: (data: any) => void;
  onError?: (error: Error) => void;
  showToast?: boolean;
}

interface UseUpdateTestCaseTargetResult {
  updateTestCaseTarget: (input: UpdateTestCaseTargetInput) => Promise<void>;
  isUpdating: boolean;
  error: Error | null;
}

/**
 * Hook for updating test case execution targets with optimistic updates
 * Automatically shows toast notifications on success/error
 */
export function useUpdateTestCaseTarget(
  options: UpdateTestCaseTargetOptions = {}
): UseUpdateTestCaseTargetResult {
  const { onSuccess, onError, showToast = true } = options;
  const host = useHost();
  const api = createApi(host);
  const queryClient = useQueryClient();

  const mutation = useMutation<any, Error, UpdateTestCaseTargetInput>({
    mutationFn: async ({ testCaseId, projectId, executionTarget }) => {
      const response = await api.project.testCases.PUT({
        projectId,
        id: testCaseId,
        executionTarget: executionTarget,
      } as any);
      
      return response;
    },
    
    // Optimistic update
    onMutate: async ({ testCaseId, executionTarget }) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['test-cases'] });
      await queryClient.cancelQueries({ queryKey: ['suite-test-cases-all'] });

      // Snapshot the previous value
      const previousTestCases = queryClient.getQueryData(['test-cases']);
      const previousSuiteCases = queryClient.getQueryData(['suite-test-cases-all']);

      // Optimistically update to the new value
      queryClient.setQueriesData(
        { queryKey: ['test-cases'] },
        (old: any) => {
          if (!old) return old;
          
          if (old.items) {
            return {
              ...old,
              items: old.items.map((item: any) =>
                item.id === testCaseId
                  ? { ...item, executionTarget }
                  : item
              ),
            };
          }
          
          return old;
        }
      );

      // Return context object with the snapshotted value
      return { previousTestCases, previousSuiteCases };
    },

    // If the mutation fails, roll back to the previous value
    onError: (error, _variables, context) => {
      if (context?.previousTestCases) {
        queryClient.setQueryData(['test-cases'], context.previousTestCases);
      }
      if (context?.previousSuiteCases) {
        queryClient.setQueryData(['suite-test-cases-all'], context.previousSuiteCases);
      }

      // Show error toast
      if (showToast) {
        showErrorToast(error.message || 'Failed to update execution target');
      }

      onError?.(error);
    },

    // Always refetch after error or success
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['test-cases'] });
      queryClient.invalidateQueries({ queryKey: ['suite-test-cases-all'] });
    },

    onSuccess: (data) => {
      // Show success toast
      if (showToast) {
        showSuccessToast('Execution target updated successfully');
      }

      onSuccess?.(data);
    },
  });

  const updateTestCaseTarget = useCallback(
    async (input: UpdateTestCaseTargetInput) => {
      await mutation.mutateAsync(input);
    },
    [mutation]
  );

  return {
    updateTestCaseTarget,
    isUpdating: mutation.isPending,
    error: mutation.error,
  };
}

// Helper functions for toast notifications
// These would integrate with your toast/notification system
function showSuccessToast(message: string) {
  // Integration with toast library (e.g., react-hot-toast, sonner, etc.)
  console.log('[SUCCESS]', message);
  
  // Example with custom event for toast display
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('show-toast', {
        detail: { type: 'success', message },
      })
    );
  }
}

function showErrorToast(message: string) {
  console.error('[ERROR]', message);
  
  if (typeof window !== 'undefined') {
    window.dispatchEvent(
      new CustomEvent('show-toast', {
        detail: { type: 'error', message },
      })
    );
  }
}

