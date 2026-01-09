import React, { memo, useState, useEffect, useCallback } from 'react';
import Dialog from '@jetbrains/ring-ui-built/components/dialog/dialog';
import { Header, Content } from '@jetbrains/ring-ui-built/components/island/island';
import Panel from '@jetbrains/ring-ui-built/components/panel/panel';
import Button from '@jetbrains/ring-ui-built/components/button/button';
import { Tabs } from '@jetbrains/ring-ui-built/components/tabs/tabs';
import Input from '@jetbrains/ring-ui-built/components/input/input';
import Loader from '@jetbrains/ring-ui-built/components/loader/loader';
import { useHost } from '@/widgets/common/hooks/use-host';
import { createApi } from '@/api';
import './test-case-inspector.css';

interface TestCaseData {
  id: string;
  issueId?: string;
  summary: string;
  description: string;
  executionTarget?: {
    integrationId: string;
    name: string;
    type: string;
    config: Record<string, any>;
  };
}

interface TestCaseInspectorProps {
  caseId: string | null;
  projectId: string;
  open: boolean;
  onClose: () => void;
  onSave?: (data: Partial<TestCaseData>) => void;
}

type TabId = 'details' | 'steps' | 'history';

/**
 * TestCaseInspector Component
 * Slide-out panel for viewing and editing test case details
 * Features: Details, Steps, and History tabs
 */
export const TestCaseInspector: React.FC<TestCaseInspectorProps> = memo(({
  caseId,
  projectId,
  open,
  onClose,
  onSave,
}) => {
  const host = useHost();
  const api = createApi(host);

  const [activeTab, setActiveTab] = useState<TabId>('details');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testCase, setTestCase] = useState<TestCaseData | null>(null);

  // Form state
  const [editedSummary, setEditedSummary] = useState('');
  const [editedDescription, setEditedDescription] = useState('');
  const [hasChanges, setHasChanges] = useState(false);

  // Load test case data when caseId changes
  useEffect(() => {
    if (!caseId || !open || !projectId) {
      setTestCase(null);
      return;
    }

    const loadTestCase = async () => {
      setLoading(true);
      setError(null);

      try {
        const response = await api.project.testCases.GET({
          projectId,
          id: caseId,
          includeExecutionTarget: true,
        } as any);

        const caseData = 'items' in response ? response.items[0] : response;

        setTestCase(caseData);
        setEditedSummary(caseData.summary || '');
        setEditedDescription(caseData.description || '');
        setHasChanges(false);
      } catch (err) {
        console.error('Failed to load test case:', err);
        setError(err instanceof Error ? err.message : 'Failed to load test case');
      } finally {
        setLoading(false);
      }
    };

    loadTestCase();
  }, [caseId, open, projectId, api]);

  // Track changes
  useEffect(() => {
    if (!testCase) return;

    const changed =
      editedSummary !== (testCase.summary || '') ||
      editedDescription !== (testCase.description || '');

    setHasChanges(changed);
  }, [editedSummary, editedDescription, testCase]);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!testCase || !caseId || !projectId) return;

    setSaving(true);
    setError(null);

    try {
      await api.project.testCases.PUT({
        projectId,
        id: caseId,
        summary: editedSummary,
        description: editedDescription,
      } as any);

      // Update local state
      setTestCase({
        ...testCase,
        summary: editedSummary,
        description: editedDescription,
      });
      setHasChanges(false);

      // Notify parent
      if (onSave) {
        onSave({
          summary: editedSummary,
          description: editedDescription,
        });
      }
    } catch (err) {
      console.error('Failed to save test case:', err);
      setError(err instanceof Error ? err.message : 'Failed to save changes');
    } finally {
      setSaving(false);
    }
  }, [testCase, caseId, projectId, editedSummary, editedDescription, onSave, api]);

  // Handle cancel
  const handleCancel = useCallback(() => {
    if (testCase) {
      setEditedSummary(testCase.summary || '');
      setEditedDescription(testCase.description || '');
      setHasChanges(false);
    }
    onClose();
  }, [testCase, onClose]);

  // Tab configuration
  const tabs = [
    { id: 'details', title: 'Details' },
    { id: 'steps', title: 'Steps' },
    { id: 'history', title: 'History' },
  ];

  // Render tab content
  const renderTabContent = () => {
    if (loading) {
      return (
        <div style={{ padding: 24, textAlign: 'center' }}>
          <Loader message="Loading test case..." />
        </div>
      );
    }

    if (error) {
      return (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--ring-error-color)' }}>
          <div>{error}</div>
          <Button onClick={() => setError(null)} style={{ marginTop: 12 }}>
            Dismiss
          </Button>
        </div>
      );
    }

    if (!testCase) {
      return (
        <div style={{ padding: 24, textAlign: 'center', color: 'var(--ring-secondary-color)' }}>
          No test case selected
        </div>
      );
    }

    switch (activeTab) {
      case 'details':
        return (
          <div className="inspector-tab-content">
            <div className="form-field">
              <label className="form-label">Test Case ID</label>
              <Input
                value={testCase.issueId || testCase.id}
                disabled
              />
            </div>

            <div className="form-field">
              <label className="form-label">Summary *</label>
              <Input
                value={editedSummary}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditedSummary(e.target.value)}
                placeholder="Enter test case summary"
              />
            </div>

            <div className="form-field">
              <label className="form-label">Description</label>
              <textarea
                className="form-textarea"
                value={editedDescription}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setEditedDescription(e.target.value)}
                placeholder="Enter test case description"
                rows={6}
              />
            </div>

            <div className="form-field">
              <label className="form-label">Execution Target</label>
              <div className="execution-target-display">
                {testCase.executionTarget ? (
                  <div>
                    <strong>{testCase.executionTarget.name}</strong>
                    <span style={{ marginLeft: 8, color: 'var(--ring-secondary-color)' }}>
                      ({testCase.executionTarget.type})
                    </span>
                  </div>
                ) : (
                  <span style={{ color: 'var(--ring-secondary-color)' }}>
                    No execution target set
                  </span>
                )}
              </div>
            </div>
          </div>
        );

      case 'steps':
        return (
          <div className="inspector-tab-content">
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--ring-secondary-color)' }}>
              <div>Test steps feature coming soon</div>
              <div style={{ marginTop: 8, fontSize: 13 }}>
                Add, edit, and reorder test steps with expected results
              </div>
            </div>
          </div>
        );

      case 'history':
        return (
          <div className="inspector-tab-content">
            <div style={{ padding: 24, textAlign: 'center', color: 'var(--ring-secondary-color)' }}>
              <div>Test run history feature coming soon</div>
              <div style={{ marginTop: 8, fontSize: 13 }}>
                View past test runs and their results
              </div>
            </div>
          </div>
        );

      default:
        return null;
    }
  };

  if (!open) {
    return null;
  }

  return (
    <Dialog
      show={open}
      onCloseAttempt={handleCancel}
      trapFocus
      autoFocusFirst
      className="test-case-inspector-dialog"
    >
      <Header>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
          <span>Test Case Details</span>
          {testCase && (
            <span style={{ fontSize: 13, fontWeight: 'normal', color: 'var(--ring-secondary-color)' }}>
              {testCase.issueId || testCase.id}
            </span>
          )}
        </div>
      </Header>

      <Content>
        <Tabs
          selected={activeTab}
          onSelect={(id: string) => setActiveTab(id as TabId)}
          tabs={tabs}
        />

        {renderTabContent()}
      </Content>

      <Panel>
        <Button onClick={handleCancel} disabled={saving}>
          Cancel
        </Button>
        <Button
          primary
          onClick={handleSave}
          disabled={!hasChanges || saving || loading}
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </Panel>
    </Dialog>
  );
});

TestCaseInspector.displayName = 'TestCaseInspector';

