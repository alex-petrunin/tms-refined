import {ExecutionTargetType} from "../enums/ExecutionTargetType";

export type ExecutionTargetID = string;

export class ExecutionTargetSnapshot {
    constructor(
        public readonly id: ExecutionTargetID,
        public name: string,
        public type: ExecutionTargetType, // "GITLAB" | "GITHUB" | "MANUAL";
        public ref: string, // pipeline id / workflow id

    ){}

    /**
     * Generates a deterministic fingerprint for idempotency checks.
     * The fingerprint is based on the immutable identity properties of the execution target.
     */
    fingerprint(): string {
        // Use id, type, and ref as they represent the unique identity of the execution target
        return `${this.id}:${this.type}:${this.ref}`;
    }
}