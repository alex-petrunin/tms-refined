import React, {memo, useState, useCallback} from 'react';
import {type ApiRouter} from '@/api/api';
import {useTestCases} from '../../hooks/useTestCases';
import {LoadingState} from '../shared/LoadingState';
import {ErrorState} from '../shared/ErrorState';
import {EmptyState} from '../shared/EmptyState';
import {TestCaseList} from './TestCaseList';
import {TestCaseForm} from './TestCaseForm';
import Button from '@jetbrains/ring-ui-built/components/button/button';

interface TestCasesViewProps {
  api: ReturnType<typeof import('@/api').createApi<ApiRouter>>;
  projectId?: string;
}

export const TestCasesView = memo<TestCasesViewProps>(({api, projectId}) => {
  const [showForm, setShowForm] = useState(false);
  const [editingCase, setEditingCase] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [suiteFilter, setSuiteFilter] = useState<string>('');
  
  const {testCases, total, loading, error, refetch} = useTestCases(api, {
    projectId,
    search,
    suiteId: suiteFilter || undefined,
    limit: 50
  });

  const handleCreate = useCallback(() => {
    setEditingCase(null);
    setShowForm(true);
  }, []);

  const handleEdit = useCallback((caseId: string) => {
    setEditingCase(caseId);
    setShowForm(true);
  }, []);

  const handleFormClose = useCallback(() => {
    setShowForm(false);
    setEditingCase(null);
    refetch();
  }, [refetch]);

  if (loading) {
    return <LoadingState message="Loading test cases..." />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={refetch} />;
  }

  if (showForm) {
    return (
      <TestCaseForm
        api={api}
        caseId={editingCase}
        onClose={handleFormClose}
      />
    );
  }

  return (
    <div className="test-cases-view">
      <div className="view-header">
        <div className="view-title">
          <h2>Test Cases</h2>
          <span className="count-badge">{total}</span>
        </div>
        <div className="view-actions">
          <input
            type="text"
            placeholder="Search test cases..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="search-input"
          />
          <input
            type="text"
            placeholder="Filter by suite ID..."
            value={suiteFilter}
            onChange={(e) => setSuiteFilter(e.target.value)}
            className="filter-input"
          />
          <Button primary onClick={handleCreate}>
            Create Test Case
          </Button>
        </div>
      </div>
      {testCases.length === 0 ? (
        <EmptyState
          message="No test cases found"
          actionLabel="Create Test Case"
          onAction={handleCreate}
        />
      ) : (
        <TestCaseList
          testCases={testCases}
          onEdit={handleEdit}
        />
      )}
    </div>
  );
});

TestCasesView.displayName = 'TestCasesView';

