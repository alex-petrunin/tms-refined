/**
 * @zod-to-schema
 */
export type SettingsReq = {
    projectId: string;
};

/**
 * @zod-to-schema
 */
export type SettingsRes = {
    bugReportsProject: string | null;
    testRunsProject: string | null;
    testSuitFieldName: string | null;
    bugIssueCommand: string | null;
    customLinkType: string | null;
    isTestCaseProject: boolean;
};

import { ProjectController } from "@backend/controllers/project.controller";
import { internalError, successResponse } from "@backend/utils/response-helpers";

export default function handle(ctx: CtxGet<SettingsRes, SettingsReq>): void {
    try {
        const result = ProjectController.getSettings(ctx.settings);
        successResponse(ctx, result);
    } catch (error) {
        console.error(`[ProjectSettingsRouter] Failed to get project settings for project ${ctx.project?.id}:`, error);
        internalError(ctx, error);
    }
}

export type Handle = typeof handle;

