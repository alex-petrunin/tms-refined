import { ExecutionTriggerPort } from "../../application/ports/ExecutionTriggerPort";
import { ExecutionTargetType } from "../../domain/enums/ExecutionTargetType";
import { ExecutionTargetSnapshot } from "../../domain/valueObjects/ExecutionTarget";
import { GitLabExecutionAdapter, GitLabConfig } from "./GitLabExecutionAdapter";
import { GitHubExecutionAdapter, GitHubConfig } from "./GitHubExecutionAdapter";
import { ManualExecutionAdapter } from "./ManualExecutionAdapter";

/**
 * Configuration for creating CI adapters
 */
export interface CIAdapterConfig {
    gitlab?: GitLabConfig;
    github?: GitHubConfig;
}

/**
 * Factory for creating ExecutionTriggerPort adapters based on ExecutionTargetType
 */
export class CIAdapterFactory {
    constructor(private config: CIAdapterConfig) {}

    /**
     * Creates an ExecutionTriggerPort adapter based on the execution target type
     * @param executionTarget The execution target snapshot
     * @returns The appropriate adapter instance
     * @throws Error if the execution target type is not supported or configuration is missing
     */
    createAdapter(executionTarget: ExecutionTargetSnapshot): ExecutionTriggerPort {
        switch (executionTarget.type) {
            case ExecutionTargetType.GITLAB:
                if (!this.config.gitlab) {
                    throw new Error(
                        `GitLab configuration is required for execution target '${executionTarget.id}' ` +
                        `but was not provided to CIAdapterFactory.`
                    );
                }
                return new GitLabExecutionAdapter(this.config.gitlab);

            case ExecutionTargetType.GITHUB:
                if (!this.config.github) {
                    throw new Error(
                        `GitHub configuration is required for execution target '${executionTarget.id}' ` +
                        `but was not provided to CIAdapterFactory.`
                    );
                }
                return new GitHubExecutionAdapter(this.config.github);

            case ExecutionTargetType.MANUAL:
                return new ManualExecutionAdapter();

            default:
                throw new Error(
                    `Unsupported execution target type: ${executionTarget.type}. ` +
                    `Supported types: ${Object.values(ExecutionTargetType).join(", ")}`
                );
        }
    }

    /**
     * Checks if an adapter can be created for the given execution target type
     * @param type The execution target type
     * @returns True if configuration exists and adapter can be created
     */
    canCreateAdapter(type: ExecutionTargetType): boolean {
        switch (type) {
            case ExecutionTargetType.GITLAB:
                return !!this.config.gitlab;
            case ExecutionTargetType.GITHUB:
                return !!this.config.github;
            case ExecutionTargetType.MANUAL:
                return true; // Manual adapter doesn't require configuration
            default:
                return false;
        }
    }
}

