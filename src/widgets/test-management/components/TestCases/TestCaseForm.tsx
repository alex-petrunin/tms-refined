import React, {memo, useState, useEffect, useCallback} from 'react';
import {type ApiRouter} from '@/api/api';
import Button from '@jetbrains/ring-ui-built/components/button/button';
import {Input, Size} from '@jetbrains/ring-ui-built/components/input/input';
import {LoadingState} from '../shared/LoadingState';
import {ErrorState} from '../shared/ErrorState';

interface TestCaseFormProps {
  api: ReturnType<typeof import('@/api').createApi<ApiRouter>>;
  caseId?: string | null;
  onClose: () => void;
}

export const TestCaseForm = memo<TestCaseFormProps>(({api, caseId, onClose}) => {
  const [summary, setSummary] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (caseId) {
      setLoading(true);
      api.project.testCases.GET({id: caseId} as any)
        .then((testCase: any) => {
          setSummary(testCase.summary || '');
          setDescription(testCase.description || '');
        })
        .catch((err) => setError(err instanceof Error ? err : new Error('Failed to load test case')))
        .finally(() => setLoading(false));
    }
  }, [caseId, api]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (caseId) {
        // Update - would need PUT endpoint
        await api.project.testCases.POST({
          summary,
          description
        });
      } else {
        await api.project.testCases.POST({
          summary,
          description
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to save test case'));
    } finally {
      setLoading(false);
    }
  }, [api, caseId, summary, description, onClose]);

  if (loading && caseId) {
    return <LoadingState message="Loading test case..." />;
  }

  return (
    <div className="test-case-form">
      <h2>{caseId ? 'Edit Test Case' : 'Create Test Case'}</h2>
      {error && <ErrorState error={error} />}
      <form onSubmit={handleSubmit}>
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
        <div className="form-actions">
          <Button onClick={onClose}>Cancel</Button>
          <Button primary type="submit" disabled={loading || !summary}>
            {caseId ? 'Update' : 'Create'}
          </Button>
        </div>
      </form>
    </div>
  );
});

TestCaseForm.displayName = 'TestCaseForm';

