import React, {memo, useState, useCallback, useMemo} from 'react';
import {createApi} from "@/api";
import {createComponentLogger} from "@/common/utils/logger.ts";
import {Tabs} from './components/shared/Tabs';
import {TestSuitesView} from './components/TestSuites/TestSuitesView';
import {TestCasesView} from './components/TestCases/TestCasesView';
import {TestRunsView} from './components/TestRuns/TestRunsView';
import {IntegrationsView} from './components/Integrations/IntegrationsView';
import {QueryView} from './components/Query/QueryView';
import './app.css';

const host = await YTApp.register();
const api = createApi(host);
const logger = createComponentLogger("test-management-app");

type TabId = 'test-suites' | 'test-cases' | 'test-runs' | 'integrations' | 'query';

// Get projectId from entity context or return null
const getProjectId = (): string | null => {
  if (YTApp.entity?.type === 'project') {
    // Try to get key first, fallback to id
    return (YTApp.entity as any).key || YTApp.entity.id || null;
  }
  return null;
};

const AppComponent: React.FunctionComponent = () => {
  const [activeTab, setActiveTab] = useState<TabId>('test-suites');
  
  // Get projectId from entity context
  const projectId = useMemo(() => getProjectId(), []);

  const handleTabChange = useCallback((tabId: string) => {
    setActiveTab(tabId as TabId);
    logger.debug('Tab changed', {tabId, projectId});
  }, [projectId]);

  const renderActiveView = () => {
    switch (activeTab) {
      case 'test-suites':
        return <TestSuitesView api={api} projectId={projectId || undefined} />;
      case 'test-cases':
        return <TestCasesView api={api} projectId={projectId || undefined} />;
      case 'test-runs':
        return <TestRunsView api={api} projectId={projectId || undefined} />;
      case 'integrations':
        return <IntegrationsView api={api} projectId={projectId || undefined} />;
      case 'query':
        return <QueryView api={api} projectId={projectId || undefined} />;
      default:
        return <TestSuitesView api={api} projectId={projectId || undefined} />;
    }
  };

  return (
    <div className="test-management-widget">
      <div className="widget-header">
        <h1>Test Management System</h1>
      </div>
      <Tabs
        activeTab={activeTab}
        onTabChange={handleTabChange}
        tabs={[
          {id: 'test-suites', label: 'Test Suites'},
          {id: 'test-cases', label: 'Test Cases'},
          {id: 'test-runs', label: 'Test Runs'},
          {id: 'integrations', label: 'Integrations'},
          {id: 'query', label: 'Query'}
        ]}
      />
      <div className="widget-content">
        {renderActiveView()}
      </div>
    </div>
  );
};

export const App = memo(AppComponent);

