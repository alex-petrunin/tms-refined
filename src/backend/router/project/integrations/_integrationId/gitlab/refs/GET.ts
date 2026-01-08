import { YouTrackIntegrationRepository } from "../../../../../../infrastructure/adapters/YouTrackIntegrationRepository";
import { GitLabDiscoveryService } from "../../../../../../infrastructure/services/GitLabDiscoveryService";

/**
 * @zod-to-schema
 */
export type RefItem = {
    /** Name of the branch or tag */
    name: string;
    /** Type of reference */
    type: 'branch' | 'tag';
};

/**
 * @zod-to-schema
 */
export type GetGitLabRefsRes = {
    /** Array of Git references (branches and tags) */
    refs: RefItem[];
};

/**
 * GET /project/integrations/:integrationId/gitlab/refs
 * 
 * Lists branches and tags from a GitLab repository for pipeline selection
 * Results are cached for 5 minutes to avoid rate limiting
 */
export default async function handle(ctx: CtxGet<GetGitLabRefsRes>): Promise<void> {
    const project = ctx.project;
    const projectKey = project.shortName || project.key;
    
    // Extract integration ID from path
    // Path format: /project/integrations/:integrationId/gitlab/refs
    const pathParts = ctx.request.path.split('/');
    const integrationIdIndex = pathParts.indexOf('integrations') + 1;
    const integrationId = pathParts[integrationIdIndex];

    if (!integrationId) {
        ctx.response.code = 400;
        ctx.response.json({ error: 'Integration ID is required in path' } as any);
        return;
    }

    console.log('[GET gitlab/refs] Integration ID:', integrationId, 'Project:', projectKey);

    try {
        // Load integration
        const integrationRepo = new YouTrackIntegrationRepository();
        const integration = await integrationRepo.findById(integrationId, projectKey);

        if (!integration) {
            ctx.response.code = 404;
            ctx.response.json({ error: `Integration '${integrationId}' not found` } as any);
            return;
        }

        if (integration.type !== 'GITLAB') {
            ctx.response.code = 400;
            ctx.response.json({ 
                error: `Integration '${integration.name}' is not a GitLab integration (type: ${integration.type})` 
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

        // Discover refs
        const discoveryService = new GitLabDiscoveryService();
        const refs = await discoveryService.listRefs(integration);

        const response: GetGitLabRefsRes = {
            refs
        };

        ctx.response.json(response);
    } catch (error: any) {
        console.error('[GET gitlab/refs] Error:', error);
        ctx.response.code = 500;
        ctx.response.json({ 
            error: error.message || `Failed to fetch GitLab refs: ${error}` 
        } as any);
    }
}

export type Handle = typeof handle;

