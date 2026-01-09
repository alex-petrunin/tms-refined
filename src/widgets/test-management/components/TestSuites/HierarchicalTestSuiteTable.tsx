import React, { memo, useCallback, useState, useMemo } from 'react';
import Button from '@jetbrains/ring-ui-built/components/button/button';
import Checkbox from '@jetbrains/ring-ui-built/components/checkbox/checkbox';
import { ExecutionTargetCell } from './ExecutionTargetCell';
import { InlineTestCaseCreator } from './InlineTestCaseCreator';
import './hierarchical-table.css';

interface ExecutionTarget {
  integrationId: string;
  name: string;
  type: string;
  config: Record<string, any>;
}

interface TestCase {
  id: string;
  issueId?: string;
  summary: string;
  description: string;
  executionTarget?: ExecutionTarget;
}

interface SuiteWithCases {
  id: string;
  name: string;
  description: string;
  testCaseCount: number;
  cases: TestCase[];
  casesLoaded: boolean;
}

interface HierarchicalTestSuiteTableProps {
  projectId: string;
  suites: SuiteWithCases[];
  expandedSuiteIds: Set<string>;
  selectedCaseIds: Set<string>;
  onToggleExpand: (suiteId: string) => void;
  onSelectCase: (caseId: string, selected: boolean) => void;
  onCaseClick?: (caseId: string) => void;
  onRunCase?: (caseId: string) => void;
  onEditSuite?: (suiteId: string) => void;
  onEditCase?: (caseId: string) => void;
  onCreateSuite?: () => void;
  onAddCase?: (suiteId: string) => void;
  onUpdateCaseTarget?: (caseId: string, target: ExecutionTarget | null) => void;
  addingCaseToSuiteId?: string | null;
  onSaveNewCase?: (suiteId: string, data: { summary: string; description: string }) => Promise<void>;
  onCancelAddCase?: () => void;
  loading?: boolean;
  enableExecutionTargetEdit?: boolean;
}

// TableHeader Component
const TableHeader: React.FC = memo(() => {
  return (
    <div className="table-header" role="rowgroup">
      <div className="table-row" role="row">
        <div className="table-cell" role="columnheader">
          {/* Checkbox/Expand column */}
        </div>
        <div className="table-cell" role="columnheader">
          Name/ID
        </div>
        <div className="table-cell" role="columnheader">
          Summary/Description
        </div>
        <div className="table-cell" role="columnheader">
          Execution Target
        </div>
        <div className="table-cell" role="columnheader">
          Last Status
        </div>
        <div className="table-cell" role="columnheader">
          Actions
        </div>
      </div>
    </div>
  );
});

TableHeader.displayName = 'TableHeader';

// ChevronIcon Component
const ChevronIcon: React.FC<{ expanded: boolean }> = ({ expanded }) => (
  <svg
    className={`expand-icon ${expanded ? 'expanded' : ''}`}
    viewBox="0 0 16 16"
    fill="currentColor"
  >
    <path d="M6 4l4 4-4 4V4z" />
  </svg>
);

// SuiteRow Component
interface SuiteRowProps {
  suite: SuiteWithCases;
  expanded: boolean;
  onToggleExpand: () => void;
  onAddCase?: () => void;
  onEditSuite?: () => void;
}

const SuiteRow: React.FC<SuiteRowProps> = memo(({
  suite,
  expanded,
  onToggleExpand,
  onAddCase,
  onEditSuite,
}) => {
  return (
    <div
      className="table-row suite-row"
      role="row"
      aria-expanded={expanded}
      aria-level={1}
      data-suite-id={suite.id}
      onClick={onToggleExpand}
    >
      <div className="table-cell" role="cell">
        <ChevronIcon expanded={expanded} />
      </div>
      <div className="table-cell suite-info" role="cell">
        <div className="suite-name-wrapper">
          <div className="suite-name">
            {suite.name}
            <span className="suite-case-count">({suite.testCaseCount} cases)</span>
          </div>
          {suite.description && (
            <div className="suite-description">{suite.description}</div>
          )}
        </div>
      </div>
      <div className="table-cell" role="cell">
        {/* Empty for suite row */}
      </div>
      <div className="table-cell" role="cell">
        {/* Empty for suite row */}
      </div>
      <div className="table-cell" role="cell">
        {/* Empty for suite row */}
      </div>
      <div className="table-cell action-buttons" role="cell" onClick={(e) => e.stopPropagation()}>
        {onAddCase && (
          <Button onClick={onAddCase}>
            + Add Case
          </Button>
        )}
      </div>
    </div>
  );
});

SuiteRow.displayName = 'SuiteRow';

// CaseRow Component
interface CaseRowProps {
  projectId: string;
  testCase: TestCase;
  selected: boolean;
  onSelect: (selected: boolean) => void;
  onClick?: () => void;
  onRunCase?: () => void;
  onEditCase?: () => void;
  onUpdateTarget?: (target: ExecutionTarget | null) => void;
  enableTargetEdit?: boolean;
}

const CaseRow: React.FC<CaseRowProps> = memo(({
  projectId,
  testCase,
  selected,
  onSelect,
  onClick,
  onRunCase,
  onEditCase,
  onUpdateTarget,
  enableTargetEdit = true,
}) => {
  const handleCheckboxChange = useCallback((checked: boolean) => {
    onSelect(checked);
  }, [onSelect]);

  const handleRowClick = useCallback(() => {
    if (onClick) {
      onClick();
    }
  }, [onClick]);

  const handleTargetChange = useCallback((target: ExecutionTarget | null) => {
    if (onUpdateTarget) {
      onUpdateTarget(target);
    }
  }, [onUpdateTarget]);

  return (
    <div
      className={`table-row case-row ${selected ? 'selected' : ''}`}
      role="row"
      aria-level={2}
      data-case-id={testCase.id}
    >
      <div className="table-cell" role="cell" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={selected}
          onChange={handleCheckboxChange}
          aria-label={`Select ${testCase.summary}`}
        />
      </div>
      <div className="table-cell" role="cell">
        <span
          className="test-case-id-link"
          onClick={handleRowClick}
          role="button"
          tabIndex={0}
        >
          {testCase.issueId || testCase.id}
        </span>
        <span style={{ marginLeft: 8, fontWeight: 'normal' }}>
          {testCase.summary}
        </span>
      </div>
      <div className="table-cell table-description" role="cell" title={testCase.description}>
        {testCase.description || '-'}
      </div>
      <div className="table-cell" role="cell">
        {enableTargetEdit && onUpdateTarget ? (
          <ExecutionTargetCell
            testCaseId={testCase.id}
            projectId={projectId}
            currentTarget={testCase.executionTarget}
            onTargetUpdated={handleTargetChange}
          />
        ) : (
          <div style={{ fontSize: 13, color: 'var(--ring-secondary-color)' }}>
            {testCase.executionTarget 
              ? `${testCase.executionTarget.name}`
              : 'Not set'}
          </div>
        )}
      </div>
      <div className="table-cell" role="cell">
        {/* Status icon placeholder */}
        <div className="status-icon pending" title="Pending">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
            <circle cx="8" cy="8" r="6" />
          </svg>
        </div>
      </div>
      <div className="table-cell action-buttons" role="cell" onClick={(e) => e.stopPropagation()}>
        {onRunCase && (
          <Button onClick={onRunCase} title="Run test case">
            Run
          </Button>
        )}
        {onEditCase && (
          <Button onClick={onEditCase} title="Edit test case">
            Edit
          </Button>
        )}
      </div>
    </div>
  );
});

CaseRow.displayName = 'CaseRow';

// Empty State Component
const EmptySuiteState: React.FC<{ suiteName: string; suiteId: string; onAddCase?: (suiteId: string) => void }> = ({ suiteName, suiteId, onAddCase }) => (
  <div className="suite-empty-state">
    <div>No test cases in {suiteName}</div>
    <Button onClick={() => onAddCase?.(suiteId)}>+ Add Case</Button>
  </div>
);

// Main HierarchicalTestSuiteTable Component
export const HierarchicalTestSuiteTable: React.FC<HierarchicalTestSuiteTableProps> = memo(({
  projectId,
  suites,
  expandedSuiteIds,
  selectedCaseIds,
  onToggleExpand,
  onSelectCase,
  onCaseClick,
  onRunCase,
  onEditSuite,
  onEditCase,
  onCreateSuite,
  onAddCase,
  onUpdateCaseTarget,
  addingCaseToSuiteId = null,
  onSaveNewCase,
  onCancelAddCase,
  loading = false,
  enableExecutionTargetEdit = true,
}) => {
  // Loading state
  if (loading && suites.length === 0) {
    return (
      <div className="hierarchical-table" role="table">
        <TableHeader />
        <div className="table-loading">
          <div>Loading test suites...</div>
        </div>
      </div>
    );
  }

  // Empty state
  if (suites.length === 0) {
    return (
      <div className="hierarchical-table" role="table">
        <TableHeader />
        <div className="suite-empty-state">
          <div>No test suites found</div>
          <Button primary onClick={onCreateSuite}>Create Test Suite</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="hierarchical-table" role="table" aria-label="Test Suites">
      <TableHeader />
      <div className="table-body" role="rowgroup">
        {suites.map(suite => {
          const isExpanded = expandedSuiteIds.has(suite.id);
          
          return (
            <React.Fragment key={suite.id}>
              <SuiteRow
                suite={suite}
                expanded={isExpanded}
                onToggleExpand={() => onToggleExpand(suite.id)}
                onAddCase={onAddCase ? () => onAddCase(suite.id) : undefined}
                onEditSuite={onEditSuite ? () => onEditSuite(suite.id) : undefined}
              />
              
              {isExpanded && suite.cases.length === 0 && addingCaseToSuiteId !== suite.id && (
                <EmptySuiteState suiteName={suite.name} suiteId={suite.id} onAddCase={onAddCase} />
              )}
              
              {isExpanded && addingCaseToSuiteId === suite.id && onSaveNewCase && onCancelAddCase && (
                <InlineTestCaseCreator
                  suiteId={suite.id}
                  projectId={projectId}
                  onSave={(data) => onSaveNewCase(suite.id, data)}
                  onCancel={onCancelAddCase}
                />
              )}
              
              {isExpanded && suite.cases.map(testCase => (
                <CaseRow
                  key={testCase.id}
                  projectId={projectId}
                  testCase={testCase}
                  selected={selectedCaseIds.has(testCase.id)}
                  onSelect={(selected) => onSelectCase(testCase.id, selected)}
                  onClick={onCaseClick ? () => onCaseClick(testCase.id) : undefined}
                  onRunCase={onRunCase ? () => onRunCase(testCase.id) : undefined}
                  onEditCase={onEditCase ? () => onEditCase(testCase.id) : undefined}
                  onUpdateTarget={onUpdateCaseTarget ? (target) => onUpdateCaseTarget(testCase.id, target) : undefined}
                  enableTargetEdit={enableExecutionTargetEdit}
                />
              ))}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
});

HierarchicalTestSuiteTable.displayName = 'HierarchicalTestSuiteTable';

