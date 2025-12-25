import React, {memo, useMemo} from 'react';
import SimpleTable from '@jetbrains/ring-ui-built/components/table/simple-table';
import type {Column} from '@jetbrains/ring-ui-built/components/table/header-cell';
import Button from '@jetbrains/ring-ui-built/components/button/button';

interface TestCase {
  id: string;
  summary: string;
  description: string;
  executionTargetSnapshot?: {
    id: string;
    name: string;
    type: string;
    ref: string;
  };
}

interface TestCaseListProps {
  testCases: TestCase[];
  onEdit: (caseId: string) => void;
}

export const TestCaseList = memo<TestCaseListProps>(({testCases, onEdit}) => {
  const data = testCases.map(testCase => ({
    id: testCase.id,
    summary: testCase.summary,
    description: testCase.description,
    executionTarget: testCase.executionTargetSnapshot 
      ? `${testCase.executionTargetSnapshot.type}: ${testCase.executionTargetSnapshot.name}`
      : 'None',
    actions: testCase.id
  }));

  const columns: Column<typeof data[0]>[] = useMemo(() => [
    {id: 'summary', title: 'Summary'},
    {id: 'description', title: 'Description'},
    {id: 'executionTarget', title: 'Execution Target'},
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

TestCaseList.displayName = 'TestCaseList';

