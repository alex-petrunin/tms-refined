import React, { memo, useState, useCallback, useRef, useEffect } from 'react';
import Button from '@jetbrains/ring-ui-built/components/button/button';
import Input from '@jetbrains/ring-ui-built/components/input/input';
import { ExecutionTargetCell } from './ExecutionTargetCell';
import './inline-test-case-creator.css';

interface ExecutionTarget {
  integrationId: string;
  name: string;
  type: string;
  config: Record<string, any>;
}

interface InlineTestCaseCreatorProps {
  suiteId: string;
  projectId: string;
  onSave: (data: { summary: string; description: string; executionTarget?: ExecutionTarget }) => Promise<void>;
  onCancel: () => void;
  autoFocus?: boolean;
}

/**
 * InlineTestCaseCreator Component
 * Provides an inline form for quickly creating test cases within a suite
 * Appears as an editable row when "+ Add Case" is clicked
 */
export const InlineTestCaseCreator: React.FC<InlineTestCaseCreatorProps> = memo(({
  suiteId,
  projectId,
  onSave,
  onCancel,
  autoFocus = true,
}) => {
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [executionTarget, setExecutionTarget] = useState<ExecutionTarget | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!summary.trim()) {
      setError('Summary is required');
      return;
    }

    setIsSaving(true);
    setError(null);

    try {
      await onSave({
        summary: summary.trim(),
        description: description.trim(),
        executionTarget: executionTarget || undefined,
      });

      // Reset form
      setSummary('');
      setDescription('');
      setExecutionTarget(null);
    } catch (err) {
      console.error('Failed to create test case:', err);
      setError(err instanceof Error ? err.message : 'Failed to create test case');
    } finally {
      setIsSaving(false);
    }
  }, [summary, description, executionTarget, onSave]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    setSummary('');
    setDescription('');
    setExecutionTarget(null);
    setError(null);
    onCancel();
  }, [onCancel]);

  // Handle Enter key
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      handleSave();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
  }, [handleSave, handleCancel]);

  return (
    <div className="inline-test-case-creator" role="form" onKeyDown={handleKeyDown}>
      <div className="inline-creator-row">
        {/* Icon placeholder */}
        <div className="inline-creator-cell">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" />
          </svg>
        </div>

        {/* Summary input */}
        <div className="inline-creator-cell inline-creator-input-cell">
          <Input
            value={summary}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSummary(e.target.value)}
            placeholder="Enter test case summary..."
            disabled={isSaving}
            autoComplete="off"
            autoFocus={autoFocus}
          />
        </div>

        {/* Description input */}
        <div className="inline-creator-cell inline-creator-input-cell">
          <Input
            value={description}
            onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDescription(e.target.value)}
            placeholder="Description (optional)"
            disabled={isSaving}
            autoComplete="off"
          />
        </div>

        {/* Execution target (placeholder for now) */}
        <div className="inline-creator-cell">
          <span style={{ fontSize: 13, color: 'var(--ring-secondary-color)' }}>
            Not set
          </span>
        </div>

        {/* Status placeholder */}
        <div className="inline-creator-cell">
          {/* Empty */}
        </div>

        {/* Action buttons */}
        <div className="inline-creator-cell inline-creator-actions">
          <Button
            primary
            onClick={handleSave}
            disabled={!summary.trim() || isSaving}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
          <Button
            onClick={handleCancel}
            disabled={isSaving}
          >
            Cancel
          </Button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="inline-creator-error">
          <span style={{ color: 'var(--ring-error-color)' }}>⚠ {error}</span>
        </div>
      )}

      {/* Help text */}
      <div className="inline-creator-help">
        <span style={{ fontSize: 12, color: 'var(--ring-secondary-color)' }}>
          Press Ctrl+Enter to save, Escape to cancel
        </span>
      </div>
    </div>
  );
});

InlineTestCaseCreator.displayName = 'InlineTestCaseCreator';

