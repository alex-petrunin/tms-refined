import type { ExtendedAppGlobalStorage, ExtendedIssue, ExtendedProject, AppGlobalStorageExtensionProperties } from './extended-entities.js';

/**
 * Issue context with extended entity (includes extension properties)
 */
export type ExtendedIssueCtx<T extends import('@jetbrains/youtrack-enhanced-dx-tools').IssueCtx> =
  Omit<T, 'issue'> & { issue: ExtendedIssue };

/**
 * Project context with extended entity (includes extension properties)
 */
export type ExtendedProjectCtx<T extends import('@jetbrains/youtrack-enhanced-dx-tools').ProjectCtx> =
  Omit<T, 'project'> & { project: ExtendedProject };

/**
 * Extended global context with app-specific global storage extension properties
 */
export type ExtendedGlobalCtx<T extends import('@jetbrains/youtrack-enhanced-dx-tools').GlobalCtx> =
  Omit<T, 'globalStorage'> & {
    globalStorage: {
      extensionProperties: AppGlobalStorageExtensionProperties;
    };
  };
