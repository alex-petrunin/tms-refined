import { HandleExecutionResultInput } from "../usecases/HandleExecutionResult";


export interface ExecutionResultPort {
    handleExecutionResult(result: HandleExecutionResultInput): Promise<void>;
}