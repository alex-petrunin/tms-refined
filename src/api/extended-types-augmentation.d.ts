/**
 * Type augmentation for global context types
 * This file automatically augments the global CtxGet, CtxPost, CtxPut, CtxDelete types
 * to use extended entities when extension properties are defined in entity-extensions.json
 *
 * Simply import this file in your backend types or ensure it's included in your tsconfig
 * and the extended entities will be automatically used in all context types.
 *
 * @example
 * // In your handler file, just use CtxGetProject as normal:
 * export default function handle(ctx: CtxGetProject<Response, Query>): void {
 *   // ctx.project.extensionProperties.myProperty is now fully typed! 🎉
 *   const value = ctx.project.extensionProperties.myProperty;
 * }
 *
 * @see https://www.jetbrains.com/help/youtrack/devportal/apps-extension-properties.html
 */

import type { ExtendedIssue, ExtendedProject, AppGlobalStorageExtensionProperties } from './extended-entities.js';

// Import the augmentation to ensure it's loaded
import './extended-entities.js';

declare global {
  /**
   * Augment global context types to use extended entities
   * This makes CtxGet, CtxPost, CtxPut, CtxDelete automatically use ExtendedIssue, ExtendedProject, etc.
   */
  namespace GlobalContextTypes {
    interface ExtendedEntities {
        /** Available when scope is 'issue' - automatically uses ExtendedIssue if available */
  issue?: ExtendedIssue;
        /** Available when scope is 'project' - automatically uses ExtendedProject if available */
  project?: ExtendedProject;
        /** Global storage extension properties - automatically uses AppGlobalStorageExtensionProperties if available */
  globalStorage?: {
    extensionProperties: AppGlobalStorageExtensionProperties;
  };
    }
  }
}

// Re-export extended entities for convenience
export type { ExtendedIssue, ExtendedProject, AppGlobalStorageExtensionProperties } from './extended-entities.js';
