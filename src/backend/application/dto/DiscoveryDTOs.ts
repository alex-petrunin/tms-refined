/**
 * Application-layer DTOs for CI/CD pipeline/workflow discovery
 * 
 * These DTOs insulate the API contract from provider-specific shapes,
 * protecting against changes in GitLab/GitHub API responses.
 */


/**
 * @zod-to-schema
 */
export interface RefDTO {
    /** Name of the branch or tag */
    name: string;
    /** Type of reference */
    type: 'branch' | 'tag';
}


/**
 * @zod-to-schema
 */
export interface ListRefsResponse {
    /** Array of references */
    refs: RefDTO[];
}


/**
 * @zod-to-schema
 */
export interface WorkflowDTO {
    /** Human-readable workflow name */
    name: string;
    /** Path to the workflow file */
    path: string;
}


/**
 * @zod-to-schema
 */
export interface ListWorkflowsResponse {
    /** Array of workflows */
    workflows: WorkflowDTO[];
}

