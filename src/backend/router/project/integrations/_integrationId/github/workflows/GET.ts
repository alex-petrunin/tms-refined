import { YouTrackIntegrationRepository } from "../../../../../../infrastructure/adapters/YouTrackIntegrationRepository";
import { GitHubDiscoveryService } from "../../../../../../infrastructure/services/GitHubDiscoveryService";

/**
 * @zod-to-schema
 */
export type WorkflowItem = {
    /** Human-readable workflow name */
    name: string;
    /** Path to the workflow file */
    path: string;
};

/**
 * @zod-to-schema
 */
export type GetGitHubWorkflowsRes = {
    /** Array of GitHub Actions workflows */
    workflows: WorkflowItem[];
};

/**
 * GET /project/integrations/:integrationId/github/workflows
 * 
 * Lists GitHub Actions workflows from a repository for workflow selection
 * Results are cached for 5 minutes to avoid rate limiting
 */
export default async function handle(ctx: CtxGet<GetGitHubWorkflowsRes>): Promise<void> {
    const project = ctx.project;
    const projectKey = project.shortName || project.key;
    
    // Extract integration ID from path
    // Path format: /project/integrations/:integrationId/github/workflows
    const pathParts = ctx.request.path.split('/');
    const integrationIdIndex = pathParts.indexOf('integrations') + 1;
    const integrationId = pathParts[integrationIdIndex];

    if (!integrationId) {
        ctx.response.code = 400;
        ctx.response.json({ error: 'Integration ID is required in path' } as any);
        return;
    }

    console.log('[GET github/workflows] Integration ID:', integrationId, 'Project:', projectKey);

    try {
        // Load integration
        const integrationRepo = new YouTrackIntegrationRepository();
        const integration = await integrationRepo.findById(integrationId, projectKey);

        if (!integration) {
            ctx.response.code = 404;
            ctx.response.json({ error: `Integration '${integrationId}' not found` } as any);
            return;
        }

        if (integration.type !== 'GITHUB') {
            ctx.response.code = 400;
            ctx.response.json({ 
                error: `Integration '${integration.name}' is not a GitHub integration (type: ${integration.type})` 
            } as any);
            return;
        }

        if (!integration.enabled) {
            ctx.response.code = 400;
            ctx.response.json({ 
                error: `Integration '${integration.name}' is disabled` 
            } as any);
            return;
        }

        // Discover workflows
        const discoveryService = new GitHubDiscoveryService();
        const workflows = await discoveryService.listWorkflows(integration);

        const response: GetGitHubWorkflowsRes = {
            workflows
        };

        ctx.response.json(response);
    } catch (error: any) {
        console.error('[GET github/workflows] Error:', error);
        ctx.response.code = 500;
        ctx.response.json({ 
            error: error.message || `Failed to fetch GitHub workflows: ${error}` 
        } as any);
    }
}

export type Handle = typeof handle;

