import { ExecutionTriggerPort } from "../../application/ports/ExecutionTriggerPort";
import { TestRun } from "../../domain/entities/TestRun";
import { ExecutionTargetType } from "../../domain/enums/ExecutionTargetType";

/**
 * Configuration for GitHub Actions integration
 */
export interface GitHubConfig {
    /** GitHub API base URL (defaults to 'https://api.github.com', use 'https://github.example.com/api/v3' for GitHub Enterprise) */
    baseUrl?: string;
    /** GitHub personal access token or GitHub App token with 'actions:write' permission */
    apiToken: string;
    /** Repository owner (username or organization) */
    owner: string;
    /** Repository name */
    repo: string;
}

/**
 * GitHub Actions workflow dispatch response
 */
interface GitHubWorkflowDispatchResponse {
    // GitHub API returns 204 No Content on success, so no response body
}

/**
 * GitHub Actions Execution Adapter
 * 
 * Triggers GitHub Actions workflows via the GitHub API.
 * The ExecutionTargetSnapshot.ref should contain the workflow file path (e.g., 'ci.yml' or '.github/workflows/test.yml')
 * and optionally the branch name separated by ':' (e.g., 'ci.yml:main' or '.github/workflows/test.yml:develop').
 * If no branch is specified, the default branch is used.
 * 
 * Example ref values:
 * - 'ci.yml' (runs on default branch)
 * - 'ci.yml:main' (runs on main branch)
 * - '.github/workflows/test.yml:feature/branch' (runs on feature/branch)
 */
export class GitHubExecutionAdapter implements ExecutionTriggerPort {
    private readonly baseUrl: string;

    constructor(private config: GitHubConfig) {
        if (!config.apiToken || !config.owner || !config.repo) {
            throw new Error("GitHubExecutionAdapter requires apiToken, owner, and repo");
        }
        
        // Default to public GitHub API, support GitHub Enterprise
        this.baseUrl = config.baseUrl || "https://api.github.com";
    }

    async trigger(testRun: TestRun): Promise<void> {
        // Validate execution target type
        if (testRun.executionTarget.type !== ExecutionTargetType.GITHUB) {
            throw new Error(
                `GitHubExecutionAdapter cannot handle execution target of type '${testRun.executionTarget.type}'. ` +
                `Expected '${ExecutionTargetType.GITHUB}'.`
            );
        }

        // Extract workflow file and branch from ExecutionTargetSnapshot.ref
        const ref = testRun.executionTarget.ref;
        if (!ref || ref.trim() === "") {
            throw new Error(
                `ExecutionTargetSnapshot.ref is required for GitHub Actions workflow dispatch. ` +
                `TestRun ID: ${testRun.id}`
            );
        }

        // Parse ref format: 'workflow.yml' or 'workflow.yml:branch'
        const [workflowFile, branch] = this.parseRef(ref);

        try {
            await this.triggerWorkflow(workflowFile, branch, testRun.id);
            console.log(
                `GitHubExecutionAdapter: Successfully triggered workflow '${workflowFile}' ` +
                `for TestRun ${testRun.id} on branch '${branch || 'default'}'.`
            );
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(
                `GitHubExecutionAdapter: Failed to trigger workflow for TestRun ${testRun.id}: ${errorMessage}`
            );
            throw new Error(
                `Failed to trigger GitHub Actions workflow: ${errorMessage}`
            );
        }
    }

    /**
     * Parses the ref string to extract workflow file and branch
     * @param ref Format: 'workflow.yml' or 'workflow.yml:branch'
     * @returns Tuple of [workflowFile, branch] where branch may be undefined
     */
    private parseRef(ref: string): [string, string | undefined] {
        const parts = ref.split(":");
        if (parts.length === 1) {
            return [parts[0], undefined];
        }
        if (parts.length === 2) {
            return [parts[0], parts[1]];
        }
        // Handle cases where branch name contains ':'
        const workflowFile = parts[0];
        const branch = parts.slice(1).join(":");
        return [workflowFile, branch];
    }

    /**
     * Triggers a GitHub Actions workflow
     * @param workflowFile Path to workflow file (e.g., 'ci.yml' or '.github/workflows/test.yml')
     * @param branch Branch name (optional, defaults to repository default branch)
     * @param testRunId TestRun ID for logging/tracking purposes
     */
    private async triggerWorkflow(
        workflowFile: string,
        branch: string | undefined,
        testRunId: string
    ): Promise<GitHubWorkflowDispatchResponse> {
        const url = `${this.baseUrl}/repos/${this.config.owner}/${this.config.repo}/actions/workflows/${encodeURIComponent(workflowFile)}/dispatches`;
        
        const body: Record<string, unknown> = {
            ref: branch || "main", // Default to 'main', GitHub will use default branch if this doesn't exist
            inputs: {
                test_run_id: testRunId,
            },
        };

        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${this.config.apiToken}`,
                "Accept": "application/vnd.github.v3+json",
                "X-GitHub-Api-Version": "2022-11-28",
            },
            body: JSON.stringify(body),
        });

        if (!response.ok) {
            const errorBody = await response.text();
            let errorMessage = `GitHub API returned ${response.status} ${response.statusText}`;
            
            try {
                const errorJson = JSON.parse(errorBody);
                if (errorJson.message) {
                    errorMessage = errorJson.message;
                } else if (Array.isArray(errorJson.errors)) {
                    errorMessage = errorJson.errors.map((e: { message?: string }) => e.message || String(e)).join(", ");
                }
            } catch {
                // If parsing fails, use the raw error body if available
                if (errorBody) {
                    errorMessage += `: ${errorBody}`;
                }
            }
            
            throw new Error(errorMessage);
        }

        // GitHub returns 204 No Content on success
        return {};
    }
}

