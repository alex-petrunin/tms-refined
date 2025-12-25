import React, {memo, useMemo} from 'react';
import SimpleTable from '@jetbrains/ring-ui-built/components/table/simple-table';
import type {Column} from '@jetbrains/ring-ui-built/components/table/header-cell';
import Tag from '@jetbrains/ring-ui-built/components/tag/tag';

interface TestRun {
  id: string;
  testCaseIDs: string[];
  testSuiteID: string;
  status: string;
  executionTarget: {
    id: string;
    name: string;
    type: string;
    ref: string;
  };
}

interface TestRunListProps {
  testRuns: TestRun[];
}

export const TestRunList = memo<TestRunListProps>(({testRuns}) => {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PASSED':
        return Tag.Color.GREEN;
      case 'FAILED':
        return Tag.Color.RED;
      case 'RUNNING':
        return Tag.Color.BLUE;
      case 'PENDING':
        return Tag.Color.GRAY;
      default:
        return Tag.Color.GRAY;
    }
  };

  const data = testRuns.map(testRun => ({
    id: testRun.id,
    testSuiteID: testRun.testSuiteID,
    testCaseCount: testRun.testCaseIDs.length,
    status: testRun.status,
    executionTarget: `${testRun.executionTarget.type}: ${testRun.executionTarget.name}`
  }));

  const columns: Column<typeof data[0]>[] = useMemo(() => [
    {id: 'id', title: 'ID'},
    {id: 'testSuiteID', title: 'Test Suite'},
    {id: 'testCaseCount', title: 'Test Cases'},
    {
      id: 'status',
      title: 'Status',
      getValue: (item) => (
        <Tag color={getStatusColor(item.status)}>
          {item.status}
        </Tag>
      )
    },
    {id: 'executionTarget', title: 'Execution Target'}
  ], []);

  return (
    <SimpleTable
      data={data}
      columns={columns}
      getItemKey={(item) => item.id}
    />
  );
});

TestRunList.displayName = 'TestRunList';

