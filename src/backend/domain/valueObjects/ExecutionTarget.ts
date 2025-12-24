import {ExecutionTargetType} from "@backend/domain/enums/ExecutionTargetType.ts";

export type ExecutionTargetID = string;

export class ExecutionTargetSnapshot {
    constructor(
        public readonly id: ExecutionTargetID,
        public name: string,
        public type: ExecutionTargetType, // "GITLAB" | "GITHUB" | "MANUAL";
        public ref: string, // pipeline id / workflow id

    ){}
}