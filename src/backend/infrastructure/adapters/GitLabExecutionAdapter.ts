import { ExecutionTriggerPort } from "../../application/ports/ExecutionTriggerPort";
import { TestRun } from "../../domain/entities/TestRun";
import { ExecutionTargetType } from "../../domain/enums/ExecutionTargetType";
import { TestRunRepository } from "../../application/ports/TestRunRepository";

/**
 * Configuration for GitLab CI integration
 */
export interface GitLabConfig {
    /** GitLab API base URL (e.g., 'https://gitlab.com' or 'https://gitlab.example.com') */
    baseUrl: string;
    /** GitLab Pipeline Trigger Token (not API token!) */
    apiToken: string;
    /** Project ID (numeric like '75214400' or path with namespace like 'group/project') */
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
    constructor(
        private config: GitLabConfig,
        private testRunRepository?: TestRunRepository
    ) {
        if (!config.baseUrl || !config.apiToken || !config.projectId) {
            throw new Error("GitLabExecutionAdapter requires baseUrl, apiToken, and projectId");
        }
    }

    async trigger(testRun: TestRun): Promise<void> {
        console.log('=== GitLabExecutionAdapter START ===');
        console.log('[GitLabExecutionAdapter] TestRun executionTarget:', {
            integrationId: testRun.executionTarget.integrationId,
            type: testRun.executionTarget.type,
            name: testRun.executionTarget.name,
            config: testRun.executionTarget.config,
            configString: JSON.stringify(testRun.executionTarget.config)
        });
        
        // Validate execution target type
        if (testRun.executionTarget.type !== ExecutionTargetType.GITLAB) {
            throw new Error(
                `GitLabExecutionAdapter cannot handle execution target of type '${testRun.executionTarget.type}'. ` +
                `Expected '${ExecutionTargetType.GITLAB}'.`
            );
        }

        // Extract branch/ref from ExecutionTargetSnapshot config
        const gitlabConfig = testRun.executionTarget.asGitLabConfig();
        console.log('[GitLabExecutionAdapter] asGitLabConfig() result:', gitlabConfig);
        console.log('[GitLabExecutionAdapter] Config keys:', gitlabConfig ? Object.keys(gitlabConfig) : 'null');
        
        // Support both 'ref' and 'pipelineRef' field names for backwards compatibility
        const ref = (gitlabConfig as any)?.ref || (gitlabConfig as any)?.pipelineRef;
        console.log('[GitLabExecutionAdapter] Extracted ref:', ref);
        console.log('[GitLabExecutionAdapter] Has ref?', !!(gitlabConfig as any)?.ref);
        console.log('[GitLabExecutionAdapter] Has pipelineRef?', !!(gitlabConfig as any)?.pipelineRef);
        
        if (!ref || ref.trim() === "") {
            throw new Error(
                `GitLabExecutionConfig.ref or pipelineRef is required for GitLab pipeline trigger. ` +
                `TestRun ID: ${testRun.id}, Config: ${JSON.stringify(gitlabConfig)}, ` +
                `Raw config: ${JSON.stringify(testRun.executionTarget.config)}`
            );
        }

        console.log('Config:', {
            baseUrl: this.config.baseUrl,
            projectId: this.config.projectId,
            ref: ref,
            testRunId: testRun.id,
            rawConfig: gitlabConfig
        });

        try {
            const pipeline = await this.triggerPipeline(ref, testRun.id);
            console.log('=== GitLab Pipeline Created ===');
            console.log('Pipeline:', {
                id: pipeline.id,
                status: pipeline.status,
                webUrl: pipeline.web_url
            });

            // Store pipeline ID for webhook lookup
            if (this.testRunRepository) {
                await this.testRunRepository.associatePipelineId(testRun.id, String(pipeline.id));
            }
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
        // GitLab Trigger API: POST /projects/:id/trigger/pipeline
        // Uses pipeline trigger token, not API token!
        const url = `${this.config.baseUrl}/api/v4/projects/${encodeURIComponent(this.config.projectId)}/trigger/pipeline`;
        
        console.log('[GitLabExecutionAdapter] Making request to:', url);
        console.log('[GitLabExecutionAdapter] Ref:', ref, 'TestRunId:', testRunId);
        
        // YouTrack http module format: postSync(path, headers, body)
        const http = require('@jetbrains/youtrack-scripting-api/http');
        const connection = new http.Connection(this.config.baseUrl);
        
        // Set Content-Type header using addHeader (not in postSync params)
        connection.addHeader('Content-Type', 'application/x-www-form-urlencoded');
        
        // GitLab trigger API path
        const gitlabApiPath = `/api/v4/projects/${encodeURIComponent(this.config.projectId)}/trigger/pipeline`;
        
        // Build form data as curl -F does (multipart/form-data)
        const formData = [
            `token=${this.config.apiToken}`,  // Don't encode token
            `ref=${ref}`,
            `variables[TEST_RUN_ID]=${testRunId}`
        ].join('&');
        
        console.log('[GitLabExecutionAdapter] Path:', gitlabApiPath);
        console.log('[GitLabExecutionAdapter] Form data:', formData);
        
        const response = connection.postSync(gitlabApiPath, {}, formData);
        
        console.log('[GitLabExecutionAdapter] Response status:', response.code);
        
        if (response.code !== 200 && response.code !== 201) {
            let errorMessage = `GitLab API returned ${response.code}`;
            
            try {
                const errorJson = JSON.parse(response.response);
                if (errorJson.message) {
                    errorMessage = errorJson.message;
                } else if (errorJson.error) {
                    errorMessage = errorJson.error;
                } else {
                    errorMessage += `: ${response.response}`;
                }
            } catch {
                if (response.response) {
                    errorMessage += `: ${response.response}`;
                }
            }
            
            throw new Error(errorMessage);
        }

        return JSON.parse(response.response) as GitLabPipelineResponse;
    }
}

