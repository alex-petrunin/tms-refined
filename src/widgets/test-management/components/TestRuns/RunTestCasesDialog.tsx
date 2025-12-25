import React, {memo, useState, useCallback} from 'react';
import {type ApiRouter} from '@/api/api';
import Button from '@jetbrains/ring-ui-built/components/button/button';
import {Input, Size} from '@jetbrains/ring-ui-built/components/input/input';
import Dialog from '@jetbrains/ring-ui-built/components/dialog/dialog';
import {ErrorState} from '../shared/ErrorState';

interface RunTestCasesDialogProps {
  api: ReturnType<typeof import('@/api').createApi<ApiRouter>>;
  onClose: () => void;
}

export const RunTestCasesDialog = memo<RunTestCasesDialogProps>(({api, onClose}) => {
  const [suiteId, setSuiteId] = useState('');
  const [testCaseIds, setTestCaseIds] = useState('');
  const [executionMode, setExecutionMode] = useState<'MANAGED' | 'OBSERVED'>('MANAGED');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const testCaseIdsArray = testCaseIds.split(',').map(id => id.trim()).filter(Boolean);
      await api.project.testRuns.POST({
        suiteID: suiteId,
        testCaseIDs: testCaseIdsArray,
        executionMode
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to run tests'));
    } finally {
      setLoading(false);
    }
  }, [api, suiteId, testCaseIds, executionMode, onClose]);

  return (
    <Dialog
      show
      onClose={onClose}
      label="Run Test Cases"
    >
      <form onSubmit={handleSubmit}>
        {error && <ErrorState error={error} />}
        <Input
          label="Test Suite ID"
          value={suiteId}
          onChange={(e) => setSuiteId(e.target.value)}
          required
          size={Size.FULL}
        />
        <Input
          label="Test Case IDs (comma-separated)"
          value={testCaseIds}
          onChange={(e) => setTestCaseIds(e.target.value)}
          required
          size={Size.FULL}
        />
        <div>
          <label>
            <input
              type="radio"
              value="MANAGED"
              checked={executionMode === 'MANAGED'}
              onChange={() => setExecutionMode('MANAGED')}
            />
            Managed
          </label>
          <label>
            <input
              type="radio"
              value="OBSERVED"
              checked={executionMode === 'OBSERVED'}
              onChange={() => setExecutionMode('OBSERVED')}
            />
            Observed
          </label>
        </div>
        <div className="form-actions">
          <Button onClick={onClose}>Cancel</Button>
          <Button primary type="submit" disabled={loading || !suiteId || !testCaseIds}>
            Run Tests
          </Button>
        </div>
      </form>
    </Dialog>
  );
});

RunTestCasesDialog.displayName = 'RunTestCasesDialog';

