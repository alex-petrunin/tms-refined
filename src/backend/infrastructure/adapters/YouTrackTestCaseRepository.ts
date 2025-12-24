import { TestCaseRepository } from "../../application/ports/TestCaseRepository";
import { TestCase, TestCaseID } from "../../domain/entities/TestCase";
import { Issue, Project } from "@/api/youtrack-types";
import { ExecutionTargetSnapshot } from "../../domain/valueObjects/ExecutionTarget";
import { ExecutionTargetType } from "../../domain/enums/ExecutionTargetType";

/**
 * YouTrack implementation of TestCaseRepository.
 * Stores test cases as YouTrack Issues with extension properties.
 * 
 * Note: This adapter uses YouTrack entities and extension properties directly.
 * For creating/updating issues, it uses the YouTrack scripting API if available,
 * or falls back to REST API calls via the app host.
 */
export class YouTrackTestCaseRepository implements TestCaseRepository {
    constructor(
        private project: Project,
        private settings: AppSettings,
        private appHost?: any // App host API for REST calls (host.fetchYouTrack)
    ) {}

    async save(testCase: TestCase): Promise<void> {
        // Get project from settings (array of Project entities) or use current project
        const testCaseProjects = (this.settings.testCaseProjects as Project[] | undefined) || [];
        // Use first project from array, or current project if array is empty
        const projectId = testCaseProjects.length > 0 ? testCaseProjects[0].id : this.project.id;
        const issueType = (this.settings.testCaseIssueType as string) || "Test Case";

        // Check if issue already exists (by testCaseId extension property)
        const existingIssue = await this.findIssueByTestCaseId(testCase.id);
        
        const issueData: Partial<Issue> = {
            project: { id: projectId },
            summary: testCase.summary,
            description: testCase.description,
            // Set issue type via custom field if needed
        };

        if (existingIssue) {
            // Update existing issue
            await this.updateIssue(existingIssue.id!, issueData, testCase);
        } else {
            // Create new issue
            await this.createIssue(issueData, testCase);
        }
    }

    async findByID(id: TestCaseID): Promise<TestCase | null> {
        const issue = await this.findIssueByTestCaseId(id);
        if (!issue) {
            return null;
        }

        return this.mapIssueToTestCase(issue);
    }

    private async findIssueByTestCaseId(testCaseId: TestCaseID): Promise<Issue | null> {
        // Use YouTrack scripting API if available
        try {
            const entities = require('@jetbrains/youtrack-scripting-api/entities');
            const issues = entities.Issue.findByExtensionProperties({
                testCaseId: testCaseId
            });
            
            if (issues && issues.size > 0) {
                const issue = Array.from(issues)[0];
                return {
                    id: issue.id,
                    summary: issue.summary,
                    description: issue.description,
                    extensionProperties: issue.extensionProperties
                } as Issue;
            }
        } catch (e) {
            // Scripting API not available, use REST API via app host
        }

        // Fallback to REST API via app host
        if (this.appHost && this.appHost.fetchYouTrack) {
            const query = `project:${this.project.id} extensionProperties.testCaseId:${testCaseId}`;
            const issues = await this.appHost.fetchYouTrack(
                `issues?query=${encodeURIComponent(query)}&fields=id,summary,description,extensionProperties,customFields(name,value(name))`,
                {}
            );
            
            if (Array.isArray(issues) && issues.length > 0) {
                return issues[0] as Issue;
            }
        }
        
        return null;
    }

    private async createIssue(issueData: Partial<Issue>, testCase: TestCase): Promise<Issue> {
        // Prepare custom fields
        const customFields: any[] = [
            {
                name: 'TMS Kind',
                value: { name: 'Test Case' },
                $type: 'SingleEnumIssueCustomField'
            }
        ];

        if (testCase.executionTargetSnapshot) {
            customFields.push(
                {
                    name: 'Execution Target Type',
                    value: { name: this.mapExecutionTargetTypeToFieldValue(testCase.executionTargetSnapshot.type) },
                    $type: 'SingleEnumIssueCustomField'
                },
                {
                    name: 'Execution Target Reference',
                    value: testCase.executionTargetSnapshot.ref,
                    $type: 'TextIssueCustomField'
                }
            );
        }

        // Prepare issue with extension properties and custom fields
        const payload: any = {
            ...issueData,
            customFields: customFields,
            extensionProperties: {
                testCaseId: testCase.id,
                testCaseSummary: testCase.summary,
                testCaseDescription: testCase.description,
                ...(testCase.executionTargetSnapshot ? {
                    executionTargetId: testCase.executionTargetSnapshot.id,
                    executionTargetName: testCase.executionTargetSnapshot.name,
                    executionTargetType: testCase.executionTargetSnapshot.type,
                    executionTargetRef: testCase.executionTargetSnapshot.ref,
                } : {})
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
            issue.summary = testCase.summary;
            issue.description = testCase.description;
            
            // Set custom fields
            issue.fields['TMS Kind'] = entities.TMSKind.TestCase;
            if (testCase.executionTargetSnapshot) {
                issue.fields['Execution Target Type'] = entities.ExecutionTargetType[this.mapExecutionTargetTypeToFieldValue(testCase.executionTargetSnapshot.type)];
                issue.fields['Execution Target Reference'] = testCase.executionTargetSnapshot.ref;
            }
            
            // Set extension properties
            issue.extensionProperties.testCaseId = testCase.id;
            issue.extensionProperties.testCaseSummary = testCase.summary;
            issue.extensionProperties.testCaseDescription = testCase.description;
            if (testCase.executionTargetSnapshot) {
                issue.extensionProperties.executionTargetId = testCase.executionTargetSnapshot.id;
                issue.extensionProperties.executionTargetName = testCase.executionTargetSnapshot.name;
                issue.extensionProperties.executionTargetType = testCase.executionTargetSnapshot.type;
                issue.extensionProperties.executionTargetRef = testCase.executionTargetSnapshot.ref;
            }
            return {
                id: issue.id,
                summary: issue.summary,
                description: issue.description,
                extensionProperties: issue.extensionProperties,
                customFields: issue.customFields
            } as Issue;
        } catch (e) {
            throw new Error(`Failed to create issue: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
    }

    private async updateIssue(issueId: string, issueData: Partial<Issue>, testCase: TestCase): Promise<void> {
        // Prepare custom fields
        const customFields: any[] = [
            {
                name: 'TMS Kind',
                value: { name: 'Test Case' },
                $type: 'SingleEnumIssueCustomField'
            }
        ];

        if (testCase.executionTargetSnapshot) {
            customFields.push(
                {
                    name: 'Execution Target Type',
                    value: { name: this.mapExecutionTargetTypeToFieldValue(testCase.executionTargetSnapshot.type) },
                    $type: 'SingleEnumIssueCustomField'
                },
                {
                    name: 'Execution Target Reference',
                    value: testCase.executionTargetSnapshot.ref,
                    $type: 'TextIssueCustomField'
                }
            );
        }

        const payload: any = {
            ...issueData,
            customFields: customFields,
            extensionProperties: {
                testCaseId: testCase.id,
                testCaseSummary: testCase.summary,
                testCaseDescription: testCase.description,
                ...(testCase.executionTargetSnapshot ? {
                    executionTargetId: testCase.executionTargetSnapshot.id,
                    executionTargetName: testCase.executionTargetSnapshot.name,
                    executionTargetType: testCase.executionTargetSnapshot.type,
                    executionTargetRef: testCase.executionTargetSnapshot.ref,
                } : {})
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
                issue.summary = testCase.summary;
                issue.description = testCase.description;
                
                // Update custom fields
                issue.fields['TMS Kind'] = entities.TMSKind.TestCase;
                if (testCase.executionTargetSnapshot) {
                    issue.fields['Execution Target Type'] = entities.ExecutionTargetType[this.mapExecutionTargetTypeToFieldValue(testCase.executionTargetSnapshot.type)];
                    issue.fields['Execution Target Reference'] = testCase.executionTargetSnapshot.ref;
                }
                
                // Update extension properties
                issue.extensionProperties.testCaseId = testCase.id;
                issue.extensionProperties.testCaseSummary = testCase.summary;
                issue.extensionProperties.testCaseDescription = testCase.description;
                if (testCase.executionTargetSnapshot) {
                    issue.extensionProperties.executionTargetId = testCase.executionTargetSnapshot.id;
                    issue.extensionProperties.executionTargetName = testCase.executionTargetSnapshot.name;
                    issue.extensionProperties.executionTargetType = testCase.executionTargetSnapshot.type;
                    issue.extensionProperties.executionTargetRef = testCase.executionTargetSnapshot.ref;
                }
            }
        } catch (e) {
            throw new Error(`Failed to update issue: ${e instanceof Error ? e.message : 'Unknown error'}`);
        }
    }

    private mapIssueToTestCase(issue: Issue): TestCase {
        const extProps = (issue as any).extensionProperties || {};
        const testCaseId = extProps.testCaseId || issue.id!;
        
        // Try to get execution target from custom fields first, fallback to extension properties
        let executionTargetType: ExecutionTargetType | undefined;
        let executionTargetRef: string | undefined;
        
        const customFields = issue.customFields || [];
        const executionTargetTypeField = customFields.find((cf: any) => cf.name === 'Execution Target Type');
        const executionTargetRefField = customFields.find((cf: any) => cf.name === 'Execution Target Reference');
        
        if (executionTargetTypeField?.value?.name) {
            executionTargetType = this.mapFieldValueToExecutionTargetType(executionTargetTypeField.value.name);
        }
        if (executionTargetRefField?.value) {
            // Text fields can have value as string directly or as object with text property
            executionTargetRef = typeof executionTargetRefField.value === 'string' 
                ? executionTargetRefField.value 
                : executionTargetRefField.value.text || executionTargetRefField.value;
        }
        
        let executionTargetSnapshot: ExecutionTargetSnapshot | undefined;
        if (extProps.executionTargetId || (executionTargetType && executionTargetRef)) {
            executionTargetSnapshot = new ExecutionTargetSnapshot(
                extProps.executionTargetId || '',
                extProps.executionTargetName || '',
                executionTargetType || (extProps.executionTargetType as ExecutionTargetType),
                executionTargetRef || extProps.executionTargetRef || ''
            );
        }

        return new TestCase(
            testCaseId,
            issue.summary || "",
            issue.description || "",
            executionTargetSnapshot
        );
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
}

