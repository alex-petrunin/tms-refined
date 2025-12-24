import { HandleExecutionResultUseCase } from "../../application/usecases/HandleExecutionResult";

export class WebhookResultAdapter {
  constructor(
    private handleResultUC: HandleExecutionResultUseCase
  ) {}

  async onWebhook(payload: any) {
    const testRunID = payload.testRunId;
    const passed = payload.status === "success";

    await this.handleResultUC.execute({
      testRunID,
      passed
    });
  }
}
