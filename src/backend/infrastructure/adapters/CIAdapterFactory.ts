import { ExecutionTriggerPort } from "../../application/ports/ExecutionTriggerPort";
import { ExecutionTargetType } from "../../domain/enums/ExecutionTargetType";
import { ExecutionTargetSnapshot } from "../../domain/valueObjects/ExecutionTarget";
import { GitLabExecutionAdapter, GitLabConfig } from "./GitLabExecutionAdapter";
import { GitHubExecutionAdapter, GitHubConfig } from "./GitHubExecutionAdapter";
import { ManualExecutionAdapter } from "./ManualExecutionAdapter";
import { TestRunRepository } from "../../application/ports/TestRunRepository";
import { IntegrationRepository } from "../../application/ports/IntegrationRepository";
import { IntegrationNotFoundError } from "../../application/errors/IntegrationErrors";

/**
 * Configuration for creating CI adapters (legacy)
 * @deprecated Use IntegrationRepository-based factory instead
 */
export interface CIAdapterConfig {
    gitlab?: GitLabConfig;
    github?: GitHubConfig;
}

/**
 * Factory for creating ExecutionTriggerPort adapters based on ExecutionTargetType
 * 
 * New design: Dynamically loads integration configuration from IntegrationRepository
 * instead of requiring pre-configured credentials.
 */
export class CIAdapterFactory {
    constructor(
        private integrationRepository: IntegrationRepository,
        private projectId: string,
        private testRunRepository?: TestRunRepository
    ) {}

    /**
     * Legacy constructor for backward compatibility
     * @deprecated Use new constructor with IntegrationRepository
     */
    static createLegacy(
        config: CIAdapterConfig,
        testRunRepository?: TestRunRepository
    ): CIAdapterFactory {
        // Create a mock integration repository for legacy config
        const mockRepo: IntegrationRepository = {
            async findById() { return null; },
            async findByType() { return []; },
            async findDefaultByType() { return null; }
        };
        return new CIAdapterFactory(mockRepo, '', testRunRepository);
    }

    /**
     * Creates an ExecutionTriggerPort adapter based on the execution target
     * Dynamically loads integration configuration from repository
     * 
     * @param executionTarget The execution target snapshot
     * @returns The appropriate adapter instance
     * @throws IntegrationNotFoundError if the integration doesn't exist
     * @throws Error if the execution target type is not supported
     */
    async createAdapter(executionTarget: ExecutionTargetSnapshot): Promise<ExecutionTriggerPort> {
        console.log('=== CIAdapterFactory START ===');
        console.log('Loading integration:', executionTarget.integrationId, 'for project:', this.projectId);
        
        // Load integration configuration
        const integration = await this.integrationRepository.findById(
            executionTarget.integrationId,
            this.projectId
        );

        if (!integration) {
            console.error('Integration NOT FOUND:', executionTarget.integrationId);
            throw new IntegrationNotFoundError(
                `Integration '${executionTarget.integrationId}' not found. ` +
                `Cannot create execution adapter.`
            );
        }

        if (!integration.enabled) {
            console.error('Integration DISABLED:', integration.name);
            throw new Error(
                `Integration '${integration.name}' is disabled. ` +
                `Cannot create execution adapter.`
            );
        }

        console.log('Integration loaded:', {
            name: integration.name,
            type: integration.type,
            enabled: integration.enabled,
            configKeys: Object.keys(integration.config)
        });

        // Create adapter based on integration type
        switch (integration.type) {
            case ExecutionTargetType.GITLAB:
                return this.createGitLabAdapter(integration.config);

            case ExecutionTargetType.GITHUB:
                return this.createGitHubAdapter(integration.config);

            case ExecutionTargetType.MANUAL:
                return new ManualExecutionAdapter();

            default:
                throw new Error(
                    `Unsupported execution target type: ${integration.type}. ` +
                    `Supported types: ${Object.values(ExecutionTargetType).join(", ")}`
                );
        }
    }

    /**
     * Creates a GitLab adapter from integration config
     */
    private createGitLabAdapter(integrationConfig: any): GitLabExecutionAdapter {
        // Try both field names for token (apiToken or token)
        const apiToken = integrationConfig.apiToken || integrationConfig.token || '';
        
        // Parse projectUrl if it exists (UI sends this)
        let baseUrl = integrationConfig.baseUrl || 'https://gitlab.com';
        let projectId = integrationConfig.projectId || '';
        
        if (integrationConfig.projectUrl) {
            const urlString = integrationConfig.projectUrl;
            
            // Check if projectUrl is a full URL or just a project ID
            if (urlString.startsWith('http://') || urlString.startsWith('https://')) {
                // Full URL: https://gitlab.com/tms-app1/integration-1
                // -> baseUrl: https://gitlab.com
                // -> projectId: tms-app1/integration-1
                try {
                    const protocolEnd = urlString.indexOf('://');
                    if (protocolEnd > -1) {
                        const afterProtocol = urlString.substring(protocolEnd + 3);
                        const firstSlash = afterProtocol.indexOf('/');
                        
                        if (firstSlash > -1) {
                            baseUrl = urlString.substring(0, protocolEnd + 3 + firstSlash);
                            projectId = afterProtocol.substring(firstSlash + 1);
                        } else {
                            // No path, just domain
                            baseUrl = urlString;
                        }
                    }
                    
                    console.log('[CIAdapterFactory] Parsed full projectUrl:', {
                        original: integrationConfig.projectUrl,
                        baseUrl: baseUrl,
                        projectId: projectId
                    });
                } catch (e) {
                    console.error('[CIAdapterFactory] Failed to parse projectUrl:', e);
                }
            } else {
                // Just a project ID (numeric or path): "75214400" or "group/project"
                projectId = urlString;
                console.log('[CIAdapterFactory] Using projectUrl as projectId:', projectId);
            }
        }
        
        const gitlabConfig: GitLabConfig = {
            baseUrl: baseUrl,
            apiToken: apiToken,
            projectId: projectId
        };

        console.log('[CIAdapterFactory] GitLab config details:', {
            baseUrl: gitlabConfig.baseUrl,
            hasToken: !!gitlabConfig.apiToken,
            tokenLength: gitlabConfig.apiToken?.length || 0,
            projectId: gitlabConfig.projectId
        });

        if (!gitlabConfig.apiToken || !gitlabConfig.projectId) {
            throw new Error(
                `GitLab integration is missing required configuration. ` +
                `Has token: ${!!apiToken}, Has projectId: ${!!projectId}, projectUrl: ${integrationConfig.projectUrl || 'none'}`
            );
        }

        return new GitLabExecutionAdapter(gitlabConfig, this.testRunRepository);
    }

    /**
     * Creates a GitHub adapter from integration config
     */
    private createGitHubAdapter(integrationConfig: any): GitHubExecutionAdapter {
        const githubConfig: GitHubConfig = {
            baseUrl: integrationConfig.baseUrl,
            apiToken: integrationConfig.token || '',
            owner: integrationConfig.owner || '',
            repo: integrationConfig.repo || ''
        };

        if (!githubConfig.apiToken || !githubConfig.owner || !githubConfig.repo) {
            throw new Error(
                'GitHub integration is missing required configuration: apiToken, owner, and repo are required'
            );
        }

        return new GitHubExecutionAdapter(githubConfig);
    }

    /**
     * Checks if an adapter can be created for the given execution target type
     * @param type The execution target type
     * @returns True if the type is supported
     */
    canCreateAdapter(type: ExecutionTargetType): boolean {
        return Object.values(ExecutionTargetType).includes(type);
    }
}
