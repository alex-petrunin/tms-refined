import {memo, useState, useCallback} from 'react';
import {useTestSuites} from '../../hooks/useTestSuites';
import {LoadingState} from '../shared/LoadingState';
import {ErrorState} from '../shared/ErrorState';
import {EmptyState} from '../shared/EmptyState';
import {TestSuiteList} from './TestSuiteList';
import {TestSuiteForm} from './TestSuiteForm';
import Button from '@jetbrains/ring-ui-built/components/button/button';
import {useHost} from '@/widgets/common/hooks/use-host';
import {createApi} from '@/api';

interface TestSuitesViewProps {
  projectId?: string;
}

export const TestSuitesView = memo<TestSuitesViewProps>(({projectId}) => {
  const host = useHost();
  const [showForm, setShowForm] = useState(false);
  const [editingSuite, setEditingSuite] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  console.log(projectId);
  
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

  const handleDelete = useCallback(async (suiteId: string, _suiteName: string) => {
    if (!host || !projectId) return;
    
    setDeleting(true);
    setDeleteError(null);
    
    try {
      const api = createApi(host);
      // Cast to any to avoid type inference issues with DELETE method
      const result = await (api.project.testSuites.DELETE as any)({
        projectId,
        id: suiteId
      }) as {success: boolean; message?: string};
      
      if (result.success) {
        refetch();
      } else {
        setDeleteError(result.message || 'Failed to delete test suite');
      }
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Failed to delete test suite');
    } finally {
      setDeleting(false);
    }
  }, [host, projectId, refetch]);

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
      
      {deleteError && (
        <div className="error-message">
          {deleteError}
          <Button text onClick={() => setDeleteError(null)}>Dismiss</Button>
        </div>
      )}
      
      {testSuites.length === 0 ? (
        <EmptyState
          message="No test suites found"
          actionLabel="Create Test Suite"
          onAction={handleCreate}
        />
      ) : (
        <TestSuiteList
          projectId={projectId || ''}
          suites={testSuites}
          onEdit={handleEdit}
          onDelete={handleDelete}
          deleting={deleting}
        />
      )}
    </div>
  );
});

TestSuitesView.displayName = 'TestSuitesView';
