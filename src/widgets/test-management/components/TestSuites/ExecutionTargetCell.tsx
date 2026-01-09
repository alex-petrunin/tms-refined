import React, { memo, useState, useCallback, useMemo } from 'react';
import Select from '@jetbrains/ring-ui-built/components/select/select';
import Loader from '@jetbrains/ring-ui-built/components/loader/loader';
import { useIntegrationOptions } from '../../hooks/useIntegrations';
import { useUpdateTestCaseTarget } from '../../hooks/useUpdateTestCaseTarget';

interface ExecutionTarget {
  integrationId: string;
  name: string;
  type: string;
  config: Record<string, any>;
}

interface ExecutionTargetCellProps {
  testCaseId: string;
  projectId: string;
  currentTarget?: ExecutionTarget;
  onTargetUpdated?: (target: ExecutionTarget | null) => void;
  disabled?: boolean;
}

/**
 * ExecutionTargetCell Component
 * Displays an inline dropdown for selecting execution targets
 * Auto-saves changes and shows loading/error states
 */
export const ExecutionTargetCell: React.FC<ExecutionTargetCellProps> = memo(({
  testCaseId,
  projectId,
  currentTarget,
  onTargetUpdated,
  disabled = false,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch available integration options
  const {
    options: integrationOptions,
    loading: optionsLoading,
  } = useIntegrationOptions(projectId);

  // Hook for updating test case target
  const { updateTestCaseTarget } = useUpdateTestCaseTarget({
    onSuccess: () => {
      setIsSaving(false);
      setError(null);
    },
    onError: (err) => {
      setIsSaving(false);
      setError(err.message);
    },
    showToast: true,
  });

  // Convert integrations to Select options format
  const selectOptions = useMemo(() => {
    return integrationOptions.map(option => ({
      key: option.key,
      label: option.label,
      type: option.type,
      rgItemType: Select.Type.ITEM,
    }));
  }, [integrationOptions]);

  // Find currently selected option
  const selectedOption = useMemo(() => {
    if (!currentTarget) return null;
    return selectOptions.find(opt => opt.key === currentTarget.integrationId) || null;
  }, [currentTarget, selectOptions]);

  // Handle selection change
  const handleChange = useCallback(async (selected: any) => {
    if (disabled || isSaving) return;

    setIsSaving(true);
    setError(null);

    try {
      let newTarget: ExecutionTarget | null = null;

      if (selected && selected.key) {
        // Find the full integration data
        const integration = integrationOptions.find(opt => opt.key === selected.key);
        
        if (integration) {
          newTarget = {
            integrationId: integration.key,
            name: integration.integration.name,
            type: integration.type,
            config: integration.integration.config,
          };
        }
      }

      // Update via API
      await updateTestCaseTarget({
        testCaseId,
        projectId,
        executionTarget: newTarget,
      });

      // Notify parent
      if (onTargetUpdated) {
        onTargetUpdated(newTarget);
      }
    } catch (err) {
      console.error('Failed to update execution target:', err);
      setError(err instanceof Error ? err.message : 'Update failed');
    }
  }, [
    disabled,
    isSaving,
    testCaseId,
    projectId,
    integrationOptions,
    updateTestCaseTarget,
    onTargetUpdated,
  ]);

  // Show loading state
  if (optionsLoading) {
    return (
      <div className="execution-target-cell">
        <Loader />
      </div>
    );
  }

  // Show saving state
  if (isSaving) {
    return (
      <div className="execution-target-cell" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Loader inline />
        <span style={{ fontSize: 13, color: 'var(--ring-secondary-color)' }}>
          Saving...
        </span>
      </div>
    );
  }

  // Show error state
  if (error) {
    return (
      <div className="execution-target-cell" style={{ color: 'var(--ring-error-color)', fontSize: 13 }}>
        <span title={error}>⚠ Error</span>
      </div>
    );
  }

  return (
    <div className="execution-target-cell" onClick={(e) => e.stopPropagation()}>
      <Select
        data={selectOptions}
        selected={selectedOption}
        onChange={handleChange}
        filter
        disabled={disabled}
        placeholder="Select target..."
        label="Execution Target"
        size={Select.Size.S}
      />
    </div>
  );
});

ExecutionTargetCell.displayName = 'ExecutionTargetCell';

/**
 * Simple read-only display of execution target
 * Used when auto-save functionality is not needed
 */
export const ExecutionTargetDisplay: React.FC<{
  target?: ExecutionTarget;
  showWarning?: boolean;
}> = memo(({ target, showWarning = false }) => {
  if (!target) {
    return (
      <div style={{ fontSize: 13, color: 'var(--ring-secondary-color)' }}>
        {showWarning && (
          <span title="This test case needs an execution target to run">⚠ </span>
        )}
        Not set
      </div>
    );
  }

  // Get type icon
  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'GITLAB':
        return '🦊';
      case 'GITHUB':
        return '🐙';
      case 'MANUAL':
        return '👤';
      default:
        return '•';
    }
  };

  return (
    <div style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
      <span>{getTypeIcon(target.type)}</span>
      <span>{target.name}</span>
    </div>
  );
});

ExecutionTargetDisplay.displayName = 'ExecutionTargetDisplay';

