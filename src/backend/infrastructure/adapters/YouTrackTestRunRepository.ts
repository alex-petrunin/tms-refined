import { TestRunRepository, IdempotencyKey } from "../../application/ports/TestRunRepository";
import { TestRun, TestRunID, TestStatus } from "../../domain/entities/TestRun";
import { Issue, Project } from "@/api/youtrack-types";
import { ExecutionTargetSnapshot } from "../../domain/valueObjects/ExecutionTarget";
import { ExecutionTargetType } from "../../domain/enums/ExecutionTargetType";

/**
 * YouTrack implementation of TestRunRepository.
 * Stores test runs as YouTrack Issues with extension properties and links to test cases.
 * 
 * Note: This adapter uses YouTrack entities and extension properties directly.
 * For creating/updating issues, it uses the YouTrack scripting API if available,
 * or falls back to REST API calls via the app host.
 */
export class YouTrackTestRunRepository implements TestRunRepository {
    private idempotencyIndex: Map<IdempotencyKey, TestRunID> = new Map();

    constructor(
        private project: Project,
        private settings: AppSettings,
        private appHost?: any, // App host API for REST calls (host.fetchYouTrack)
        private globalStorage?: any // Global storage for idempotency index
    ) {
        // Load idempotency index from global storage
        this.loadIdempotencyIndex();
    }

    async save(testRun: TestRun, idempotencyKey?: IdempotencyKey): Promise<void> {
        // Get project from settings (array of Project entities) or use current project
        const testRunProjects = (this.settings.testRunProjects as Project[] | undefined) || [];
        // Use first project from array, or current project if array is empty
        const projectId = testRunProjects.length > 0 ? testRunProjects[0].id : this.project.id;
        const issueType = (this.settings.testRunIssueType as string) || "Test Run";

        // Check if issue already exists
        const existingIssue = await this.findIssueByTestRunId(testRun.id);
        
        const issueData: Partial<Issue> = {
            project: { id: projectId },
            summary: `Test Run: ${testRun.testCaseIDs.length} test case(s)`,
            description: this.buildTestRunDescription(testRun),
        };

        if (existingIssue) {
            // Update existing issue
            await this.updateIssue(existingIssue.id!, issueData, testRun);
        } else {
            // Create new issue
            const createdIssue = await this.createIssue(issueData, testRun);
            
            // Create links to test case issues
            await this.createTestCaseLinks(createdIssue.id!, testRun.testCaseIDs);
        }

        // Store idempotency key mapping
        if (idempotencyKey) {
            this.idempotencyIndex.set(idempotencyKey, testRun.id);
            await this.saveIdempotencyIndex();
        }
    }

    async findById(id: TestRunID): Promise<TestRun | null> {
        const issue = await this.findIssueByTestRunId(id);
        if (!issue) {
            return null;
        }

        return this.mapIssueToTestRun(issue);
    }

    async findByIdempotencyKey(idempotencyKey: IdempotencyKey): Promise<TestRun | null> {
        // Check in-memory index first
        const testRunId = this.idempotencyIndex.get(idempotencyKey);
        if (testRunId) {
            return this.findById(testRunId);
        }

        // Fallback: search in global storage
        const globalIndex = await this.getGlobalIdempotencyIndex();
        const storedTestRunId = globalIndex[idempotencyKey];
        if (storedTestRunId) {
            return this.findById(storedTestRunId);
        }

        return null;
    }

    private async findIssueByTestRunId(testRunId: TestRunID): Promise<Issue | null> {
        // Use YouTrack scripting API if available
        try {
            const entities = require('@jetbrains/youtrack-scripting-api/entities');
            const issues = entities.Issue.findByExtensionProperties({
                testRunId: testRunId
            });
            
            if (issues && issues.size > 0) {
                const issue = Array.from(issues)[0];
                return {
                    id: issue.id,
                    summary: issue.summary,
                    description: issue.description,
                    extensionProperties: issue.extensionProperties,
                    links: issue.links
                } as Issue;
            }
        } catch (e) {
            // Scripting API not available, use REST API
        }

        // Fallback to REST API via app host
        if (this.appHost && this.appHost.fetchYouTrack) {
            const query = `project:${this.project.id} extensionProperties.testRunId:${testRunId}`;
            const issues = await this.appHost.fetchYouTrack(
                `issues?query=${encodeURIComponent(query)}&fields=id,summary,description,extensionProperties,links,customFields(name,value(name))`,
                {}
            );
            
            if (Array.isArray(issues) && issues.length > 0) {
                return issues[0] as Issue;
            }
        }
        
        return null;
    }

    private async createIssue(issueData: Partial<Issue>, testRun: TestRun): Promise<Issue> {
        // Prepare custom fields
        const customFields: any[] = [
            {
                name: 'TMS Kind',
                value: { name: 'Test Run' },
                $type: 'SingleEnumIssueCustomField'
            },
            {
                name: 'Test Run Status',
                value: { name: this.mapTestStatusToFieldValue(testRun.status) },
                $type: 'SingleEnumIssueCustomField'
            },
            {
                name: 'Execution Target Type',
                value: { name: this.mapExecutionTargetTypeToFieldValue(testRun.executionTarget.type) },
                $type: 'SingleEnumIssueCustomField'
            },
            {
                name: 'Execution Target Reference',
                value: testRun.executionTarget.ref,
                $type: 'TextIssueCustomField'
            }
        ];

        // Add Test Suite field if suite ID is available
        if (testRun.testSuiteID) {
            customFields.push({
                name: 'Test Suite',
                value: { name: testRun.testSuiteID }, // This would ideally be the suite name, but ID works for now
                $type: 'SingleEnumIssueCustomField'
            });
        }

        const payload: any = {
            ...issueData,
            customFields: customFields,
            extensionProperties: {
                testRunId: testRun.id,
                testRunStatus: testRun.status,
                testSuiteId: testRun.testSuiteID,
                testCaseIds: testRun.testCaseIDs.join(","),
                executionTargetId: testRun.executionTarget.id,
                executionTargetName: testRun.executionTarget.name,
                executionTargetType: testRun.executionTarget.type,
                executionTargetRef: testRun.executionTarget.ref,
            }
        };

        // Use REST API via app host
        if (this.appHost && this.appHost.fetchYouTrack) {
            const created = await this.appHost.fetchYouTrack('issues', {
                method: 'POST',
                body: payload,
                query: { fields: 'id,summary,description,extensionProperties,customFields(name,value(name))' }
            });
            return created as Issue;
        }

        // Fallback: Try scripting API
        try {
            const entities = require('@jetbrains/youtrack-scripting-api/entities');
            const project = entities.Project.findById(this.project.id!);
            const issue = entities.Issue.createSharedDraft(project);
            issue.summary = payload.summary;
            issue.description = payload.description;
            
            // Set custom fields
            issue.fields['TMS Kind'] = entities.TMSKind.TestRun;
            issue.fields['Test Run Status'] = entities.TestRunStatus[this.mapTestStatusToFieldValue(testRun.status)];
            issue.fields['Execution Target Type'] = entities.ExecutionTargetType[this.mapExecutionTargetTypeToFieldValue(testRun.executionTarget.type)];
            issue.fields['Execution Target Reference'] = testRun.executionTarget.ref;
            if (testRun.testSuiteID) {
                issue.fields['Test Suite'] = entities.TestSuite[testRun.testSuiteID];
            }
            
            // Set extension properties
            Object.assign(issue.extensionProperties, payload.extensionProperties);
            return {
                id: issue.id,
                summary: issue.summary,
                description: issue.description,
                extensionProperties: issue.extensionProperties,
                customFields: issue.customFields
            } as Issue;
        } catch (e) {
            throw new Error(`Failed to create test run issue: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
    }

    private async updateIssue(issueId: string, issueData: Partial<Issue>, testRun: TestRun): Promise<void> {
        // Prepare custom fields
        const customFields: any[] = [
            {
                name: 'TMS Kind',
                value: { name: 'Test Run' },
                $type: 'SingleEnumIssueCustomField'
            },
            {
                name: 'Test Run Status',
                value: { name: this.mapTestStatusToFieldValue(testRun.status) },
                $type: 'SingleEnumIssueCustomField'
            },
            {
                name: 'Execution Target Type',
                value: { name: this.mapExecutionTargetTypeToFieldValue(testRun.executionTarget.type) },
                $type: 'SingleEnumIssueCustomField'
            },
            {
                name: 'Execution Target Reference',
                value: testRun.executionTarget.ref,
                $type: 'TextIssueCustomField'
            }
        ];

        // Add Test Suite field if suite ID is available
        if (testRun.testSuiteID) {
            customFields.push({
                name: 'Test Suite',
                value: { name: testRun.testSuiteID },
                $type: 'SingleEnumIssueCustomField'
            });
        }

        const payload: any = {
            ...issueData,
            customFields: customFields,
            extensionProperties: {
                testRunId: testRun.id,
                testRunStatus: testRun.status,
                testSuiteId: testRun.testSuiteID,
                testCaseIds: testRun.testCaseIDs.join(","),
                executionTargetId: testRun.executionTarget.id,
                executionTargetName: testRun.executionTarget.name,
                executionTargetType: testRun.executionTarget.type,
                executionTargetRef: testRun.executionTarget.ref,
            }
        };

        // Use REST API via app host
        if (this.appHost && this.appHost.fetchYouTrack) {
            await this.appHost.fetchYouTrack(`issues/${issueId}`, {
                method: 'POST',
                body: payload
            });
            return;
        }

        // Fallback: Try scripting API
        try {
            const entities = require('@jetbrains/youtrack-scripting-api/entities');
            const issue = entities.Issue.findById(issueId);
            if (issue) {
                issue.summary = payload.summary;
                issue.description = payload.description;
                
                // Update custom fields
                issue.fields['TMS Kind'] = entities.TMSKind.TestRun;
                issue.fields['Test Run Status'] = entities.TestRunStatus[this.mapTestStatusToFieldValue(testRun.status)];
                issue.fields['Execution Target Type'] = entities.ExecutionTargetType[this.mapExecutionTargetTypeToFieldValue(testRun.executionTarget.type)];
                issue.fields['Execution Target Reference'] = testRun.executionTarget.ref;
                if (testRun.testSuiteID) {
                    issue.fields['Test Suite'] = entities.TestSuite[testRun.testSuiteID];
                }
                
                // Update extension properties
                Object.assign(issue.extensionProperties, payload.extensionProperties);
            }
        } catch (e) {
            throw new Error(`Failed to update test run issue: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
    }

    private async createTestCaseLinks(testRunIssueId: string, testCaseIDs: string[]): Promise<void> {

        // Find test case issues by their testCaseId extension property
        for (const testCaseId of testCaseIDs) {
            const testCaseIssue = await this.findTestCaseIssue(testCaseId);
            if (testCaseIssue) {
                // Create link between test run and test case
                // Link type would need to be configured in YouTrack (e.g., "tests")
                await this.createIssueLink(testRunIssueId, testCaseIssue.id!);
            }
        }
    }

    private async findTestCaseIssue(testCaseId: string): Promise<Issue | null> {
        // Use YouTrack scripting API if available
        try {
            const entities = require('@jetbrains/youtrack-scripting-api/entities');
            const issues = entities.Issue.findByExtensionProperties({
                testCaseId: testCaseId
            });
            
            if (issues && issues.size > 0) {
                const issue = Array.from(issues)[0];
                return { id: issue.id } as Issue;
            }
        } catch (e) {
            // Scripting API not available, use REST API
        }

        // Fallback to REST API via app host
        if (this.appHost && this.appHost.fetchYouTrack) {
            const query = `extensionProperties.testCaseId:${testCaseId}`;
            const issues = await this.appHost.fetchYouTrack(
                `issues?query=${encodeURIComponent(query)}&fields=id&$top=1`,
                {}
            );
            
            if (Array.isArray(issues) && issues.length > 0) {
                return issues[0] as Issue;
            }
        }

        return null;
    }

    private async createIssueLink(sourceIssueId: string, targetIssueId: string): Promise<void> {
        const payload = {
            target: { id: targetIssueId },
            linkType: { name: "tests" } // This would need to be configured in YouTrack
        };

        // Use REST API via app host
        if (this.appHost && this.appHost.fetchYouTrack) {
            try {
                await this.appHost.fetchYouTrack(`issues/${sourceIssueId}/links`, {
                    method: 'POST',
                    body: payload
                });
            } catch (e) {
                // Ignore errors for link creation (links are optional)
                console.warn(`Failed to create link: ${e instanceof Error ? e.message : 'Unknown error'}`);
            }
            return;
        }

        // Fallback: Try scripting API
        try {
            const entities = require('@jetbrains/youtrack-scripting-api/entities');
            const sourceIssue = entities.Issue.findById(sourceIssueId);
            const targetIssue = entities.Issue.findById(targetIssueId);
            if (sourceIssue && targetIssue) {
                // Link creation via scripting API would depend on link type configuration
                // This is a placeholder - actual implementation depends on YouTrack setup
            }
        } catch (e) {
            // Ignore errors for link creation
        }
    }

    private mapIssueToTestRun(issue: Issue): TestRun {
        const extProps = (issue as any).extensionProperties || {};
        const testRunId = extProps.testRunId || issue.id!;
        
        // Try to get values from custom fields first, fallback to extension properties
        const customFields = issue.customFields || [];
        
        // Get status from custom field
        const statusField = customFields.find((cf: any) => cf.name === 'Test Run Status');
        let status: TestStatus = TestStatus.PENDING;
        if (statusField?.value?.name) {
            const mappedStatus = this.mapFieldValueToTestStatus(statusField.value.name);
            if (mappedStatus) {
                status = mappedStatus;
            }
        } else {
            // Fallback to extension properties
            const extStatus = extProps.testRunStatus as TestStatus;
            if (extStatus && Object.values(TestStatus).includes(extStatus)) {
                status = extStatus;
            }
        }
        
        // Get execution target type from custom field
        const executionTargetTypeField = customFields.find((cf: any) => cf.name === 'Execution Target Type');
        const executionTargetRefField = customFields.find((cf: any) => cf.name === 'Execution Target Reference');
        
        let executionTargetType = extProps.executionTargetType as ExecutionTargetType;
        let executionTargetRef = extProps.executionTargetRef || '';
        
        if (executionTargetTypeField?.value?.name) {
            executionTargetType = this.mapFieldValueToExecutionTargetType(executionTargetTypeField.value.name);
        }
        if (executionTargetRefField?.value) {
            // Text fields can have value as string directly or as object with text property
            executionTargetRef = typeof executionTargetRefField.value === 'string' 
                ? executionTargetRefField.value 
                : executionTargetRefField.value.text || executionTargetRefField.value;
        }
        
        const executionTarget = new ExecutionTargetSnapshot(
            extProps.executionTargetId || '',
            extProps.executionTargetName || '',
            executionTargetType,
            executionTargetRef
        );

        const testCaseIDs = extProps.testCaseIds 
            ? extProps.testCaseIds.split(",").filter((id: string) => id.trim())
            : [];

        // Get test suite ID from custom field or extension properties
        const testSuiteField = customFields.find((cf: any) => cf.name === 'Test Suite');
        const testSuiteId = testSuiteField?.value?.name || extProps.testSuiteId || '';

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

    private mapTestStatusToFieldValue(status: TestStatus): string {
        // Map domain enum to custom field value
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

    private mapFieldValueToTestStatus(fieldValue: string): TestStatus | null {
        // Map custom field value to domain enum
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
                return null;
        }
    }

    private mapExecutionTargetTypeToFieldValue(type: ExecutionTargetType): string {
        // Map domain enum to custom field value
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
        // Map custom field value to domain enum
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

    private async loadIdempotencyIndex(): Promise<void> {
        const globalIndex = await this.getGlobalIdempotencyIndex();
        this.idempotencyIndex = new Map(Object.entries(globalIndex));
    }

    private async saveIdempotencyIndex(): Promise<void> {
        const indexObj = Object.fromEntries(this.idempotencyIndex);
        await this.saveGlobalIdempotencyIndex(indexObj);
    }

    private async getGlobalIdempotencyIndex(): Promise<Record<IdempotencyKey, TestRunID>> {
        // Access global storage extension properties
        if (this.globalStorage && this.globalStorage.extensionProperties) {
            const indexJson = this.globalStorage.extensionProperties.testRunIdempotencyIndex;
            if (indexJson && typeof indexJson === 'string') {
                try {
                    return JSON.parse(indexJson);
                } catch (e) {
                    return {};
                }
            }
        }
        return {};
    }

    private async saveGlobalIdempotencyIndex(index: Record<IdempotencyKey, TestRunID>): Promise<void> {
        // Save to global storage extension properties
        if (this.globalStorage && this.globalStorage.extensionProperties) {
            this.globalStorage.extensionProperties.testRunIdempotencyIndex = JSON.stringify(index);
        }
    }
}

