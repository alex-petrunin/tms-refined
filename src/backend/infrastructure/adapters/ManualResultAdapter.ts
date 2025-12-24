import { HandleExecutionResultInput, HandleExecutionResultUseCase } from "../../application/usecases/HandleExecutionResult";


export class ManualResultAdapter {
  constructor(
    private handleResultUC: HandleExecutionResultUseCase
  ) {}

  async submit(input: HandleExecutionResultInput) {
    await this.handleResultUC.execute(input);
  }
}
