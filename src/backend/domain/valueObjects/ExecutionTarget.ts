import {ExecutionTargetType} from "../enums/ExecutionTargetType";

/**
 * Provider-specific execution configuration
 */
export interface ProviderSpecificConfig {
    // Marker interface for type safety
}

/**
 * GitLab execution configuration
 */
export interface GitLabExecutionConfig extends ProviderSpecificConfig {
    /** Branch or tag name to run the pipeline on */
    ref?: string;
    /** Branch or tag name (alternative field name for backwards compatibility) */
    pipelineRef?: string;
}

/**
 * GitHub Actions execution configuration
 */
export interface GitHubExecutionConfig extends ProviderSpecificConfig {
    /** Workflow file path (e.g., 'ci.yml' or '.github/workflows/test.yml') */
    workflowFile: string;
    /** Optional branch name. If not specified, uses repository default branch */
    ref?: string;
}

/**
 * Manual execution configuration
 */
export interface ManualExecutionConfig extends ProviderSpecificConfig {
    // Empty for now - manual execution doesn't require specific config
}

/**
 * ExecutionTargetSnapshot - Value Object
 * 
 * Represents an immutable snapshot of execution target configuration.
 * This is a value object identified by its content (fingerprint), not an arbitrary ID.
 * Always embedded in TestCase, TestSuite, or TestRun entities.
 * 
 * Key properties:
 * - integrationId: References the Integration entity (project-level credentials)
 * - type: The provider type (GITLAB, GITHUB, MANUAL)
 * - config: Provider-specific execution configuration
 */
export class ExecutionTargetSnapshot {
    constructor(
        /** Integration ID - references the Integration entity for credentials */
        public readonly integrationId: string,
        /** Human-readable name for this execution target */
        public name: string,
        /** Provider type */
        public type: ExecutionTargetType,
        /** Provider-specific execution configuration */
        public config: ProviderSpecificConfig
    ){}

    /**
     * Generates a deterministic fingerprint for idempotency checks.
     * The fingerprint is based on the immutable identity properties of the execution target.
     * This serves as the content-based identity for the value object.
     */
    fingerprint(): string {
        // Serialize config to JSON for fingerprinting
        const configStr = JSON.stringify(this.config);
        return `${this.integrationId}:${this.type}:${configStr}`;
    }

    /**
     * Helper to get GitLab-specific config
     */
    asGitLabConfig(): GitLabExecutionConfig | null {
        if (this.type !== ExecutionTargetType.GITLAB) return null;
        return this.config as GitLabExecutionConfig;
    }

    /**
     * Helper to get GitHub-specific config
     */
    asGitHubConfig(): GitHubExecutionConfig | null {
        if (this.type !== ExecutionTargetType.GITHUB) return null;
        return this.config as GitHubExecutionConfig;
    }

    /**
     * Helper to get Manual-specific config
     */
    asManualConfig(): ManualExecutionConfig | null {
        if (this.type !== ExecutionTargetType.MANUAL) return null;
        return (this.config as ManualExecutionConfig) || {};
    }
}
