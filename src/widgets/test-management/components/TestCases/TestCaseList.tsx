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
  selectedIds?: string[];
  onSelect?: (ids: string[]) => void;
  onRunSingle?: (caseId: string) => void;
  showCheckboxes?: boolean;
}

export const TestCaseList = memo<TestCaseListProps>(({
  testCases,
  testSuites,
  onEdit,
  selectedIds = [],
  onSelect,
  onRunSingle,
  showCheckboxes = false
}) => {
  // Create a map of suite IDs to suite names
  const suiteMap = useMemo(() => {
    const map: Record<string, string> = {};
    testSuites.forEach(suite => {
      map[suite.id] = suite.name;
    });
    return map;
  }, [testSuites]);

  const handleCheckboxChange = (caseId: string, checked: boolean) => {
    if (!onSelect) return;
    if (checked) {
      onSelect([...selectedIds, caseId]);
    } else {
      onSelect(selectedIds.filter(id => id !== caseId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (!onSelect) return;
    if (checked) {
      onSelect(testCases.map(tc => tc.id));
    } else {
      onSelect([]);
    }
  };

  const allSelected = showCheckboxes && selectedIds.length === testCases.length && testCases.length > 0;
  const someSelected = showCheckboxes && selectedIds.length > 0 && selectedIds.length < testCases.length;

  const data = useMemo(() => testCases.map(testCase => ({
    id: testCase.id,
    summary: testCase.summary,
    description: testCase.description || '-',
    suite: testCase.suiteId ? (suiteMap[testCase.suiteId] || testCase.suiteId) : '-'
  })), [testCases, suiteMap]);

  const columns: Column<typeof data[0]>[] = useMemo(() => {
    const cols: Column<typeof data[0]>[] = [];

    // Add checkbox column if enabled
    if (showCheckboxes) {
      cols.push({
        id: 'select',
        title: (
          <input
            type="checkbox"
            checked={allSelected}
            ref={(el) => {
              if (el) el.indeterminate = someSelected;
            }}
            onChange={(e) => handleSelectAll(e.target.checked)}
          />
        ) as any,
        getValue: (item) => {
          const isSelected = selectedIds.includes(item.id);
          return (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={(e) => handleCheckboxChange(item.id, e.target.checked)}
            />
          );
        }
      });
    }

    cols.push(
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
            <div style={{display: 'flex', gap: 8}}>
              {onRunSingle && (
                <Button onClick={() => onRunSingle(testCaseId)}>
                  Run
                </Button>
              )}
              <Button onClick={() => onEdit(testCaseId)}>
                Edit
              </Button>
            </div>
          );
        }
      }
    );

    return cols;
  }, [onEdit, onRunSingle, showCheckboxes, selectedIds, allSelected, someSelected, handleSelectAll, handleCheckboxChange]);

  return (
    <SimpleTable
      data={data}
      columns={columns}
      getItemKey={(item) => item.id}
    />
  );
});

TestCaseList.displayName = 'TestCaseList';

