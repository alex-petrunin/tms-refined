import { RefDTO } from "../../application/dto/DiscoveryDTOs";
import { Integration } from "../../application/ports/IntegrationRepository";

/**
 * GitLab API response types
 */
interface GitLabBranch {
    name: string;
    commit?: {
        id: string;
        short_id: string;
    };
}

interface GitLabTag {
    name: string;
    commit?: {
        id: string;
        short_id: string;
    };
}

/**
 * Service for discovering pipelines and branches from GitLab
 * 
 * Responsibilities:
 * - Fetch branches and tags from GitLab API
 * - Map GitLab API responses to application DTOs
 * - Cache results to avoid rate limiting
 */
export class GitLabDiscoveryService {
    private cache = new Map<string, { data: RefDTO[]; timestamp: number }>();
    private readonly CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

    /**
     * Lists all branches and tags from a GitLab repository
     * Results are cached for 5 minutes
     */
    async listRefs(integration: Integration): Promise<RefDTO[]> {
        const cacheKey = `${integration.id}:refs`;
        
        // Check cache
        const cached = this.cache.get(cacheKey);
        if (cached && Date.now() - cached.timestamp < this.CACHE_TTL_MS) {
            return cached.data;
        }

        // Fetch from GitLab API
        const refs = await this.fetchRefs(integration);
        
        // Update cache
        this.cache.set(cacheKey, { data: refs, timestamp: Date.now() });
        
        return refs;
    }

    /**
     * Fetches branches and tags from GitLab API
     */
    private async fetchRefs(integration: Integration): Promise<RefDTO[]> {
        const baseUrl = integration.config.baseUrl || 'https://gitlab.com';
        const apiToken = integration.config.token;
        const projectId = integration.config.projectId;

        if (!apiToken || !projectId) {
            throw new Error('GitLab integration is missing required configuration: token and projectId');
        }

        try {
            // Fetch branches and tags in parallel
            const [branches, tags] = await Promise.all([
                this.fetchBranches(baseUrl, apiToken, projectId),
                this.fetchTags(baseUrl, apiToken, projectId)
            ]);

            return [...branches, ...tags];
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            throw new Error(`Failed to fetch GitLab refs: ${message}`);
        }
    }

    /**
     * Fetches branches from GitLab API
     */
    private async fetchBranches(
        baseUrl: string,
        apiToken: string,
        projectId: string
    ): Promise<RefDTO[]> {
        const url = `${baseUrl}/api/v4/projects/${encodeURIComponent(projectId)}/repository/branches`;
        
        const response = await fetch(url, {
            headers: {
                'PRIVATE-TOKEN': apiToken,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`GitLab API error (${response.status}): ${errorBody}`);
        }

        const branches: GitLabBranch[] = await response.json();
        
        return branches.map(branch => ({
            name: branch.name,
            type: 'branch' as const
        }));
    }

    /**
     * Fetches tags from GitLab API
     */
    private async fetchTags(
        baseUrl: string,
        apiToken: string,
        projectId: string
    ): Promise<RefDTO[]> {
        const url = `${baseUrl}/api/v4/projects/${encodeURIComponent(projectId)}/repository/tags`;
        
        const response = await fetch(url, {
            headers: {
                'PRIVATE-TOKEN': apiToken,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const errorBody = await response.text();
            throw new Error(`GitLab API error (${response.status}): ${errorBody}`);
        }

        const tags: GitLabTag[] = await response.json();
        
        return tags.map(tag => ({
            name: tag.name,
            type: 'tag' as const
        }));
    }

    /**
     * Clears the cache (useful for testing)
     */
    clearCache(): void {
        this.cache.clear();
    }
}

