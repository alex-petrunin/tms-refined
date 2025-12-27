import React, {memo, useState, useEffect, useCallback, useMemo, useRef} from 'react';
import Button from '@jetbrains/ring-ui-built/components/button/button';
import {Input, Size} from '@jetbrains/ring-ui-built/components/input/input';
import {LoadingState} from '../shared/LoadingState';
import {ErrorState} from '../shared/ErrorState';
import {useHost} from "@/widgets/common/hooks/use-host.tsx";
import {createApi} from "@/api";

interface TestSuiteFormProps {
  suiteId?: string | null;
  projectId: string;
  onClose: () => void;
}

export const TestSuiteForm = memo<TestSuiteFormProps>(({suiteId, projectId, onClose}) => {
  const host = useHost();
  // Memoize API to prevent infinite loops
  const api = useMemo(() => createApi(host), [host]);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Track if we've already loaded to prevent duplicate requests
  const loadedRef = useRef(false);

  useEffect(() => {
    if (suiteId && projectId && !loadedRef.current) {
      loadedRef.current = true;
      // Load existing suite
      setLoading(true);
      api.project.testSuites.GET({projectId, id: suiteId})
        .then((response: any) => {
          // Response is { items: [...], total: number }
          const suite = response.items?.[0];
          if (suite) {
            setName(suite.name || '');
            setDescription(suite.description || '');
          }
        })
        .catch((err) => setError(err instanceof Error ? err : new Error('Failed to load suite')))
        .finally(() => setLoading(false));
    }
  }, [suiteId, projectId, api]);

  const handleSubmit = useCallback(async () => {
    if (!projectId) return;
    
    setLoading(true);
    setError(null);

    try {
      if (suiteId) {
        await api.project.testSuites.PUT({
          projectId,
          id: suiteId,
          name,
          description
        });
      } else {
        await api.project.testSuites.POST({
          projectId,
          name,
          description
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to save test suite'));
    } finally {
      setLoading(false);
    }
  }, [api, projectId, suiteId, name, description, onClose]);

  if (loading && suiteId) {
    return <LoadingState message="Loading test suite..." />;
  }

  return (
    <div className="test-suite-form">
      <h2>{suiteId ? 'Edit Test Suite' : 'Create Test Suite'}</h2>
      {error && <ErrorState error={error} />}
      <div onSubmit={handleSubmit}>
        <Input
          label="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
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
          <Button primary type="button" onClick={handleSubmit} disabled={loading || !name}>
            {suiteId ? 'Update' : 'Create'}
          </Button>
        </div>
      </div>
    </div>
  );
});

TestSuiteForm.displayName = 'TestSuiteForm';

