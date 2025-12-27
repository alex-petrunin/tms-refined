import {memo, useState, useCallback} from 'react';
import {useTestSuites} from '../../hooks/useTestSuites';
import {LoadingState} from '../shared/LoadingState';
import {ErrorState} from '../shared/ErrorState';
import {EmptyState} from '../shared/EmptyState';
import {TestSuiteList} from './TestSuiteList';
import {TestSuiteForm} from './TestSuiteForm';
import Button from '@jetbrains/ring-ui-built/components/button/button';

interface TestSuitesViewProps {
  projectId?: string;
}

export const TestSuitesView = memo<TestSuitesViewProps>(({projectId}) => {
  const [showForm, setShowForm] = useState(false);
  const [editingSuite, setEditingSuite] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  
  const {testSuites, total, loading, error, refetch} = useTestSuites({
    projectId,
    search,
    limit: 50
  });

  const handleCreate = useCallback(() => {
    setEditingSuite(null);
    setShowForm(true);
  }, []);

  const handleEdit = useCallback((suiteId: string) => {
    setEditingSuite(suiteId);
    setShowForm(true);
  }, []);

  const handleFormClose = useCallback(() => {
    setShowForm(false);
    setEditingSuite(null);
    refetch();
  }, [refetch]);

  if (loading) {
    return <LoadingState message="Loading test suites..." />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={refetch} />;
  }

  if (showForm) {
    return (
      <TestSuiteForm
        suiteId={editingSuite}
        projectId={projectId || ''}
        onClose={handleFormClose}
      />
    );
  }

  return (
    <div className="test-suites-view">
      <div className="view-header">
        <div className="view-title">
          <h2>Test Suites</h2>
          <span className="count-badge">{total}</span>
        </div>
        <div className="view-actions">
          <input
            type="text"
            placeholder="Search test suites..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
          <Button primary onClick={handleCreate}>
            Create Test Suite
          </Button>
        </div>
      </div>
      {testSuites.length === 0 ? (
        <EmptyState
          message="No test suites found"
          actionLabel="Create Test Suite"
          onAction={handleCreate}
        />
      ) : (
        <TestSuiteList
          suites={testSuites}
          onEdit={handleEdit}
        />
      )}
    </div>
  );
});

TestSuitesView.displayName = 'TestSuitesView';

