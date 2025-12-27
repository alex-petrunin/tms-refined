/**
 * @zod-to-schema
 */
export type DeleteIntegrationReq = {
    projectId: string;
    id: string;
};

/**
 * @zod-to-schema
 */
export type DeleteIntegrationRes = {
    success: boolean;
    deletedId: string;
};

export default function handle(ctx: CtxDelete<DeleteIntegrationRes, DeleteIntegrationReq>): void {
    const entities = require('@jetbrains/youtrack-scripting-api/entities');
    const project = ctx.project;

    // Get query params using getParameter
    const getParam = (name: string): string | undefined => {
        if (ctx.request.getParameter) {
            const val = ctx.request.getParameter(name);
            return val || undefined;
        }
        return undefined;
    };

    const integrationId = getParam('id');

    console.log('[DELETE integrations] Deleting integration:', integrationId);

    if (!integrationId) {
        ctx.response.code = 400;
        ctx.response.json({ error: 'Integration ID is required' } as any);
        return;
    }

    try {
        // Find the YouTrack project entity
        const ytProject = entities.Project.findByKey(project.shortName || project.key);
        if (!ytProject) {
            ctx.response.code = 404;
            ctx.response.json({ error: 'Project not found' } as any);
            return;
        }

        // Load existing integrations
        let integrations: any[] = [];
        try {
            const integrationsJson = ytProject.extensionProperties.integrations;
            if (integrationsJson && typeof integrationsJson === 'string') {
                integrations = JSON.parse(integrationsJson);
            }
        } catch (e) {
            console.warn('[DELETE integrations] Failed to parse existing integrations:', e);
        }

        // Find the integration to delete
        const index = integrations.findIndex(i => i.id === integrationId);
        if (index === -1) {
            ctx.response.code = 404;
            ctx.response.json({ error: `Integration not found: ${integrationId}` } as any);
            return;
        }

        // Remove the integration
        integrations.splice(index, 1);

        // Save back to extension properties
        ytProject.extensionProperties.integrations = JSON.stringify(integrations);

        console.log('[DELETE integrations] Deleted integration:', integrationId);

        ctx.response.json({
            success: true,
            deletedId: integrationId
        });
    } catch (error: any) {
        ctx.response.code = 500;
        ctx.response.json({ error: `Failed to delete integration: ${error.message || error}` } as any);
    }
}

export type Handle = typeof handle;

