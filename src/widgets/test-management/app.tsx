import {memo, useCallback, useEffect} from 'react';
import type {FC} from "react";
import {createApi} from "@/api";
import {createComponentLogger} from "@/common/utils/logger.ts";
import {Tabs} from './components/shared/Tabs';
import {TestSuitesView} from './components/TestSuites/TestSuitesView';
import {TestRunsView} from './components/TestRuns/TestRunsView';
import {IntegrationsView} from './components/Integrations/IntegrationsView';
import {QueryView} from './components/Query/QueryView';
import {useAppState} from './hooks/use-app-state';
import {useTestCaseProjects} from './hooks/use-test-suites-projects';
import './app.css';

const host = await YTApp.register();
const api = createApi(host);
const logger = createComponentLogger("test-management-app");

type TabId = 'test-suites' | 'test-runs' | 'integrations' | 'query';

// Map tab IDs to AppState page names
// Note: Test Cases tab removed as it's now integrated into Test Suites hierarchical view
const tabToPageMap: Record<TabId, "testSuits" | "testCases" | "testRuns" | "testDashboard" | "integrations"> = {
    'test-suites': 'testSuits',
    'test-runs': 'testRuns',
    'integrations': 'integrations',
    'query': 'testDashboard',
};

const pageToTabMap: Record<"testSuits" | "testCases" | "testRuns" | "testDashboard" | "integrations", TabId> = {
    'testSuits': 'test-suites',
    'testCases': 'test-suites', // Redirect test cases to test suites view
    'testRuns': 'test-runs',
    'testDashboard': 'query',
    'integrations': 'integrations',
};

const AppComponent: FC = () => {
    const {state, dispatch} = useAppState();
    const {data: testCaseProjects} = useTestCaseProjects();
    
    // Initialize project selection from test suites projects
    useEffect(() => {
        if (testCaseProjects?.projects && testCaseProjects.projects.length > 0 && !state.selectedProjectKey) {
            dispatch({
                type: "selectProject",
                payload: { projectKey: testCaseProjects.projects[0].key },
            });
        }
    }, [testCaseProjects, state.selectedProjectKey, dispatch]);

    // Listen for navigation to integrations
    useEffect(() => {
        const handleNavigateToIntegrations = () => {
            dispatch({
                type: "changePageInProject",
                payload: { page: "integrations" },
            });
        };

        window.addEventListener('navigate-to-integrations', handleNavigateToIntegrations as EventListener);
        return () => {
            window.removeEventListener('navigate-to-integrations', handleNavigateToIntegrations as EventListener);
        };
    }, [dispatch]);

    // If no projects are configured, show interface with a placeholder project
    const projectKey = state.selectedProjectKey || "default";
    
    // Sync activeTab with state.currentPageInProject
    const activeTab = pageToTabMap[state.currentPageInProject] || 'test-suites';

    const handleTabChange = useCallback((tabId: string) => {
        const page = tabToPageMap[tabId as TabId];
        if (page) {
            dispatch({
                type: "changePageInProject",
                payload: { page },
            });
        }
        logger.debug('Tab changed', {tabId, projectKey, page});
    }, [projectKey, dispatch]);

    const renderActiveView = () => {
        switch (activeTab) {
            case 'test-suites':
                return <TestSuitesView projectId={projectKey}/>;
            case 'test-runs':
                return <TestRunsView projectId={projectKey}/>;
            case 'integrations':
                return <IntegrationsView projectId={projectKey}/>;
            case 'query':
                return <QueryView api={api} projectId={projectKey}/>;
            default:
                return <TestSuitesView projectId={projectKey}/>;
        }
    };

    return (
        <div className="test-management-widget">
            <Tabs
                activeTab={activeTab}
                onTabChange={handleTabChange}
                tabs={[
                    {id: 'test-suites', label: 'Test Suites'},
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

