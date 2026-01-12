import type { Issue, Project } from '@jetbrains/youtrack-enhanced-dx-tools/youtrack-types';

/**
 * Extended Issue with app-specific extension properties
 */
export interface ExtendedIssue extends Issue {
  extensionProperties: {
  readonly testCaseId?: string;
  readonly suiteId?: string;
  readonly testCaseSummary?: string;
  readonly testCaseDescription?: string;
  readonly executionTargetId?: string;
  readonly executionTargetName?: string;
  readonly executionTargetType?: string;
  readonly executionTargetRef?: string;
  readonly executionTargetConfig?: string;
  readonly executionTargetIntegrationId?: string;
  readonly testRunId?: string;
  readonly testRunStatus?: string;
  readonly testSuiteId?: string;
  readonly testCaseIds?: string;
  readonly testCaseIDs?: string;
  readonly idempotencyKey?: string;
};
}

/**
 * Extended Project with app-specific extension properties
 */
export interface ExtendedProject extends Project {
  extensionProperties: {
  readonly testSuites?: string;
  readonly integrations?: string;
};
}

/**
 * Global storage extension properties for the app
 */
export interface AppGlobalStorageExtensionProperties {
  readonly testRunIdempotencyIndex?: string;
}

/**
 * Map of entity types to their extended versions
 * Extended types have extension properties, others are 'never'
 */
export type ExtendedProperties = {
  Issue: ExtendedIssue;
  Project: ExtendedProject;
  Article: never;
  User: never;
  AppGlobalStorage: AppGlobalStorageExtensionProperties;
};