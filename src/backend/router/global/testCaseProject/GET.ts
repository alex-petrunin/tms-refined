
/**
 * @zod-to-schema
 */
export type TestCaseProjectsRes = {
    projects: Array<{
        id: string;
        key: string;
        name?: string;
    }>;
};

export default function handle(ctx: CtxGet<TestCaseProjectsRes>): void {
    const testSuiteProjects = ctx.settings.testCaseProjects as any;
    
    // Extract project information from settings
    const projects: Array<{ id: string; key: string; name?: string }> = [];
    
    if (testSuiteProjects) {
        // Handle single Project object
        const projectKey = testSuiteProjects.shortName || testSuiteProjects.key || testSuiteProjects.id;
        const projectId = testSuiteProjects.id || projectKey;
        const projectName = testSuiteProjects.name;
        
        if (projectKey) {
            projects.push({
                id: projectId,
                key: projectKey,
                name: projectName,
            });
        }
    }
    
    const response: TestCaseProjectsRes = {
        projects,
    };
    
    ctx.response.json(response);
}

export type Handle = typeof handle;

