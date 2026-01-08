import {
    Integration,
    IntegrationConfig,
    IntegrationRepository
} from "../../application/ports/IntegrationRepository";
import { ExecutionTargetType } from "../../domain/enums/ExecutionTargetType";

/**
 * YouTrack adapter for IntegrationRepository
 * Reads integrations from YouTrack project extension properties
 */
export class YouTrackIntegrationRepository implements IntegrationRepository {
    /**
     * Finds an integration by ID
     */
    async findById(integrationId: string, projectId: string): Promise<Integration | null> {
        const integrations = await this.loadIntegrations(projectId);
        return integrations.find(i => i.id === integrationId) || null;
    }

    /**
     * Finds all integrations of a specific type
     */
    async findByType(type: ExecutionTargetType, projectId: string): Promise<Integration[]> {
        const integrations = await this.loadIntegrations(projectId);
        return integrations.filter(i => i.type === type);
    }

    /**
     * Finds the default integration for a specific type
     * Returns the integration marked with isDefault: true and enabled: true
     * If no explicit default exists, returns null (fail-fast, no implicit selection)
     */
    async findDefaultByType(type: ExecutionTargetType, projectId: string): Promise<Integration | null> {
        const integrations = await this.loadIntegrations(projectId);
        const defaultIntegration = integrations.find(
            i => i.type === type && i.enabled && i.isDefault
        );
        return defaultIntegration || null;
    }

    /**
     * Loads all integrations from YouTrack extension properties
     */
    private async loadIntegrations(projectId: string): Promise<Integration[]> {
        try {
            const entities = require('@jetbrains/youtrack-scripting-api/entities');
            const ytProject = entities.Project.findByKey(projectId);
            
            if (!ytProject) {
                console.warn(`[YouTrackIntegrationRepository] Project not found: ${projectId}`);
                return [];
            }

            const integrationsJson = ytProject.extensionProperties.integrations;
            if (!integrationsJson || typeof integrationsJson !== 'string') {
                return [];
            }

            const rawIntegrations = JSON.parse(integrationsJson);
            if (!Array.isArray(rawIntegrations)) {
                console.warn('[YouTrackIntegrationRepository] Invalid integrations format (not an array)');
                return [];
            }

            // Map to Integration interface with backward compatibility
            return rawIntegrations.map(raw => this.mapToIntegration(raw));
        } catch (error) {
            console.error('[YouTrackIntegrationRepository] Failed to load integrations:', error);
            return [];
        }
    }

    /**
     * Maps raw integration data to Integration interface
     * Handles backward compatibility for missing fields
     */
    private mapToIntegration(raw: any): Integration {
        return {
            id: raw.id,
            name: raw.name,
            type: raw.type as ExecutionTargetType,
            enabled: raw.enabled !== undefined ? raw.enabled : true,
            isDefault: raw.isDefault !== undefined ? raw.isDefault : false,
            config: this.mapToIntegrationConfig(raw.config || {})
        };
    }

    /**
     * Maps raw config to IntegrationConfig interface
     * Handles various config field names for backward compatibility
     */
    private mapToIntegrationConfig(rawConfig: any): IntegrationConfig {
        return {
            baseUrl: rawConfig.baseUrl || rawConfig.projectUrl,
            token: rawConfig.token,
            projectId: rawConfig.projectId || rawConfig.pipelineRef,
            owner: rawConfig.owner,
            repo: rawConfig.repo,
            webhookSecret: rawConfig.webhookSecret
        };
    }
}

