import {memo, useState, useCallback} from 'react';
import type {FC} from "react";
import {createApi} from "@/api";
import {createComponentLogger} from "@/common/utils/logger.ts";
import {Tabs} from './components/shared/Tabs';
import {TestSuitesView} from './components/TestSuites/TestSuitesView';
import {TestCasesView} from './components/TestCases/TestCasesView';
import {TestRunsView} from './components/TestRuns/TestRunsView';
import {IntegrationsView} from './components/Integrations/IntegrationsView';
import {QueryView} from './components/Query/QueryView';
import {useSettings} from './hooks/useSettings';
import './app.css';

const host = await YTApp.register();
const api = createApi(host);
const logger = createComponentLogger("test-management-app");

type TabId = 'test-suites' | 'test-cases' | 'test-runs' | 'integrations' | 'query';

const AppComponent: FC = () => {
    const [activeTab, setActiveTab] = useState<TabId>('test-suites');


    // Get settings using host.fetchApp with scope: false (no entity context required)
    const {settings: _settings} = useSettings(host);
    // TODO: Use settings to get projectId dynamically
    // const projectId = settings.testCaseProjects?.[0]?.key;
    const projectId = "DEM";


    const handleTabChange = useCallback((tabId: string) => {
        setActiveTab(tabId as TabId);
        logger.debug('Tab changed', {tabId, projectId});
    }, [projectId]);

    const renderActiveView = () => {
        switch (activeTab) {
            case 'test-suites':
                return <TestSuitesView projectId={projectId || undefined}/>;
            case 'test-cases':
                return <TestCasesView projectId={projectId || undefined}/>;
            case 'test-runs':
                return <TestRunsView projectId={projectId || undefined}/>;
            case 'integrations':
                return <IntegrationsView projectId={projectId || undefined}/>;
            case 'query':
                return <QueryView api={api} projectId={projectId || undefined}/>;
            default:
                return <TestSuitesView projectId={projectId || undefined}/>;
        }
    };

    return (
        <div className="test-management-widget">

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

