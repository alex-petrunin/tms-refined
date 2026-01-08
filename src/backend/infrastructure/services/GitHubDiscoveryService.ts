import { WorkflowDTO } from "../../application/dto/DiscoveryDTOs";
import { Integration } from "../../application/ports/IntegrationRepository";

/**
 * GitHub API response types
 */
interface GitHubWorkflowsResponse {
    total_count: number;
    workflows: GitHubWorkflow[];
}

interface GitHubWorkflow {
    id: number;
    name: string;
    path: string;
    state: string;
}

/**
 * Service for discovering workflows from GitHub Actions
 * 
 * Responsibilities:
 * - Fetch workflows from GitHub API
 * - Map GitHub API responses to application DTOs
 * - Cache results to avoid rate limiting
 */
export class GitHubDiscoveryService {
    private cache = new Map<string, { data: WorkflowDTO[]; timestamp: number }>();
    private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

    /**
     * Lists all workflows from a GitHub repository
     * Results are cached for 5 minutes
     */
    async listWorkflows(integration: Integration): Promise<WorkflowDTO[]> {
        const cacheKey = `${integration.id}:workflows`;
        
        // Check cache
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
            return cached.data;
        }

        // Fetch from GitHub API
        const workflows = await this.fetchWorkflows(integration);
        
        // Update cache
        this.cache.set(cacheKey, { data: workflows, timestamp: Date.now() });
        
        return workflows;
    }

    /**
     * Fetches workflows from GitHub API
     */
    private async fetchWorkflows(integration: Integration): Promise<WorkflowDTO[]> {
        const baseUrl = integration.config.baseUrl || 'https://api.github.com';
        const apiToken = integration.config.token;
        const owner = integration.config.owner;
        const repo = integration.config.repo;

        if (!apiToken || !owner || !repo) {
            throw new Error('GitHub integration is missing required configuration: token, owner, and repo');
        }

        try {
            const url = `${baseUrl}/repos/${owner}/${repo}/actions/workflows`;
            
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${apiToken}`,
                    'Accept': 'application/vnd.github.v3+json',
                    'X-GitHub-Api-Version': '2022-11-28',
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                const errorBody = await response.text();
                throw new Error(`GitHub API error (${response.status}): ${errorBody}`);
            }

            const data: GitHubWorkflowsResponse = await response.json();
            
            // Map to application DTOs
            return data.workflows.map(workflow => ({
                name: workflow.name,
                path: workflow.path
            }));
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to fetch GitHub workflows: ${message}`);
        }
    }

    /**
     * Clears the cache (useful for testing)
     */
    clearCache(): void {
        this.cache.clear();
    }
}

