import {memo, useState, useCallback, useMemo} from 'react';
import {LoadingState} from '../shared/LoadingState';
import {ErrorState} from '../shared/ErrorState';
import {TestSuiteForm} from './TestSuiteForm';
import {RunTestCasesDialog} from '../TestRuns/RunTestCasesDialog';
import Button from '@jetbrains/ring-ui-built/components/button/button';
import {useHost} from '@/widgets/common/hooks/use-host';
import {createApi} from '@/api';

// New imports for hierarchical view
import {useSuitesWithCases} from '../../hooks/useSuitesWithCases';
import {useBulkTestCaseActions} from '../../hooks/useBulkTestCaseActions';
import {HierarchicalTestSuiteTable} from './HierarchicalTestSuiteTable';
import {BulkActionsToolbar} from './BulkActionsToolbar';
import {TestCaseInspector} from './TestCaseInspector';
import {HierarchicalSearch, filterSuitesTreeAware} from './HierarchicalSearch';
import {ActiveRunsPanel} from './ActiveRunsPanel';

interface TestSuitesViewProps {
  projectId?: string;
}

export const TestSuitesView = memo<TestSuitesViewProps>(({projectId}) => {
  const host = useHost();
  const [showForm, setShowForm] = useState(false);
  const [editingSuite, setEditingSuite] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [showRunDialog, setShowRunDialog] = useState(false);
  const [preSelectedSuiteId, setPreSelectedSuiteId] = useState<string | undefined>(undefined);

  // Hierarchical view state
  const [expandedSuiteIds, setExpandedSuiteIds] = useState<Set<string>>(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [inspectorState, setInspectorState] = useState<{
    open: boolean;
    caseId: string | null;
  }>({ open: false, caseId: null });
  const [activeRuns, setActiveRuns] = useState<any[]>([]);
  const [addingCaseToSuiteId, setAddingCaseToSuiteId] = useState<string | null>(null);

  console.log(projectId);
  
  // Use the new hierarchical data hook
  const {suites, loading, error, refetch, loadCasesForSuite} = useSuitesWithCases({
    projectId,
    autoExpandAll: false,
    includeExecutionTargets: true,
  });

  // Bulk selection logic
  const {
    selectedCaseIds,
    selectCase,
    deselectCase,
    clearSelection,
    selectedCount,
  } = useBulkTestCaseActions({
    onRunSelected: () => {
      // Will be handled by handleBulkRun
    },
  });

  // Filter suites based on search query
  const filteredSuites = useMemo(() => {
    if (!searchQuery) return suites;
    return filterSuitesTreeAware(suites as any, searchQuery) as typeof suites;
  }, [suites, searchQuery]);

  const handleCreate = useCallback(() => {
    setEditingSuite(null);
    setShowForm(true);
  }, []);

  const handleEdit = useCallback((suiteId: string) => {
    setEditingSuite(suiteId);
    setShowForm(true);
  }, []);

  // TODO: Add delete functionality when needed
  // const handleDelete = useCallback(async (suiteId: string, _suiteName: string) => {
  //   if (!host || !projectId) return;
  //   
  //   setDeleteError(null);
  //   
  //   try {
  //     const api = createApi(host);
  //     const result = await (api.project.testSuites.DELETE as any)({
  //       projectId,
  //       id: suiteId
  //     }) as {success: boolean; message?: string};
  //     
  //     if (result.success) {
  //       refetch();
  //     } else {
  //       setDeleteError(result.message || 'Failed to delete test suite');
  //     }
  //   } catch (err) {
  //     setDeleteError(err instanceof Error ? err.message : 'Failed to delete test suite');
  //   }
  // }, [host, projectId, refetch]);

  const handleFormClose = useCallback(() => {
    setShowForm(false);
    setEditingSuite(null);
    refetch();
  }, [refetch]);

  const handleRunDialogClose = useCallback(() => {
    setShowRunDialog(false);
    setPreSelectedSuiteId(undefined);
  }, []);

  // New handlers for hierarchical view
  const handleToggleExpand = useCallback((suiteId: string) => {
    setExpandedSuiteIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(suiteId)) {
        newSet.delete(suiteId);
      } else {
        newSet.add(suiteId);
        // Load cases when expanding a suite
        loadCasesForSuite(suiteId).catch(err => {
          console.error('Failed to load cases:', err);
        });
      }
      return newSet;
    });
  }, [loadCasesForSuite]);

  const handleSelectCase = useCallback((caseId: string, selected: boolean) => {
    if (selected) {
      selectCase(caseId);
    } else {
      deselectCase(caseId);
    }
  }, [selectCase, deselectCase]);

  const handleCaseClick = useCallback((caseId: string) => {
    setInspectorState({ open: true, caseId });
  }, []);

  const handleInspectorClose = useCallback(() => {
    setInspectorState({ open: false, caseId: null });
  }, []);

  const handleBulkRun = useCallback(() => {
    // Open run dialog with selected cases
    setShowRunDialog(true);
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleUpdateCaseTarget = useCallback((caseId: string, target: any) => {
    // The ExecutionTargetCell component handles the actual update
    // This is just a callback for additional actions if needed
    console.log('Test case target updated:', caseId, target);
    
    // Find which suite contains this test case and reload its data
    const suiteWithCase = suites.find(suite => 
      suite.cases.some(c => c.id === caseId)
    );
    
    if (suiteWithCase) {
      // Reload the cases for this specific suite
      loadCasesForSuite(suiteWithCase.id).catch(err => {
        console.error('Failed to reload suite cases:', err);
      });
    }
  }, [suites, loadCasesForSuite]);

  const handleAddCase = useCallback((suiteId: string) => {
    // Expand the suite if not already expanded
    if (!expandedSuiteIds.has(suiteId)) {
      setExpandedSuiteIds(prev => new Set([...prev, suiteId]));
    }
    // Show the inline creator for this suite
    setAddingCaseToSuiteId(suiteId);
  }, [expandedSuiteIds]);

  const handleSaveNewCase = useCallback(async (suiteId: string, data: { summary: string; description: string }) => {
    if (!host || !projectId) return;
    
    try {
      const api = createApi(host);
      await api.project.testCases.POST({
        projectId,
        suiteId,
        summary: data.summary,
        description: data.description,
      } as any);
      
      // Hide the inline creator
      setAddingCaseToSuiteId(null);
      
      // Reload cases for this specific suite
      await loadCasesForSuite(suiteId);
      
      // Refresh the suite list to update counts
      refetch();
    } catch (err) {
      console.error('Failed to create test case:', err);
      throw err; // Let the InlineTestCaseCreator handle the error
    }
  }, [host, projectId, refetch, loadCasesForSuite]);

  const handleCancelAddCase = useCallback(() => {
    setAddingCaseToSuiteId(null);
  }, []);

  const handleRunCase = useCallback(async (caseId: string) => {
    if (!host || !projectId) return;
    
    try {
      const api = createApi(host);
      
      // Find the suite and case to get execution target
      const suiteWithCase = suites.find(s => s.cases.some(c => c.id === caseId));
      if (!suiteWithCase) {
        console.error('Could not find suite for test case');
        return;
      }
      
      const testCase = suiteWithCase.cases.find(c => c.id === caseId);
      if (!testCase?.executionTarget) {
        // Show error - no execution target
        console.error('No execution target set for test case');
        return;
      }
      
      // Trigger the test run via suite run endpoint with single case
      await api.project.testSuites._suiteId.run.POST({
        projectId,
        suiteID: suiteWithCase.id,
        testCaseIDs: [caseId],
        executionMode: 'MANAGED'
      } as any);
      
      // Show success notification
      console.log(`Test case ${testCase.issueId || caseId} started`);
      
    } catch (err) {
      console.error('Failed to run test case:', err);
    }
  }, [host, projectId, suites]);

  if (loading && suites.length === 0) {
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
          <span className="count-badge">{suites.length}</span>
        </div>
        <HierarchicalSearch onSearch={handleSearch} />
        <div className="view-actions">
          <Button primary onClick={handleCreate}>
            Create Test Suite
          </Button>
        </div>
      </div>
      
      <BulkActionsToolbar
        selectedCount={selectedCount}
        onRunSelected={handleBulkRun}
        onClearSelection={clearSelection}
      />
      
      {showRunDialog && (
        <RunTestCasesDialog
          projectId={projectId || ''}
          onClose={handleRunDialogClose}
          preSelectedSuiteId={preSelectedSuiteId}
        />
      )}
      
      {deleteError && (
        <div className="error-message">
          {deleteError}
          <Button text onClick={() => setDeleteError(null)}>Dismiss</Button>
        </div>
      )}
      
      <HierarchicalTestSuiteTable
        projectId={projectId || ''}
        suites={filteredSuites}
        expandedSuiteIds={expandedSuiteIds}
        selectedCaseIds={selectedCaseIds}
        onToggleExpand={handleToggleExpand}
        onSelectCase={handleSelectCase}
        onCaseClick={handleCaseClick}
        onRunCase={handleRunCase}
        onEditSuite={handleEdit}
        onCreateSuite={handleCreate}
        onAddCase={handleAddCase}
        onUpdateCaseTarget={handleUpdateCaseTarget}
        addingCaseToSuiteId={addingCaseToSuiteId}
        onSaveNewCase={handleSaveNewCase}
        onCancelAddCase={handleCancelAddCase}
        loading={loading}
        enableExecutionTargetEdit={true}
      />
      
      <TestCaseInspector
        caseId={inspectorState.caseId}
        projectId={projectId || ''}
        open={inspectorState.open}
        onClose={handleInspectorClose}
      />
      
      {activeRuns.length > 0 && (
        <ActiveRunsPanel
          runs={activeRuns}
          onClose={() => setActiveRuns([])}
        />
      )}
    </div>
  );
});

TestSuitesView.displayName = 'TestSuitesView';
