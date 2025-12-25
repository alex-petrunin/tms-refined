import { Project } from "@/api/youtrack-types";
import { HandleExecutionResultUseCase } from "@/backend/application/usecases/HandleExecutionResult";
import { GitLabWebhookResultAdapter } from "@/backend/infrastructure/adapters/GitLabWebhookResultAdapter";
import { YouTrackTestRunRepository } from "@/backend/infrastructure/adapters/YouTrackTestRunRepository";

/**
 * @zod-to-schema
 */
export type GitLabWebhookReq = {};

/**
 * @zod-to-schema
 */
export type GitLabWebhookRes = {
    success: boolean;
    message?: string;
};

/**
 * GitLab Pipeline Webhook Endpoint
 * 
 * Receives GitLab pipeline webhook events and processes them using GitLabWebhookResultAdapter.
 * The adapter looks up test runs by pipeline ID and updates their status based on pipeline results.
 * 
 * Uses YouTrackTestRunRepository to persist pipeline ID associations and test run updates.
 * The repository searches across all projects using the YouTrack scripting API.
 */
export default function handle(ctx: CtxPost<GitLabWebhookReq, GitLabWebhookRes>): void {
    const body = ctx.request.json();

    // Validate that we have a payload
    if (!body || typeof body !== 'object') {
        ctx.response.code = 400;
        ctx.response.json({
            success: false,
            message: 'Invalid webhook payload'
        } as any);
        return;
    }

    // Get project from settings (for REST API fallback) or use a default
    // The scripting API will search globally, but REST API needs a project
    const testRunProjects = (ctx.settings.testRunProjects as Project[] | undefined) || [];
    const project = testRunProjects.length > 0 
        ? testRunProjects[0] 
        : { id: '0-0' } as Project; // Fallback project ID

    // Instantiate YouTrack repository with settings and global storage
    // Note: appHost is optional - repository will use scripting API if available
    const repository = new YouTrackTestRunRepository(
        project,
        ctx.settings,
        undefined, // appHost - optional, will use scripting API if not provided
        ctx.globalStorage
    );

    const handleExecutionResultUseCase = new HandleExecutionResultUseCase(repository);
    
    // Instantiate GitLab webhook adapter
    const webhookAdapter = new GitLabWebhookResultAdapter(
        handleExecutionResultUseCase,
        repository
    );

    // Process the webhook
    webhookAdapter.onWebhook(body).then(() => {
        const response: GitLabWebhookRes = {
            success: true,
            message: 'Webhook processed successfully'
        };

        ctx.response.json(response);
    }).catch((error) => {
        // Log error but return 200 to prevent GitLab from retrying
        // (we don't want duplicate processing if the webhook is valid but processing fails)
        console.error('GitLab webhook processing error:', error);
        
        ctx.response.code = 200; // Return 200 to acknowledge receipt
        ctx.response.json({
            success: false,
            message: error.message || 'Failed to process webhook'
        } as any);
    });
}

export type Handle = typeof handle;

