import { TestRun } from "../../domain/entities/TestRun";

export interface ExecutionTriggerPort {
    trigger(testRun: TestRun): Promise<void>;
}
