
/**
 * @zod-to-schema
 */
export type AppSettingsRes = {
    settings: {
        testCaseProjects?: Array<{
            id: string;
            key: string;
            name?: string;
            [key: string]: unknown;
        }>;
        testRunProjects?: Array<{
            id: string;
            key: string;
            name?: string;
            [key: string]: unknown;
        }>;
        testSuiteProjects?: Array<{
            id: string;
            key: string;
            name?: string;
            [key: string]: unknown;
        }>;
        testCaseIssueType?: string;
        testRunIssueType?: string;
        testSuiteCustomFieldName?: string;
    };
};

export default function handle(ctx: CtxGet<AppSettingsRes>): void {
    // Return global App settings (contains testCaseProjects, testRunProjects, testSuiteProjects, etc.)
    const response: AppSettingsRes = {
        settings: ctx.settings
    };

    ctx.response.json(response);
}

export type Handle = typeof handle;

