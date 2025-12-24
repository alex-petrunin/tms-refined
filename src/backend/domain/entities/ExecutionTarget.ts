export type ExecutionTargetID = string;

export class ExecutionTargetSnapshot {
    constructor(
        public readonly id: ExecutionTargetID,
        public name: string,
        public type: string,
        public pipelineID?: string,
        // public config: Record<string, any>,
    ){}
}