/**
 * Error thrown when a referenced integration cannot be found
 */
export class IntegrationNotFoundError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'IntegrationNotFoundError';
        Object.setPrototypeOf(this, IntegrationNotFoundError.prototype);
    }
}

/**
 * Error thrown when a referenced integration is disabled
 */
export class IntegrationDisabledError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'IntegrationDisabledError';
        Object.setPrototypeOf(this, IntegrationDisabledError.prototype);
    }
}

/**
 * Error thrown when no execution target can be resolved for a test case
 */
export class NoExecutionTargetError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'NoExecutionTargetError';
        Object.setPrototypeOf(this, NoExecutionTargetError.prototype);
    }
}

