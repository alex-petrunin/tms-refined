import React, {memo, useMemo} from 'react';
import SimpleTable from '@jetbrains/ring-ui-built/components/table/simple-table';
import type {Column} from '@jetbrains/ring-ui-built/components/table/header-cell';
import Button from '@jetbrains/ring-ui-built/components/button/button';

interface TestCase {
  id: string;
  issueId?: string;
  summary: string;
  description: string;
  suiteId?: string;
}

interface TestCaseListProps {
  testCases: TestCase[];
  onEdit: (caseId: string) => void;
}

export const TestCaseList = memo<TestCaseListProps>(({testCases, onEdit}) => {
  const data = useMemo(() => testCases.map(testCase => ({
    id: testCase.id,
    summary: testCase.summary,
    description: testCase.description || '-'
  })), [testCases]);

  const columns: Column<typeof data[0]>[] = useMemo(() => [
    {id: 'id', title: 'ID'},
    {id: 'summary', title: 'Summary'},
    {id: 'description', title: 'Description'},
    {
      id: 'actions',
      title: 'Actions',
      getValue: (item) => {
        const testCaseId = item.id;
        return (
          <Button onClick={() => onEdit(testCaseId)}>
            Edit
          </Button>
        );
      }
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

TestCaseList.displayName = 'TestCaseList';

