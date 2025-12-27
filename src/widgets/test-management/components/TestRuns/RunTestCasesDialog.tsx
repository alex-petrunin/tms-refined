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
}

export const RunTestCasesDialog = memo<RunTestCasesDialogProps>(({projectId, onClose}) => {
  const host = useHost();
  
  const [suiteOptions, setSuiteOptions] = useState<SuiteOption[]>([]);
  const [testCaseOptions, setTestCaseOptions] = useState<TestCaseOption[]>([]);
  const [executionTargetOptions, setExecutionTargetOptions] = useState<ExecutionTargetOption[]>([]);
  const [selectedSuite, setSelectedSuite] = useState<SuiteOption | null>(null);
  const [selectedTestCases, setSelectedTestCases] = useState<TestCaseOption[]>([]);
  const [selectedExecutionTarget, setSelectedExecutionTarget] = useState<ExecutionTargetOption | null>(null);
  const [executionMode, setExecutionMode] = useState<'MANAGED' | 'OBSERVED'>('MANAGED');
  const [loading, setLoading] = useState(false);
  const [loadingSuites, setLoadingSuites] = useState(true);
  const [loadingTestCases, setLoadingTestCases] = useState(false);
  const [loadingIntegrations, setLoadingIntegrations] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Load test suites and integrations
  useEffect(() => {
    if (!host || !projectId) return;
    
    const api = createApi(host);
    
    // Load test suites
    setLoadingSuites(true);
    api.project.testSuites.GET({projectId, limit: 100})
      .then((response: any) => {
        const options: SuiteOption[] = (response.items || []).map((suite: any) => ({
          key: suite.id,
          label: suite.name
        }));
        setSuiteOptions(options);
      })
      .catch((err) => {
        console.error('Failed to load test suites:', err);
      })
      .finally(() => setLoadingSuites(false));

    // Load enabled integrations for execution targets
    setLoadingIntegrations(true);
    api.project.integrations.GET({projectId, enabled: true} as any)
      .then((response: any) => {
        const options: ExecutionTargetOption[] = (response.items || []).map((integration: any) => ({
          key: integration.id,
          label: `${integration.name} (${integration.type})`,
          type: integration.type,
          config: integration.config
        }));
        
        // Add manual option as default if no integrations exist
        if (options.length === 0) {
          options.push({
            key: 'manual',
            label: 'Manual Execution',
            type: 'MANUAL'
          });
        }
        
        setExecutionTargetOptions(options);
        // Auto-select first option (usually Manual)
        if (options.length > 0) {
          setSelectedExecutionTarget(options[0]);
        }
      })
      .catch((err) => {
        console.error('Failed to load integrations:', err);
        // Fallback to manual
        const manualOption: ExecutionTargetOption = {
          key: 'manual',
          label: 'Manual Execution',
          type: 'MANUAL'
        };
        setExecutionTargetOptions([manualOption]);
        setSelectedExecutionTarget(manualOption);
      })
      .finally(() => setLoadingIntegrations(false));
  }, [host, projectId]);

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
      })
      .catch((err) => {
        console.error('Failed to load test cases:', err);
      })
      .finally(() => setLoadingTestCases(false));
  }, [host, projectId, selectedSuite]);

  // Auto-set execution mode based on target type
  useEffect(() => {
    if (selectedExecutionTarget) {
      if (selectedExecutionTarget.type === 'MANUAL') {
        setExecutionMode('MANAGED');
      } else {
        // CI integrations typically use OBSERVED mode (awaiting external results)
        setExecutionMode('OBSERVED');
      }
    }
  }, [selectedExecutionTarget]);

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

  const handleExecutionTargetChange = useCallback((option: ExecutionTargetOption | null) => {
    setSelectedExecutionTarget(option);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!host || !selectedSuite || selectedTestCases.length === 0 || !selectedExecutionTarget) return;
    
    setLoading(true);
    setError(null);

    try {
      const api = createApi(host);
      const testCaseIDs = selectedTestCases.map(tc => tc.key);
      
      await api.project.testRuns.POST({
        projectId,
        suiteID: selectedSuite.key,
        testCaseIDs: testCaseIDs,
        executionMode,
        executionTarget: {
          id: selectedExecutionTarget.key,
          name: selectedExecutionTarget.label.replace(` (${selectedExecutionTarget.type})`, ''),
          type: selectedExecutionTarget.type,
          ref: selectedExecutionTarget.config?.pipelineRef || ''
        }
      } as any);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to run tests'));
    } finally {
      setLoading(false);
    }
  }, [host, selectedSuite, selectedTestCases, executionMode, selectedExecutionTarget, projectId, onClose]);

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
          <label className="form-label">Execution Target *</label>
          <Select
            data={executionTargetOptions}
            selected={selectedExecutionTarget}
            onChange={handleExecutionTargetChange}
            filter
            loading={loadingIntegrations}
            placeholder="Select execution target..."
            label="Execution Target"
          />
          {selectedExecutionTarget && selectedExecutionTarget.type !== 'MANUAL' && (
            <div style={{marginTop: 4, fontSize: 12, color: '#666'}}>
              Tests will be triggered via {selectedExecutionTarget.type}
              {selectedExecutionTarget.config?.pipelineRef && (
                <> (ref: <code>{selectedExecutionTarget.config.pipelineRef}</code>)</>
              )}
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
          disabled={loading || !selectedSuite || selectedTestCases.length === 0 || !selectedExecutionTarget}
        >
          {loading ? 'Running...' : `Run ${selectedTestCases.length} Test(s)`}
        </Button>
      </Panel>
    </Dialog>
  );
});

RunTestCasesDialog.displayName = 'RunTestCasesDialog';
