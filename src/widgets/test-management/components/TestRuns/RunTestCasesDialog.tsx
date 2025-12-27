import React, {memo, useState, useCallback} from 'react';
import Button from '@jetbrains/ring-ui-built/components/button/button';
import {Input, Size} from '@jetbrains/ring-ui-built/components/input/input';
import Dialog from '@jetbrains/ring-ui-built/components/dialog/dialog';
import {ErrorState} from '../shared/ErrorState';
import {useHost} from '@/widgets/common/hooks/use-host';
import {createApi} from '@/api';

interface RunTestCasesDialogProps {
  projectId: string;
  onClose: () => void;
}

export const RunTestCasesDialog = memo<RunTestCasesDialogProps>(({projectId, onClose}) => {
  const host = useHost();
  
  const [suiteId, setSuiteId] = useState('');
  const [testCaseIds, setTestCaseIds] = useState('');
  const [executionMode, setExecutionMode] = useState<'MANAGED' | 'OBSERVED'>('MANAGED');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!host) return;
    
    setLoading(true);
    setError(null);

    try {
      const api = createApi(host);
      const testCaseIdsArray = testCaseIds.split(',').map(id => id.trim()).filter(Boolean);
      await api.project.testRuns.POST({
        suiteID: suiteId,
        testCaseIDs: testCaseIdsArray,
        executionMode
      } as any);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to run tests'));
    } finally {
      setLoading(false);
    }
  }, [host, suiteId, testCaseIds, executionMode, onClose]);

  return (
    <Dialog
      show
      onCloseAttempt={onClose}
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
        <div className="form-field">
          <label className="form-label">Execution Mode</label>
          <div>
            <label style={{marginRight: '16px'}}>
              <input
                type="radio"
                value="MANAGED"
                checked={executionMode === 'MANAGED'}
                onChange={() => setExecutionMode('MANAGED')}
              />
              {' '}Managed
            </label>
            <label>
              <input
                type="radio"
                value="OBSERVED"
                checked={executionMode === 'OBSERVED'}
                onChange={() => setExecutionMode('OBSERVED')}
              />
              {' '}Observed
            </label>
          </div>
        </div>
        <div className="form-actions">
          <Button onClick={onClose}>Cancel</Button>
          <Button primary type="submit" disabled={loading || !suiteId || !testCaseIds}>
            {loading ? 'Running...' : 'Run Tests'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
});

RunTestCasesDialog.displayName = 'RunTestCasesDialog';
