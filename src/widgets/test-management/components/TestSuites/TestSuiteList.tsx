import {memo, useMemo, useCallback, useState} from 'react';
import SimpleTable from '@jetbrains/ring-ui-built/components/table/simple-table';
import type {Column} from '@jetbrains/ring-ui-built/components/table/header-cell';
import Button from '@jetbrains/ring-ui-built/components/button/button';
import Dialog from '@jetbrains/ring-ui-built/components/dialog/dialog';
import {Content, Header} from '@jetbrains/ring-ui-built/components/island/island';
import Panel from '@jetbrains/ring-ui-built/components/panel/panel';
import {LiveTestCaseCount} from './LiveTestCaseCount';

interface TestSuite {
  id: string;
  name: string;
  description: string;
  testCaseCount: number;
}

interface TestSuiteListProps {
  projectId: string;
  suites: TestSuite[];
  onEdit: (suiteId: string) => void;
  onDelete: (suiteId: string, suiteName: string) => void;
  onRunSuite: (suiteId: string) => void;
  deleting?: boolean;
}

export const TestSuiteList = memo<TestSuiteListProps>(({projectId, suites, onEdit, onDelete, onRunSuite, deleting}) => {
  const [confirmDelete, setConfirmDelete] = useState<{id: string; name: string} | null>(null);

  const handleDeleteClick = useCallback((id: string, name: string) => {
    setConfirmDelete({id, name});
  }, []);

  const handleConfirmDelete = useCallback(() => {
    if (confirmDelete) {
      onDelete(confirmDelete.id, confirmDelete.name);
      setConfirmDelete(null);
    }
  }, [confirmDelete, onDelete]);

  const handleCancelDelete = useCallback(() => {
    setConfirmDelete(null);
  }, []);

  const data = suites.map(suite => ({
    id: suite.id,
    name: suite.name,
    description: suite.description,
    testCaseCount: suite.testCaseCount,
    actions: suite
  }));

  const columns: Column<typeof data[0]>[] = useMemo(() => [
    {id: 'name', title: 'Name'},
    {id: 'description', title: 'Description'},
    {
      id: 'testCaseCount',
      title: 'Test Cases',
      getValue: (item) => (
        <LiveTestCaseCount projectId={projectId} suiteId={item.id} />
      )
    },
    {
      id: 'actions',
      title: 'Actions',
      getValue: (item) => (
        <div className="action-buttons" style={{display: 'flex', gap: 8}}>
          <Button onClick={() => onRunSuite(item.id)}>
            Run Suite
          </Button>
          <Button onClick={() => onEdit(item.id)}>
            Edit
          </Button>
          <Button 
            danger 
            onClick={() => handleDeleteClick(item.id, item.name)}
            disabled={deleting}
          >
            Delete
          </Button>
        </div>
      )
    }
  ], [projectId, onEdit, onRunSuite, handleDeleteClick, deleting]);

  return (
    <>
      <SimpleTable
        data={data}
        columns={columns}
        getItemKey={(item) => item.id}
      />
      
      {confirmDelete && (
        <Dialog
          show={true}
          onCloseAttempt={handleCancelDelete}
          trapFocus
          autoFocusFirst
        >
          <Header>Delete Test Suite</Header>
          <Content>
            <p>Are you sure you want to delete the test suite "{confirmDelete.name}"?</p>
            <p>This action cannot be undone.</p>
          </Content>
          <Panel>
            <Button onClick={handleCancelDelete}>Cancel</Button>
            <Button danger onClick={handleConfirmDelete} disabled={deleting}>
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </Panel>
        </Dialog>
      )}
    </>
  );
});

TestSuiteList.displayName = 'TestSuiteList';
