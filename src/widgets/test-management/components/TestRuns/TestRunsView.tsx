import React, {memo, useState, useCallback} from 'react';
import {useTestRuns} from '../../hooks/useTestRuns';
import {LoadingState} from '../shared/LoadingState';
import {ErrorState} from '../shared/ErrorState';
import {EmptyState} from '../shared/EmptyState';
import {TestRunList} from './TestRunList';
import {RunTestCasesDialog} from './RunTestCasesDialog';
import Button from '@jetbrains/ring-ui-built/components/button/button';

interface TestRunsViewProps {
  projectId?: string;
}

export const TestRunsView = memo<TestRunsViewProps>(({projectId}) => {
  const [showRunDialog, setShowRunDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [suiteFilter, setSuiteFilter] = useState<string>('');
  
  const {testRuns, total, loading, error, refetch} = useTestRuns({
    projectId,
    status: statusFilter || undefined,
    suiteId: suiteFilter || undefined,
    limit: 50
  });

  const handleRunTests = useCallback(() => {
    setShowRunDialog(true);
  }, []);

  const handleDialogClose = useCallback(() => {
    setShowRunDialog(false);
    refetch();
  }, [refetch]);

  if (loading) {
    return <LoadingState message="Loading test runs..." />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={refetch} />;
  }

  return (
    <div className="test-runs-view">
      <div className="view-header">
        <div className="view-title">
          <h2>Test Runs</h2>
          <span className="count-badge">{total}</span>
        </div>
        <div className="view-actions">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="">All Statuses</option>
            <option value="PENDING">Pending</option>
            <option value="RUNNING">Running</option>
            <option value="PASSED">Passed</option>
            <option value="FAILED">Failed</option>
            <option value="AWAITING_EXTERNAL_RESULTS">Awaiting Results</option>
          </select>
          <input
            type="text"
            placeholder="Filter by suite ID..."
            value={suiteFilter}
            onChange={(e) => setSuiteFilter(e.target.value)}
            className="filter-input"
          />
          <Button primary onClick={handleRunTests}>
            Run Tests
          </Button>
        </div>
      </div>
      {showRunDialog && (
        <RunTestCasesDialog
          projectId={projectId || ''}
          onClose={handleDialogClose}
        />
      )}
      {testRuns.length === 0 ? (
        <EmptyState
          message="No test runs found"
          actionLabel="Run Tests"
          onAction={handleRunTests}
        />
      ) : (
        <TestRunList testRuns={testRuns} />
      )}
    </div>
  );
});

TestRunsView.displayName = 'TestRunsView';
