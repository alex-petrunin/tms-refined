import React, {memo, useState, useEffect, useCallback, useMemo, useRef} from 'react';
import Button from '@jetbrains/ring-ui-built/components/button/button';
import {Input, Size} from '@jetbrains/ring-ui-built/components/input/input';
import Dialog from '@jetbrains/ring-ui-built/components/dialog/dialog';
import { Header, Content } from '@jetbrains/ring-ui-built/components/island/island';
import Panel from '@jetbrains/ring-ui-built/components/panel/panel';
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

  return (
    <Dialog
      show={true}
      onCloseAttempt={onClose}
      trapFocus
      autoFocusFirst
    >
      <Header>
        {suiteId ? 'Edit Test Suite' : 'Create Test Suite'}
      </Header>

      <Content>
        {loading && suiteId ? (
          <LoadingState message="Loading test suite..." />
        ) : (
          <div className="test-suite-form">
            {error && <ErrorState error={error} />}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
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
            </div>
          </div>
        )}
      </Content>

      <Panel>
        <Button onClick={onClose} disabled={loading}>
          Cancel
        </Button>
        <Button 
          primary 
          onClick={handleSubmit} 
          disabled={loading || !name}
        >
          {loading ? 'Saving...' : (suiteId ? 'Update' : 'Create')}
        </Button>
      </Panel>
    </Dialog>
  );
});

TestSuiteForm.displayName = 'TestSuiteForm';

