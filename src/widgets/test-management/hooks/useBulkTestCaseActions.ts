import { useState, useCallback, useMemo } from 'react';

interface TestCase {
  id: string;
  summary: string;
  suiteId?: string;
}

interface UseBulkTestCaseActionsOptions {
  onRunSelected?: (caseIds: string[]) => void;
  onBulkEditTarget?: (caseIds: string[]) => void;
}

interface UseBulkTestCaseActionsResult {
  selectedCaseIds: Set<string>;
  selectCase: (caseId: string) => void;
  deselectCase: (caseId: string) => void;
  toggleCase: (caseId: string) => void;
  selectMultiple: (caseIds: string[]) => void;
  deselectMultiple: (caseIds: string[]) => void;
  selectAll: (cases: TestCase[]) => void;
  clearSelection: () => void;
  isSelected: (caseId: string) => boolean;
  selectedCount: number;
  getSelectedCases: (allCases: TestCase[]) => TestCase[];
  // Suite-level selection
  selectSuiteCases: (suiteId: string, cases: TestCase[]) => void;
  deselectSuiteCases: (suiteId: string, cases: TestCase[]) => void;
  isSuiteSelected: (suiteId: string, cases: TestCase[]) => boolean;
  isSuitePartiallySelected: (suiteId: string, cases: TestCase[]) => boolean;
}

/**
 * Hook for managing bulk test case selection and actions
 * Tracks selected cases across expanded/collapsed suites
 * Supports suite-level selection with parent-child propagation
 */
export function useBulkTestCaseActions(
  options: UseBulkTestCaseActionsOptions = {}
): UseBulkTestCaseActionsResult {
  const { onRunSelected, onBulkEditTarget } = options;
  const [selectedCaseIds, setSelectedCaseIds] = useState<Set<string>>(new Set());

  const selectCase = useCallback((caseId: string) => {
    setSelectedCaseIds(prev => {
      const newSet = new Set(prev);
      newSet.add(caseId);
      return newSet;
    });
  }, []);

  const deselectCase = useCallback((caseId: string) => {
    setSelectedCaseIds(prev => {
      const newSet = new Set(prev);
      newSet.delete(caseId);
      return newSet;
    });
  }, []);

  const toggleCase = useCallback((caseId: string) => {
    setSelectedCaseIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(caseId)) {
        newSet.delete(caseId);
      } else {
        newSet.add(caseId);
      }
      return newSet;
    });
  }, []);

  const selectMultiple = useCallback((caseIds: string[]) => {
    setSelectedCaseIds(prev => {
      const newSet = new Set(prev);
      caseIds.forEach(id => newSet.add(id));
      return newSet;
    });
  }, []);

  const deselectMultiple = useCallback((caseIds: string[]) => {
    setSelectedCaseIds(prev => {
      const newSet = new Set(prev);
      caseIds.forEach(id => newSet.delete(id));
      return newSet;
    });
  }, []);

  const selectAll = useCallback((cases: TestCase[]) => {
    setSelectedCaseIds(new Set(cases.map(c => c.id)));
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedCaseIds(new Set());
  }, []);

  const isSelected = useCallback((caseId: string): boolean => {
    return selectedCaseIds.has(caseId);
  }, [selectedCaseIds]);

  const selectedCount = useMemo(() => selectedCaseIds.size, [selectedCaseIds]);

  const getSelectedCases = useCallback((allCases: TestCase[]): TestCase[] => {
    return allCases.filter(c => selectedCaseIds.has(c.id));
  }, [selectedCaseIds]);

  // Suite-level selection helpers
  const selectSuiteCases = useCallback((suiteId: string, cases: TestCase[]) => {
    const suiteCaseIds = cases
      .filter(c => c.suiteId === suiteId)
      .map(c => c.id);
    selectMultiple(suiteCaseIds);
  }, [selectMultiple]);

  const deselectSuiteCases = useCallback((suiteId: string, cases: TestCase[]) => {
    const suiteCaseIds = cases
      .filter(c => c.suiteId === suiteId)
      .map(c => c.id);
    deselectMultiple(suiteCaseIds);
  }, [deselectMultiple]);

  const isSuiteSelected = useCallback((suiteId: string, cases: TestCase[]): boolean => {
    const suiteCases = cases.filter(c => c.suiteId === suiteId);
    if (suiteCases.length === 0) return false;
    return suiteCases.every(c => selectedCaseIds.has(c.id));
  }, [selectedCaseIds]);

  const isSuitePartiallySelected = useCallback((suiteId: string, cases: TestCase[]): boolean => {
    const suiteCases = cases.filter(c => c.suiteId === suiteId);
    if (suiteCases.length === 0) return false;
    const selectedInSuite = suiteCases.filter(c => selectedCaseIds.has(c.id));
    return selectedInSuite.length > 0 && selectedInSuite.length < suiteCases.length;
  }, [selectedCaseIds]);

  return {
    selectedCaseIds,
    selectCase,
    deselectCase,
    toggleCase,
    selectMultiple,
    deselectMultiple,
    selectAll,
    clearSelection,
    isSelected,
    selectedCount,
    getSelectedCases,
    selectSuiteCases,
    deselectSuiteCases,
    isSuiteSelected,
    isSuitePartiallySelected,
  };
}

