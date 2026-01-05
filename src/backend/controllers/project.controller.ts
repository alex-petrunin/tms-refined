import type { AppSettings } from "../types/backend.global";

export interface ProjectSettings {
    bugReportsProject: string | null;
    testRunsProject: string | null;
    testSuitFieldName: string | null;
    bugIssueCommand: string | null;
    customLinkType: string | null;
    isTestCaseProject: boolean;
}

export class ProjectController {
    /**
     * Get project-specific settings from global app settings
     */
    static getSettings(settings: AppSettings): ProjectSettings {
        // Extract project settings from global app settings
        const testCaseProjects = settings.testCaseProjects as any;
        const testRunProjects = settings.testRunProjects as any;
        const testSuiteCustomFieldName = settings.testSuiteCustomFieldName as string | undefined;
        
        // Get project keys/IDs
        const testCaseProjectKey = testCaseProjects 
            ? (testCaseProjects.shortName || testCaseProjects.key || testCaseProjects.id || null)
            : null;
        
        const testRunProjectKey = testRunProjects 
            ? (testRunProjects.shortName || testRunProjects.key || testRunProjects.id || null)
            : null;

        return {
            bugReportsProject: null, // TODO: Add bug reports project setting if needed
            testRunsProject: testRunProjectKey,
            testSuitFieldName: testSuiteCustomFieldName || null,
            bugIssueCommand: null, // TODO: Add bug issue command setting if needed
            customLinkType: null, // TODO: Add custom link type setting if needed
            isTestCaseProject: !!testCaseProjectKey,
        };
    }
}

