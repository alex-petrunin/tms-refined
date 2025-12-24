export type ExecutionModeID = string;

export enum ExecutionModeType {
    MANAGED = "MANAGED",
    OBSERVED = "OBSERVED",
}

export class ExecutionMode {
    constructor(
        public readonly id: ExecutionModeID,
        public type: ExecutionModeType,
    ){}
}