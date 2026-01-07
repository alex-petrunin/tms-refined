import React, {memo, useState, useCallback, useEffect} from 'react';
import {useTestCases} from '../../hooks/useTestCases';
import {useTestSuites} from '../../hooks/useTestSuites';
import {LoadingState} from '../shared/LoadingState';
import {ErrorState} from '../shared/ErrorState';
import {EmptyState} from '../shared/EmptyState';
import {TestCaseList} from './TestCaseList';
import {TestCaseForm} from './TestCaseForm';
import Button from '@jetbrains/ring-ui-built/components/button/button';

interface TestCasesViewProps {
  projectId?: string;
}

export const TestCasesView = memo<TestCasesViewProps>(({projectId}) => {
  const [showForm, setShowForm] = useState(false);
  const [editingCase, setEditingCase] = useState<string | null>(null);
  const [searchInput, setSearchInput] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  
  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchInput);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [searchInput]);
  
  const {testCases, total, loading, error, refetch} = useTestCases({
    projectId,
    search: debouncedSearch,
    limit: 50
  });

  // Fetch test suites to get suite names
  const {testSuites} = useTestSuites({
    projectId,
    limit: 100
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
        caseId={editingCase}
        projectId={projectId || ''}
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
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            className="search-input"
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
          testSuites={testSuites}
          onEdit={handleEdit}
        />
      )}
    </div>
  );
});

TestCasesView.displayName = 'TestCasesView';
