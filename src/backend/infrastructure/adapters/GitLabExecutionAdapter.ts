import { ExecutionTriggerPort } from "../../application/ports/ExecutionTriggerPort";
import { TestRun } from "../../domain/entities/TestRun";
import { ExecutionTargetType } from "../../domain/enums/ExecutionTargetType";

/**
 * Configuration for GitLab CI integration
 */
export interface GitLabConfig {
    /** GitLab API base URL (e.g., 'https://gitlab.com' or 'https://gitlab.example.com') */
    baseUrl: string;
    /** GitLab API token with API scope */
    apiToken: string;
    /** Project ID (numeric or path with namespace, e.g., 'group/project' or '12345') */
    projectId: string;
}

/**
 * GitLab CI Pipeline trigger response
 */
interface GitLabPipelineResponse {
    id: number;
    status: string;
    ref: string;
    web_url: string;
}

/**
 * GitLab CI Execution Adapter
 * 
 * Triggers GitLab CI pipelines via the GitLab API.
 * The ExecutionTargetSnapshot.ref should contain the branch/tag name to run the pipeline on.
 * 
 * Example ref values: 'main', 'develop', 'feature/branch', 'v1.0.0'
 */
export class GitLabExecutionAdapter implements ExecutionTriggerPort {
    constructor(private config: GitLabConfig) {
        if (!config.baseUrl || !config.apiToken || !config.projectId) {
            throw new Error("GitLabExecutionAdapter requires baseUrl, apiToken, and projectId");
        }
    }

    async trigger(testRun: TestRun): Promise<void> {
        // Validate execution target type
        if (testRun.executionTarget.type !== ExecutionTargetType.GITLAB) {
            throw new Error(
                `GitLabExecutionAdapter cannot handle execution target of type '${testRun.executionTarget.type}'. ` +
                `Expected '${ExecutionTargetType.GITLAB}'.`
            );
        }

        // Extract branch/ref from ExecutionTargetSnapshot
        const ref = testRun.executionTarget.ref;
        if (!ref || ref.trim() === "") {
            throw new Error(
                `ExecutionTargetSnapshot.ref is required for GitLab pipeline trigger. ` +
                `TestRun ID: ${testRun.id}`
            );
        }

        try {
            const pipeline = await this.triggerPipeline(ref, testRun.id);
            console.log(
                `GitLabExecutionAdapter: Successfully triggered pipeline ${pipeline.id} ` +
                `for TestRun ${testRun.id} on ref '${ref}'. ` +
                `Pipeline URL: ${pipeline.web_url}`
            );
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(
                `GitLabExecutionAdapter: Failed to trigger pipeline for TestRun ${testRun.id}: ${errorMessage}`
            );
            throw new Error(
                `Failed to trigger GitLab CI pipeline: ${errorMessage}`
            );
        }
    }

    /**
     * Triggers a GitLab CI pipeline
     * @param ref Branch or tag name to run the pipeline on
     * @param testRunId TestRun ID for logging/tracking purposes
     * @returns Pipeline information
     */
    private async triggerPipeline(ref: string, testRunId: string): Promise<GitLabPipelineResponse> {
        const url = `${this.config.baseUrl}/api/v4/projects/${encodeURIComponent(this.config.projectId)}/pipeline`;
        
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "PRIVATE-TOKEN": this.config.apiToken,
            },
            body: JSON.stringify({
                ref: ref,
                variables: [
                    {
                        key: "TEST_RUN_ID",
                        value: testRunId,
                    },
                ],
            }),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            let errorMessage = `GitLab API returned ${response.status} ${response.statusText}`;
            
            try {
                const errorJson = JSON.parse(errorBody);
                if (errorJson.message) {
                    errorMessage = errorJson.message;
                } else if (errorJson.error) {
                    errorMessage = errorJson.error;
                }
            } catch {
                // If parsing fails, use the raw error body if available
                if (errorBody) {
                    errorMessage += `: ${errorBody}`;
                }
            }
            
            throw new Error(errorMessage);
        }

        return await response.json() as GitLabPipelineResponse;
    }
}

