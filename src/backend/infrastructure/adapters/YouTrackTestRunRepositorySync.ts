import { TestRunRepositorySync } from "../../application/ports/TestRunRepositorySync";
import { TestRun, TestRunID, TestStatus } from "../../domain/entities/TestRun";
import { ExecutionTargetSnapshot } from "../../domain/valueObjects/ExecutionTarget";
import { ExecutionTargetType } from "../../domain/enums/ExecutionTargetType";

/**
 * Synchronous YouTrack implementation of TestRunRepository.
 * Uses YouTrack scripting API for HTTP handlers.
 * 
 * Note: This is a synchronous adapter designed for YouTrack HTTP handlers
 * where the scripting API operates synchronously.
 */
export class YouTrackTestRunRepositorySync implements TestRunRepositorySync {
    private lastCreatedIssue: any = null;
    
    constructor(
        private projectKey: string,
        private currentUser?: any
    ) {}

    save(testRun: TestRun): any {
        const entities = require('@jetbrains/youtrack-scripting-api/entities');
        const project = entities.Project.findByKey(this.projectKey);
        
        if (!project) {
            throw new Error(`Project not found: ${this.projectKey}`);
        }

        // Find existing issue or create new
        // Try to find by issue ID first (e.g., "TEST-123"), then by extension property (legacy)
        let existingIssue = null;
        try {
            existingIssue = entities.Issue.findById(testRun.id);
        } catch (e) {
            // If not found by issue ID, try searching by extension property
            existingIssue = this.findIssueByTestRunId(testRun.id);
        }
        
        if (existingIssue) {
            this.updateIssue(existingIssue, testRun);
            this.lastCreatedIssue = existingIssue;
            return existingIssue;
        } else {
            const newIssue = this.createIssue(project, testRun);
            this.lastCreatedIssue = newIssue;
            return newIssue;
        }
    }
    
    getLastCreatedIssue(): any {
        return this.lastCreatedIssue;
    }

    findById(id: TestRunID): TestRun | null {
        const entities = require('@jetbrains/youtrack-scripting-api/entities');
        
        // Try to find by issue ID first (e.g., "TEST-123")
        let issue = null;
        try {
            issue = entities.Issue.findById(id);
        } catch (e) {
            // If not found by issue ID, try searching by extension property (legacy)
            issue = this.findIssueByTestRunId(id);
        }
        
        if (!issue) {
            return null;
        }
        return this.mapIssueToTestRun(issue);
    }

    findAll(): TestRun[] {
        const entities = require('@jetbrains/youtrack-scripting-api/entities');
        const search = require('@jetbrains/youtrack-scripting-api/search');
        const project = entities.Project.findByKey(this.projectKey);
        
        if (!project) {
            return [];
        }

        // Search for all issues in the project
        const allIssues = search.search(project, '') || [];
        
        // Convert to array
        const issuesArray: any[] = [];
        if (allIssues && typeof allIssues.forEach === 'function') {
            allIssues.forEach((issue: any) => {
                issuesArray.push(issue);
            });
        } else if (Array.isArray(allIssues)) {
            issuesArray.push(...allIssues);
        }

        // Filter to only test runs and map to domain entities
        const testRuns: TestRun[] = [];
        for (const issue of issuesArray) {
            const extProps = issue.extensionProperties || {};
            if (extProps.testRunId) {
                testRuns.push(this.mapIssueToTestRun(issue));
            }
        }

        return testRuns;
    }

    private findIssueByTestRunId(testRunId: string): any {
        const entities = require('@jetbrains/youtrack-scripting-api/entities');
        
        try {
            const issues = entities.Issue.findByExtensionProperties({
                testRunId: testRunId
            });
            
            if (issues && issues.size > 0) {
                return Array.from(issues)[0];
            }
        } catch (e) {
            // Fallback: search manually
            const search = require('@jetbrains/youtrack-scripting-api/search');
            const project = entities.Project.findByKey(this.projectKey);
            if (project) {
                const allIssues = search.search(project, '') || [];
                const issuesArray: any[] = [];
                if (allIssues && typeof allIssues.forEach === 'function') {
                    allIssues.forEach((issue: any) => issuesArray.push(issue));
                }
                
                for (const issue of issuesArray) {
                    const extProps = issue.extensionProperties || {};
                    if (extProps.testRunId === testRunId) {
                        return issue;
                    }
                }
            }
        }
        
        return null;
    }

    private createIssue(project: any, testRun: TestRun): any {
        const entities = require('@jetbrains/youtrack-scripting-api/entities');
        
        // Use current user from constructor, or fallback to finding admin/root
        let reporter = this.currentUser;
        if (!reporter) {
            try {
                reporter = entities.User.findByLogin('admin');
            } catch (e) {
                try {
                    reporter = entities.User.findByLogin('root');
                } catch (e2) {
                    // Last resort - try to get first available user
                    const users = entities.User.search('');
                    if (users && users.size > 0) {
                        reporter = Array.from(users)[0];
                    }
                }
            }
        }
        
        if (!reporter) {
            throw new Error('No user available to create issue. Please ensure at least one user exists in YouTrack.');
        }
        
        const summary = `Test Run: ${testRun.testCaseIDs.length} test case(s) from ${testRun.testSuiteID}`;
        const issue = new entities.Issue(reporter, project, summary);
        
        issue.description = this.buildTestRunDescription(testRun);
        
        // Set extension properties
        // Use the actual YouTrack issue ID as the test run ID for direct lookup
        const actualId = issue.idReadable || issue.id;
        issue.extensionProperties.testRunId = actualId;
        issue.extensionProperties.testRunStatus = testRun.status;
        issue.extensionProperties.testSuiteId = testRun.testSuiteID;
        issue.extensionProperties.testCaseIds = testRun.testCaseIDs.join(',');
        issue.extensionProperties.executionTargetId = testRun.executionTarget.id;
        issue.extensionProperties.executionTargetName = testRun.executionTarget.name;
        issue.extensionProperties.executionTargetType = testRun.executionTarget.type;
        issue.extensionProperties.executionTargetRef = testRun.executionTarget.ref;
        
        // Set custom fields
        this.setCustomFields(issue, testRun);
        
        return issue;
    }

    private updateIssue(issue: any, testRun: TestRun): void {
        const summary = `Test Run: ${testRun.testCaseIDs.length} test case(s) from ${testRun.testSuiteID}`;
        issue.summary = summary;
        issue.description = this.buildTestRunDescription(testRun);
        
        // Update extension properties
        issue.extensionProperties.testRunStatus = testRun.status;
        issue.extensionProperties.testSuiteId = testRun.testSuiteID;
        issue.extensionProperties.testCaseIds = testRun.testCaseIDs.join(',');
        issue.extensionProperties.executionTargetId = testRun.executionTarget.id;
        issue.extensionProperties.executionTargetName = testRun.executionTarget.name;
        issue.extensionProperties.executionTargetType = testRun.executionTarget.type;
        issue.extensionProperties.executionTargetRef = testRun.executionTarget.ref;
        
        this.setCustomFields(issue, testRun);
    }

    private setCustomFields(issue: any, testRun: TestRun): void {
        try {
            // Set TMS Kind
            const kindField = issue.project.findFieldByName('TMS Kind');
            if (kindField) {
                let testRunValue = kindField.findValueByName('Test Run');
                if (!testRunValue) {
                    testRunValue = kindField.createValue('Test Run');
                }
                if (testRunValue) {
                    issue.fields['TMS Kind'] = testRunValue;
                }
            }

            // Set Test Run Status
            const statusField = issue.project.findFieldByName('Test Run Status');
            if (statusField) {
                const statusName = this.mapTestStatusToFieldValue(testRun.status);
                let statusValue = statusField.findValueByName(statusName);
                if (!statusValue) {
                    statusValue = statusField.createValue(statusName);
                }
                if (statusValue) {
                    issue.fields['Test Run Status'] = statusValue;
                }
            }

            // Set Execution Target Type
            const targetTypeField = issue.project.findFieldByName('Execution Target Type');
            if (targetTypeField) {
                const typeName = this.mapExecutionTargetTypeToFieldValue(testRun.executionTarget.type);
                let typeValue = targetTypeField.findValueByName(typeName);
                if (!typeValue) {
                    typeValue = targetTypeField.createValue(typeName);
                }
                if (typeValue) {
                    issue.fields['Execution Target Type'] = typeValue;
                }
            }

            // Set Execution Target Reference
            const targetRefField = issue.project.findFieldByName('Execution Target Reference');
            if (targetRefField) {
                issue.fields['Execution Target Reference'] = testRun.executionTarget.ref;
            }

            // Set Test Suite if available
            if (testRun.testSuiteID) {
                const testSuiteField = issue.project.findFieldByName('Test Suite');
                if (testSuiteField) {
                    let suiteValue = testSuiteField.findValueByName(testRun.testSuiteID);
                    if (!suiteValue) {
                        suiteValue = testSuiteField.createValue(testRun.testSuiteID);
                    }
                    if (suiteValue) {
                        issue.fields['Test Suite'] = suiteValue;
                    }
                }
            }
        } catch (error) {
            console.warn('Failed to set custom fields:', error);
        }
    }

    private mapTestStatusToFieldValue(status: TestStatus): string {
        switch (status) {
            case TestStatus.PENDING:
                return 'Pending';
            case TestStatus.RUNNING:
                return 'Running';
            case TestStatus.PASSED:
                return 'Passed';
            case TestStatus.FAILED:
                return 'Failed';
            case TestStatus.AWAITING_EXTERNAL_RESULTS:
                return 'Awaiting External Results';
            default:
                return 'Pending';
        }
    }

    private mapFieldValueToTestStatus(fieldValue: string): TestStatus {
        switch (fieldValue) {
            case 'Pending':
                return TestStatus.PENDING;
            case 'Running':
                return TestStatus.RUNNING;
            case 'Passed':
                return TestStatus.PASSED;
            case 'Failed':
                return TestStatus.FAILED;
            case 'Awaiting External Results':
                return TestStatus.AWAITING_EXTERNAL_RESULTS;
            default:
                return TestStatus.PENDING;
        }
    }

    private mapExecutionTargetTypeToFieldValue(type: ExecutionTargetType): string {
        switch (type) {
            case ExecutionTargetType.GITLAB:
                return 'GitLab';
            case ExecutionTargetType.GITHUB:
                return 'GitHub';
            case ExecutionTargetType.MANUAL:
                return 'Manual';
            default:
                return 'Manual';
        }
    }

    private mapFieldValueToExecutionTargetType(fieldValue: string): ExecutionTargetType {
        switch (fieldValue) {
            case 'GitLab':
                return ExecutionTargetType.GITLAB;
            case 'GitHub':
                return ExecutionTargetType.GITHUB;
            case 'Manual':
                return ExecutionTargetType.MANUAL;
            default:
                return ExecutionTargetType.MANUAL;
        }
    }

    private buildTestRunDescription(testRun: TestRun): string {
        return `Test Run for ${testRun.testCaseIDs.length} test case(s)\n` +
               `Suite: ${testRun.testSuiteID}\n` +
               `Status: ${testRun.status}\n` +
               `Execution Target: ${testRun.executionTarget.name} (${testRun.executionTarget.type})`;
    }

    private mapIssueToTestRun(issue: any): TestRun {
        const extProps = issue.extensionProperties || {};
        // Use the human-readable issue ID (e.g., "TEST-123") as the test run ID
        const testRunId = extProps.testRunId || issue.idReadable || issue.id;
        
        // Get status
        let status: TestStatus = TestStatus.PENDING;
        const statusStr = extProps.testRunStatus;
        if (statusStr && Object.values(TestStatus).includes(statusStr as TestStatus)) {
            status = statusStr as TestStatus;
        }
        
        // Get execution target
        const executionTarget = new ExecutionTargetSnapshot(
            extProps.executionTargetId || '',
            extProps.executionTargetName || '',
            extProps.executionTargetType as ExecutionTargetType || ExecutionTargetType.MANUAL,
            extProps.executionTargetRef || ''
        );

        // Get test case IDs
        const testCaseIDs = extProps.testCaseIds 
            ? extProps.testCaseIds.split(',').filter((id: string) => id.trim())
            : [];

        // Get test suite ID
        const testSuiteId = extProps.testSuiteId || '';

        const testRun = new TestRun(
            testRunId,
            testCaseIDs,
            testSuiteId,
            executionTarget
        );

        // Set status
        testRun.status = status;

        return testRun;
    }
}

