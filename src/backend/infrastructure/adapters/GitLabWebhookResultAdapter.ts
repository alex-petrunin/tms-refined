import { HandleExecutionResultUseCase } from "../../application/usecases/HandleExecutionResult";
import { TestRunRepository } from "../../application/ports/TestRunRepository";

/**
 * GitLab Pipeline Webhook Payload Types
 * Based on GitLab Pipeline Events webhook documentation
 */
export interface GitLabPipelineWebhookPayload {
    object_kind: "pipeline";
    object_attributes: {
        id: number;
        iid: number;
        name: string | null;
        ref: string;
        tag: boolean;
        sha: string;
        before_sha: string;
        source: string;
        status: GitLabPipelineStatus;
        detailed_status: string;
        stages: string[];
        created_at: string;
        finished_at: string | null;
        duration: number | null;
        queued_duration: number | null;
        protected_ref: boolean;
        variables: Array<{
            key: string;
            value: string;
        }>;
        url: string;
    };
    merge_request: unknown | null;
    user: {
        id: number;
        name: string;
        username: string;
        avatar_url: string;
        email: string;
    };
    project: {
        id: number;
        name: string;
        description: string | null;
        web_url: string;
        avatar_url: string | null;
        git_ssh_url: string;
        git_http_url: string;
        namespace: string;
        visibility_level: number;
        path_with_namespace: string;
        default_branch: string;
        ci_config_path: string;
    };
    commit: {
        id: string;
        message: string;
        title: string;
        timestamp: string;
        url: string;
        author: {
            name: string;
            email: string;
        };
    };
    builds?: Array<{
        id: number;
        stage: string;
        name: string;
        status: string;
        created_at: string;
        started_at: string | null;
        finished_at: string | null;
        duration: number | null;
        queued_duration: number | null;
        failure_reason: string | null;
        when: string;
        manual: boolean;
        allow_failure: boolean;
    }>;
}

/**
 * GitLab Pipeline Status values
 */
export type GitLabPipelineStatus =
    | "success"
    | "failed"
    | "canceled"
    | "skipped"
    | "running"
    | "pending"
    | "created"
    | "manual"
    | "waiting_for_resource";

/**
 * GitLab Webhook Result Adapter
 * 
 * Processes GitLab Pipeline webhook events and maps them to test execution results.
 * 
 * The adapter looks up test runs by pipeline ID (stored when the pipeline was triggered
 * by GitLabExecutionAdapter). It maps the pipeline status to a passed/failed result.
 * 
 * Only processes completed pipelines (success, failed, canceled). Running/pending pipelines
 * are ignored as they haven't finished yet.
 */
export class GitLabWebhookResultAdapter {
    constructor(
        private handleResultUC: HandleExecutionResultUseCase,
        private testRunRepository: TestRunRepository
    ) {}

    /**
     * Processes a GitLab pipeline webhook payload
     * @param payload The GitLab webhook payload
     * @throws Error if the payload is invalid or missing required information
     */
    async onWebhook(payload: unknown): Promise<void> {
        // Validate payload structure
        const validatedPayload = this.validatePayload(payload);

        // Only process completed pipelines
        if (!this.isPipelineCompleted(validatedPayload.object_attributes.status)) {
            console.log(
                `GitLabWebhookResultAdapter: Ignoring pipeline ${validatedPayload.object_attributes.id} ` +
                `with status '${validatedPayload.object_attributes.status}' (not completed yet)`
            );
            return;
        }

        // Look up test run by pipeline ID
        const pipelineId = String(validatedPayload.object_attributes.id);
        const testRun = await this.testRunRepository.findByPipelineId(pipelineId);
        
        if (!testRun) {
            console.warn(
                `GitLabWebhookResultAdapter: No test run found for pipeline ${pipelineId}. ` +
                `Skipping result processing.`
            );
            return;
        }

        // Map GitLab pipeline status to passed/failed
        const passed = this.mapStatusToPassed(validatedPayload.object_attributes.status);

        console.log(
            `GitLabWebhookResultAdapter: Processing pipeline ${pipelineId} ` +
            `for TestRun ${testRun.id}. Status: ${validatedPayload.object_attributes.status} → passed: ${passed}`
        );

        // Handle the execution result
        await this.handleResultUC.execute({
            testRunID: testRun.id,
            passed,
        });
    }

    /**
     * Validates the webhook payload structure
     * @param payload The raw webhook payload
     * @returns Validated GitLab pipeline webhook payload
     * @throws Error if the payload is invalid
     */
    private validatePayload(payload: unknown): GitLabPipelineWebhookPayload {
        if (!payload || typeof payload !== "object") {
            throw new Error("GitLab webhook payload must be an object");
        }

        const p = payload as Record<string, unknown>;

        if (p.object_kind !== "pipeline") {
            throw new Error(
                `Expected webhook object_kind to be 'pipeline', got '${p.object_kind}'`
            );
        }

        if (!p.object_attributes || typeof p.object_attributes !== "object") {
            throw new Error("GitLab webhook payload must contain object_attributes");
        }

        const attrs = p.object_attributes as Record<string, unknown>;

        if (typeof attrs.id !== "number") {
            throw new Error("Pipeline ID must be a number");
        }

        if (!attrs.status || typeof attrs.status !== "string") {
            throw new Error("Pipeline status must be a string");
        }

        if (!Array.isArray(attrs.variables)) {
            throw new Error("Pipeline variables must be an array");
        }

        return payload as GitLabPipelineWebhookPayload;
    }

    /**
     * Checks if a pipeline status indicates the pipeline has completed
     * @param status The pipeline status
     * @returns True if the pipeline is in a completed state
     */
    private isPipelineCompleted(status: GitLabPipelineStatus): boolean {
        const completedStatuses: GitLabPipelineStatus[] = [
            "success",
            "failed",
            "canceled",
            "skipped",
        ];
        return completedStatuses.includes(status);
    }


    /**
     * Maps GitLab pipeline status to a passed/failed boolean
     * @param status The GitLab pipeline status
     * @returns True if the pipeline passed, false if it failed
     */
    private mapStatusToPassed(status: GitLabPipelineStatus): boolean {
        switch (status) {
            case "success":
                return true;
            case "failed":
            case "canceled":
                return false;
            case "skipped":
                // Skipped pipelines are treated as passed (not a failure)
                return true;
            default:
                // This shouldn't happen if isPipelineCompleted is called first
                console.warn(
                    `GitLabWebhookResultAdapter: Unexpected pipeline status '${status}', treating as failed`
                );
                return false;
        }
    }
}

