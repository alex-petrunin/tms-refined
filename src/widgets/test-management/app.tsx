import React, {memo, useState, useCallback} from 'react';
import {createApi} from "@/api";
import {createComponentLogger} from "@/common/utils/logger.ts";
import {type ApiRouter} from '@/api/api';
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

const AppComponent: React.FunctionComponent = () => {
  const [activeTab, setActiveTab] = useState<TabId>('test-suites');

  const handleTabChange = useCallback((tabId: TabId) => {
    setActiveTab(tabId);
    logger.debug('Tab changed', {tabId});
  }, []);

  const renderActiveView = () => {
    switch (activeTab) {
      case 'test-suites':
        return <TestSuitesView api={api} />;
      case 'test-cases':
        return <TestCasesView api={api} />;
      case 'test-runs':
        return <TestRunsView api={api} />;
      case 'integrations':
        return <IntegrationsView api={api} />;
      case 'query':
        return <QueryView api={api} />;
      default:
        return <TestSuitesView api={api} />;
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

