// Requirements define YouTrack fields and values that your app needs
import * as entities from '@jetbrains/youtrack-scripting-api/entities';

export const requirements = {
  // Distinguish issue types (TestCase vs TestRun)
  TMSKind: {
    type: entities.EnumField.fieldType,
    name: 'TMS Kind',
    TestCase: { name: 'Test Case' },
    TestRun: { name: 'Test Run' }
  },
  
  // Test run status
  TestRunStatus: {
    type: entities.EnumField.fieldType,
    name: 'Test Run Status',
    Pending: { name: 'Pending' },
    Running: { name: 'Running' },
    Passed: { name: 'Passed' },
    Failed: { name: 'Failed' },
    AwaitingExternalResults: { name: 'Awaiting External Results' }
  },
  
  // Link to test suite
  TestSuite: {
    type: entities.EnumField.fieldType,
    name: 'Test Suite',
    // Values will be populated dynamically from project.testSuites
  },
  
  // Execution target type
  ExecutionTargetType: {
    type: entities.EnumField.fieldType,
    name: 'Execution Target Type',
    GitLab: { name: 'GitLab' },
    GitHub: { name: 'GitHub' },
    Manual: { name: 'Manual' }
  },
  
  // Execution target reference (pipeline/workflow ID)
  ExecutionTargetRef: {
    type: entities.Field.stringType,
    name: 'Execution Target Reference'
  }
};
