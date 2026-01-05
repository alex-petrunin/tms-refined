import {Project} from "../../../../../../youtrack-apps/packages/youtrack-enhanced-dx-tools/youtrack-types";

/**
 * @zod-to-schema
 */
export type AppContextReq = {
    projectId?: string;
};

/**
 * @zod-to-schema
 */
export type AppContextRes = {
    projectId: string | null;
    projectKey: string | null;
    settings: {
        testCaseProjects?: Project[];
        testRunProjects?: Project[];
        testSuiteProjects?: Project[];
        testCaseIssueType?: string;
        testRunIssueType?: string;
        testSuiteCustomFieldName?: string;
    };
};

export default function handle(ctx: CtxGet<AppContextRes, AppContextReq>): void {
    const projectId = ctx.request.query.projectId;
    // In global scope, project might be available if widget is opened in project context
    const project = ctx.project;

    // Return global App settings (contains testCaseProjects, testRunProjects, testSuiteProjects, etc.)
    // and project info if available
    const response: AppContextRes = {
        projectId: project?.id || projectId || null,
        projectKey: project?.key || null,
        settings: ctx.settings // Global AppSettings with testCaseProjects, testRunProjects, etc.
    };

    ctx.response.json(response);
}

export type Handle = typeof handle;

