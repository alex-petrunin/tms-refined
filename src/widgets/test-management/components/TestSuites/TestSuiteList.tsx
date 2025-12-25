import React, {memo, useMemo} from 'react';
import SimpleTable from '@jetbrains/ring-ui-built/components/table/simple-table';
import type {Column} from '@jetbrains/ring-ui-built/components/table/header-cell';
import Button from '@jetbrains/ring-ui-built/components/button/button';
import {type ApiRouter} from '@/api/api';

interface TestSuite {
  id: string;
  name: string;
  description: string;
  testCaseIDs: string[];
}

interface TestSuiteListProps {
  suites: TestSuite[];
  onEdit: (suiteId: string) => void;
  api: ReturnType<typeof import('@/api').createApi<ApiRouter>>;
}

export const TestSuiteList = memo<TestSuiteListProps>(({suites, onEdit}) => {
  const data = suites.map(suite => ({
    id: suite.id,
    name: suite.name,
    description: suite.description,
    testCaseCount: suite.testCaseIDs.length,
    actions: suite.id
  }));

  const columns: Column<typeof data[0]>[] = useMemo(() => [
    {id: 'name', title: 'Name'},
    {id: 'description', title: 'Description'},
    {id: 'testCaseCount', title: 'Test Cases'},
    {
      id: 'actions',
      title: 'Actions',
      getValue: (item) => (
        <Button onClick={() => onEdit(item.id)}>
          Edit
        </Button>
      )
    }
  ], [onEdit]);

  return (
    <SimpleTable
      data={data}
      columns={columns}
      getItemKey={(item) => item.id}
    />
  );
});

TestSuiteList.displayName = 'TestSuiteList';

