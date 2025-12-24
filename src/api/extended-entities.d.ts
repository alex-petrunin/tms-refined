// Extension properties for YouTrack entities
// These are defined in entity-extensions.json

export interface ExtendedProperties {
  Issue: {
    // Test Case properties
    testCaseId?: string;
    testCaseSummary?: string;
    testCaseDescription?: string;
    executionTargetId?: string;
    executionTargetName?: string;
    executionTargetType?: string;
    executionTargetRef?: string;
    
    // Test Run properties
    testRunId?: string;
    testRunStatus?: string;
    testSuiteId?: string;
    testCaseIds?: string;
    idempotencyKey?: string;
  };
  
  Project: {
    testSuites?: string; // JSON string containing test suites data
  };
  
  AppGlobalStorage: {
    testRunIdempotencyIndex?: string; // JSON mapping of idempotency keys to test run IDs
  };
}
