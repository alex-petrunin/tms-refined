import React, {memo, useState, useEffect, useCallback} from 'react';
import Button from '@jetbrains/ring-ui-built/components/button/button';
import {Input, Size} from '@jetbrains/ring-ui-built/components/input/input';
import {LoadingState} from '../shared/LoadingState';
import {ErrorState} from '../shared/ErrorState';
import {useHost} from "@/widgets/common/hooks/use-host.tsx";
import {createApi} from "@/api";

interface TestSuiteFormProps {
  suiteId?: string | null;
  onClose: () => void;
}

export const TestSuiteForm = memo<TestSuiteFormProps>(({suiteId, onClose}) => {
  const host = useHost();
  const api = createApi(host);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (suiteId) {
      // Load existing suite
      setLoading(true);
      api.project.testSuites.GET({id: suiteId} as any)
        .then((suite: any) => {
          setName(suite.name || '');
          setDescription(suite.description || '');
        })
        .catch((err) => setError(err instanceof Error ? err : new Error('Failed to load suite')))
        .finally(() => setLoading(false));
    }
  }, [suiteId, api]);

  const handleSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (suiteId) {
        await api.project.testSuites.PUT({
          name,
          description
        }, {id: suiteId} as any);
      } else {
        await api.project.testSuites.POST({
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
  }, [api, suiteId, name, description, onClose]);

  if (loading && suiteId) {
    return <LoadingState message="Loading test suite..." />;
  }

  return (
    <div className="test-suite-form">
      <h2>{suiteId ? 'Edit Test Suite' : 'Create Test Suite'}</h2>
      {error && <ErrorState error={error} />}
      <form onSubmit={handleSubmit}>
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
          <Button primary type="submit" disabled={loading || !name}>
            {suiteId ? 'Update' : 'Create'}
          </Button>
        </div>
      </form>
    </div>
  );
});

TestSuiteForm.displayName = 'TestSuiteForm';

