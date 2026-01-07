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

interface TestSuite {
  id: string;
  name: string;
}

interface TestCaseListProps {
  testCases: TestCase[];
  testSuites: TestSuite[];
  onEdit: (caseId: string) => void;
}

export const TestCaseList = memo<TestCaseListProps>(({testCases, testSuites, onEdit}) => {
  // Create a map of suite IDs to suite names
  const suiteMap = useMemo(() => {
    const map: Record<string, string> = {};
    testSuites.forEach(suite => {
      map[suite.id] = suite.name;
    });
    return map;
  }, [testSuites]);

  const data = useMemo(() => testCases.map(testCase => ({
    id: testCase.id,
    summary: testCase.summary,
    description: testCase.description || '-',
    suite: testCase.suiteId ? (suiteMap[testCase.suiteId] || testCase.suiteId) : '-'
  })), [testCases, suiteMap]);

  const columns: Column<typeof data[0]>[] = useMemo(() => [
    {id: 'id', title: 'ID'},
    {id: 'summary', title: 'Summary'},
    {id: 'description', title: 'Description'},
    {id: 'suite', title: 'Suite'},
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

