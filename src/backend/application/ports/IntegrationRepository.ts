import { ExecutionTargetType } from "../../domain/enums/ExecutionTargetType";

/**
 * Integration entity - represents a CI/CD integration configuration
 * Stored at project level in YouTrack extension properties
 */
export interface Integration {
    /** Unique identifier for the integration */
    id: string;
    /** Human-readable name */
    name: string;
    /** Provider type (GITLAB, GITHUB, MANUAL) */
    type: ExecutionTargetType;
    /** Whether this integration is enabled */
    enabled: boolean;
    /** Whether this is the default integration for its type */
    isDefault: boolean;
    /** Provider-specific configuration */
    config: IntegrationConfig;
}

/**
 * Integration configuration - provider-specific credentials and settings
 */
export interface IntegrationConfig {
    /** GitLab/GitHub base URL */
    baseUrl?: string;
    /** API token */
    token?: string;
    /** GitLab project ID */
    projectId?: string;
    /** GitHub owner (username or organization) */
    owner?: string;
    /** GitHub repository name */
    repo?: string;
    /** Webhook secret for validating incoming webhooks */
    webhookSecret?: string;
}

/**
 * Repository port for managing CI/CD integrations
 */
export interface IntegrationRepository {
    /**
     * Find an integration by its ID
     * @param integrationId The integration ID
     * @param projectId The YouTrack project ID
     * @returns The integration if found, null otherwise
     */
    findById(integrationId: string, projectId: string): Promise<Integration | null>;

    /**
     * Find all integrations of a specific type
     * @param type The provider type
     * @param projectId The YouTrack project ID
     * @returns Array of integrations matching the type
     */
    findByType(type: ExecutionTargetType, projectId: string): Promise<Integration[]>;

    /**
     * Find the default integration for a specific type
     * @param type The provider type
     * @param projectId The YouTrack project ID
     * @returns The default integration if found, null otherwise
     */
    findDefaultByType(type: ExecutionTargetType, projectId: string): Promise<Integration | null>;
}

