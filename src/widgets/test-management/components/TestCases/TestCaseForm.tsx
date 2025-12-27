import React, {memo, useState, useEffect, useCallback} from 'react';
import Button from '@jetbrains/ring-ui-built/components/button/button';
import {Input, Size} from '@jetbrains/ring-ui-built/components/input/input';
import Select from '@jetbrains/ring-ui-built/components/select/select';
import {LoadingState} from '../shared/LoadingState';
import {ErrorState} from '../shared/ErrorState';
import {useHost} from '@/widgets/common/hooks/use-host';
import {createApi} from '@/api';

interface TestSuiteOption {
  key: string;
  label: string;
}

interface TestCaseFormProps {
  caseId?: string | null;
  projectId: string;
  onClose: () => void;
}

export const TestCaseForm = memo<TestCaseFormProps>(({caseId, projectId, onClose}) => {
  const host = useHost();
  
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [suiteId, setSuiteId] = useState<string | null>(null);
  const [issueId, setIssueId] = useState<string | null>(null);
  const [suiteOptions, setSuiteOptions] = useState<TestSuiteOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingSuites, setLoadingSuites] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Load test suites for dropdown
  useEffect(() => {
    if (!host || !projectId) return;
    
    const api = createApi(host);
    setLoadingSuites(true);
    
    api.project.testSuites.GET({projectId, limit: 100})
      .then((response: any) => {
        const options: TestSuiteOption[] = (response.items || []).map((suite: any) => ({
          key: suite.id,
          label: suite.name
        }));
        setSuiteOptions(options);
      })
      .catch((err) => {
        console.error('Failed to load test suites:', err);
      })
      .finally(() => setLoadingSuites(false));
  }, [host, projectId]);

  // Load existing test case if editing
  useEffect(() => {
    if (!caseId || !host || !projectId) return;
    
    console.log('[TestCaseForm] Loading test case:', caseId);
    const api = createApi(host);
    setLoading(true);
    
    api.project.testCases.GET({projectId, id: caseId} as any)
      .then((response: any) => {
        console.log('[TestCaseForm] Response for caseId', caseId, ':', response);
        // Response is { items: [...], total: number }
        const testCase = response.items?.[0];
        if (testCase) {
          console.log('[TestCaseForm] Loading data from test case:', testCase.id, testCase.summary);
          setSummary(testCase.summary || '');
          setDescription(testCase.description || '');
          setSuiteId(testCase.suiteId || null);
          setIssueId(testCase.issueId || null);
        } else {
          console.warn('[TestCaseForm] No test case found in response for id:', caseId);
        }
      })
      .catch((err) => setError(err instanceof Error ? err : new Error('Failed to load test case')))
      .finally(() => setLoading(false));
  }, [caseId, host, projectId]);

  const handleSuiteChange = useCallback((option: TestSuiteOption | null) => {
    setSuiteId(option?.key || null);
  }, []);

  const handleSubmit = useCallback(async () => {

    if (!host || !projectId) return;
    
    setLoading(true);
    setError(null);

    try {
      const api = createApi(host);
      
      if (caseId) {
        // Update existing test case
        await (api.project.testCases as any).PUT({
          projectId,
          id: caseId,
          issueId: issueId || undefined,
          summary,
          description,
          suiteId: suiteId || undefined
        });
      } else {
        // Create new test case
        await api.project.testCases.POST({
          projectId,
          summary,
          description,
          suiteId: suiteId || undefined
        } as any);
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to save test case'));
    } finally {
      setLoading(false);
    }
  }, [host, projectId, caseId, issueId, summary, description, suiteId, onClose]);

  if (loading && caseId) {
    return <LoadingState message="Loading test case..." />;
  }

  const selectedSuite = suiteOptions.find(opt => opt.key === suiteId) || null;

  return (
    <div className="test-case-form">
      <h2>{caseId ? 'Edit Test Case' : 'Create Test Case'}</h2>
      {error && <ErrorState error={error} />}
      <div onSubmit={handleSubmit}>
        <Input
          label="Summary"
          value={summary}
          onChange={(e) => setSummary(e.target.value)}
          required
          size={Size.FULL}
        />
        <Input
          label="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          size={Size.FULL}
          multiline
        />
        <div className="form-field">
          <label className="form-label">Test Suite (optional)</label>
          <Select
            data={suiteOptions}
            selected={selectedSuite}
            onChange={handleSuiteChange}
            filter
            clear
            loading={loadingSuites}
            placeholder="Select a test suite..."
            label="Test Suite"
          />
        </div>
        <div className="form-actions">
          <Button onClick={onClose}>Cancel</Button>
          <Button primary type="button" onClick={handleSubmit} disabled={loading || !summary}>
            {caseId ? 'Update' : 'Create'}
          </Button>
        </div>
      </div>
    </div>
  );
});

TestCaseForm.displayName = 'TestCaseForm';
