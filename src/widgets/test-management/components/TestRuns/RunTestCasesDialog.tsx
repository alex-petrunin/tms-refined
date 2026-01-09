import {memo, useState, useCallback, useEffect} from 'react';
import Button from '@jetbrains/ring-ui-built/components/button/button';
import Select from '@jetbrains/ring-ui-built/components/select/select';
import Dialog from '@jetbrains/ring-ui-built/components/dialog/dialog';
import {Content, Header} from '@jetbrains/ring-ui-built/components/island/island';
import Panel from '@jetbrains/ring-ui-built/components/panel/panel';
import {ErrorState} from '../shared/ErrorState';
import {useHost} from '@/widgets/common/hooks/use-host';
import {createApi} from '@/api';

interface SuiteOption {
  key: string;
  label: string;
}

interface TestCaseOption {
  key: string;
  label: string;
}

interface ExecutionTargetOption {
  key: string;
  label: string;
  type: string;
  config?: {
    projectUrl?: string;
    pipelineRef?: string;
  };
}

interface RunTestCasesDialogProps {
  projectId: string;
  onClose: () => void;
  preSelectedSuiteId?: string;
  preSelectedTestCaseIds?: string[];
}

export const RunTestCasesDialog = memo<RunTestCasesDialogProps>(({projectId, onClose, preSelectedSuiteId, preSelectedTestCaseIds}) => {
  const host = useHost();
  
  const [suiteOptions, setSuiteOptions] = useState<SuiteOption[]>([]);
  const [testCaseOptions, setTestCaseOptions] = useState<TestCaseOption[]>([]);
  const [selectedSuite, setSelectedSuite] = useState<SuiteOption | null>(null);
  const [selectedTestCases, setSelectedTestCases] = useState<TestCaseOption[]>([]);
  const [executionMode, setExecutionMode] = useState<'MANAGED' | 'OBSERVED'>('MANAGED');
  const [loading, setLoading] = useState(false);
  const [loadingSuites, setLoadingSuites] = useState(true);
  const [loadingTestCases, setLoadingTestCases] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Load test suites
  useEffect(() => {
    if (!host || !projectId) return;
    
    const api = createApi(host);
    
    setLoadingSuites(true);
    api.project.testSuites.GET({projectId, limit: 100})
      .then((response: any) => {
        const options: SuiteOption[] = (response.items || []).map((suite: any) => ({
          key: suite.id,
          label: suite.name
        }));
        setSuiteOptions(options);
        
        // Auto-select pre-selected suite
        if (preSelectedSuiteId) {
          const preSelected = options.find(opt => opt.key === preSelectedSuiteId);
          if (preSelected) {
            setSelectedSuite(preSelected);
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load test suites:', err);
      })
      .finally(() => setLoadingSuites(false));
  }, [host, projectId, preSelectedSuiteId]);

  // Load test cases when suite is selected
  useEffect(() => {
    if (!host || !projectId || !selectedSuite) {
      setTestCaseOptions([]);
      return;
    }
    
    const api = createApi(host);
    setLoadingTestCases(true);
    
    api.project.testCases.GET({projectId, suiteId: selectedSuite.key, limit: 100} as any)
      .then((response: any) => {
        const options: TestCaseOption[] = (response.items || []).map((tc: any) => ({
          key: tc.id,
          label: tc.summary
        }));
        setTestCaseOptions(options);
        
        // Auto-select pre-selected test cases
        if (preSelectedTestCaseIds && preSelectedTestCaseIds.length > 0) {
          const preSelected = options.filter(opt => preSelectedTestCaseIds.includes(opt.key));
          if (preSelected.length > 0) {
            setSelectedTestCases(preSelected);
          }
        }
      })
      .catch((err) => {
        console.error('Failed to load test cases:', err);
      })
      .finally(() => setLoadingTestCases(false));
  }, [host, projectId, selectedSuite, preSelectedTestCaseIds]);


  const handleSuiteChange = useCallback((option: SuiteOption | null) => {
    setSelectedSuite(option);
    setSelectedTestCases([]); // Reset test case selection when suite changes
  }, []);

  const handleTestCasesChange = useCallback((options: TestCaseOption[] | TestCaseOption | null) => {
    if (Array.isArray(options)) {
      setSelectedTestCases(options);
    } else if (options) {
      setSelectedTestCases([options]);
    } else {
      setSelectedTestCases([]);
    }
  }, []);

  const handleSelectAll = useCallback(() => {
    setSelectedTestCases(testCaseOptions);
  }, [testCaseOptions]);

  const handleSubmit = useCallback(async () => {
    if (!host || !selectedSuite || selectedTestCases.length === 0) return;
    
    setLoading(true);
    setError(null);

    try {
      const api = createApi(host);
      const testCaseIDs = selectedTestCases.map(tc => tc.key);
      
      // Use new endpoint: POST /project/testSuites/_suiteId/run
      // Backend will read execution targets from test cases and group automatically
      await api.project.testSuites._suiteId.run.POST({
        projectId: projectId,
        suiteID: selectedSuite.key,
        testCaseIDs: testCaseIDs,
        executionMode
      } as any);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to run tests'));
    } finally {
      setLoading(false);
    }
  }, [host, selectedSuite, selectedTestCases, executionMode, projectId, onClose]);

  return (
    <Dialog
      show
      onCloseAttempt={onClose}
      trapFocus
      autoFocusFirst
    >
      <Header>Run Test Cases</Header>
      <Content>
        {error && <ErrorState error={error} />}
        
        <div className="form-field">
          <label className="form-label">Test Suite *</label>
          <Select
            data={suiteOptions}
            selected={selectedSuite}
            onChange={handleSuiteChange}
            filter
            loading={loadingSuites}
            placeholder="Select a test suite..."
            label="Test Suite"
          />
        </div>
        
        <div className="form-field">
          <label className="form-label">
            Test Cases * 
            {testCaseOptions.length > 0 && (
              <Button text onClick={handleSelectAll} style={{marginLeft: 8}}>
                Select All ({testCaseOptions.length})
              </Button>
            )}
          </label>
          <Select
            data={testCaseOptions}
            selected={selectedTestCases}
            onChange={handleTestCasesChange}
            multiple
            filter
            loading={loadingTestCases}
            disabled={!selectedSuite}
            placeholder={selectedSuite ? "Select test cases..." : "Select a suite first"}
            label="Test Cases"
          />
          {selectedTestCases.length > 0 && (
            <div style={{marginTop: 4, fontSize: 12, color: '#666'}}>
              {selectedTestCases.length} test case(s) selected
            </div>
          )}
        </div>
        
        <div className="form-field">
          <label className="form-label">Execution Mode</label>
          <div style={{display: 'flex', flexDirection: 'column', gap: 8}}>
            <label style={{display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer'}}>
              <input
                type="radio"
                value="MANAGED"
                checked={executionMode === 'MANAGED'}
                onChange={() => setExecutionMode('MANAGED')}
                style={{marginTop: 3}}
              />
              <div>
                <div style={{fontWeight: 500}}>Managed</div>
                <div style={{fontSize: 12, color: '#666'}}>Track test results directly in YouTrack</div>
              </div>
            </label>
            <label style={{display: 'flex', alignItems: 'flex-start', gap: 8, cursor: 'pointer'}}>
              <input
                type="radio"
                value="OBSERVED"
                checked={executionMode === 'OBSERVED'}
                onChange={() => setExecutionMode('OBSERVED')}
                style={{marginTop: 3}}
              />
              <div>
                <div style={{fontWeight: 500}}>Observed</div>
                <div style={{fontSize: 12, color: '#666'}}>Await results from external CI system</div>
              </div>
            </label>
          </div>
        </div>
      </Content>
      <Panel>
        <Button onClick={onClose}>Cancel</Button>
        <Button 
          primary 
          onClick={handleSubmit} 
          disabled={loading || !selectedSuite || selectedTestCases.length === 0}
        >
          {loading ? 'Running...' : `Run ${selectedTestCases.length} Test(s)`}
        </Button>
      </Panel>
    </Dialog>
  );
});

RunTestCasesDialog.displayName = 'RunTestCasesDialog';
