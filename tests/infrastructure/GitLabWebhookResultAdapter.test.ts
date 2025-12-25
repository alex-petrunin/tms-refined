import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GitLabWebhookResultAdapter, GitLabPipelineWebhookPayload } from '@infra/adapters/GitLabWebhookResultAdapter';
import { HandleExecutionResultUseCase } from '@app/usecases/HandleExecutionResult';
import { TestRunRepository } from '@app/ports/TestRunRepository';
import { TestRun } from '@domain/entities/TestRun';
import { createTestRun } from '../utils/test-factories';

describe('GitLabWebhookResultAdapter', () => {
    let adapter: GitLabWebhookResultAdapter;
    let mockHandleResultUC: HandleExecutionResultUseCase;
    let mockTestRunRepository: TestRunRepository;

    beforeEach(() => {
        mockHandleResultUC = {
            execute: vi.fn().mockResolvedValue(undefined),
        } as unknown as HandleExecutionResultUseCase;

        mockTestRunRepository = {
            findByPipelineId: vi.fn(),
        } as unknown as TestRunRepository;

        adapter = new GitLabWebhookResultAdapter(mockHandleResultUC, mockTestRunRepository);
    });

    describe('onWebhook', () => {
        it('should process successful pipeline webhook', async () => {
            const testRun = createTestRun();
            const pipelineId = '2201272647';
            const payload: GitLabPipelineWebhookPayload = createGitLabPipelinePayload({
                status: 'success',
                id: Number(pipelineId),
            });

            (mockTestRunRepository.findByPipelineId as ReturnType<typeof vi.fn>)
                .mockResolvedValue(testRun);

            await adapter.onWebhook(payload);

            expect(mockTestRunRepository.findByPipelineId).toHaveBeenCalledWith(pipelineId);
            expect(mockHandleResultUC.execute).toHaveBeenCalledTimes(1);
            expect(mockHandleResultUC.execute).toHaveBeenCalledWith({
                testRunID: testRun.id,
                passed: true,
            });
        });

        it('should process failed pipeline webhook', async () => {
            const testRun = createTestRun();
            const pipelineId = '2201272647';
            const payload: GitLabPipelineWebhookPayload = createGitLabPipelinePayload({
                status: 'failed',
                id: Number(pipelineId),
            });

            (mockTestRunRepository.findByPipelineId as ReturnType<typeof vi.fn>)
                .mockResolvedValue(testRun);

            await adapter.onWebhook(payload);

            expect(mockTestRunRepository.findByPipelineId).toHaveBeenCalledWith(pipelineId);
            expect(mockHandleResultUC.execute).toHaveBeenCalledTimes(1);
            expect(mockHandleResultUC.execute).toHaveBeenCalledWith({
                testRunID: testRun.id,
                passed: false,
            });
        });

        it('should process canceled pipeline webhook', async () => {
            const testRun = createTestRun();
            const pipelineId = '2201272647';
            const payload: GitLabPipelineWebhookPayload = createGitLabPipelinePayload({
                status: 'canceled',
                id: Number(pipelineId),
            });

            (mockTestRunRepository.findByPipelineId as ReturnType<typeof vi.fn>)
                .mockResolvedValue(testRun);

            await adapter.onWebhook(payload);

            expect(mockTestRunRepository.findByPipelineId).toHaveBeenCalledWith(pipelineId);
            expect(mockHandleResultUC.execute).toHaveBeenCalledTimes(1);
            expect(mockHandleResultUC.execute).toHaveBeenCalledWith({
                testRunID: testRun.id,
                passed: false,
            });
        });

        it('should process skipped pipeline webhook as passed', async () => {
            const testRun = createTestRun();
            const pipelineId = '2201272647';
            const payload: GitLabPipelineWebhookPayload = createGitLabPipelinePayload({
                status: 'skipped',
                id: Number(pipelineId),
            });

            (mockTestRunRepository.findByPipelineId as ReturnType<typeof vi.fn>)
                .mockResolvedValue(testRun);

            await adapter.onWebhook(payload);

            expect(mockTestRunRepository.findByPipelineId).toHaveBeenCalledWith(pipelineId);
            expect(mockHandleResultUC.execute).toHaveBeenCalledTimes(1);
            expect(mockHandleResultUC.execute).toHaveBeenCalledWith({
                testRunID: testRun.id,
                passed: true,
            });
        });

        it('should ignore running pipeline webhook', async () => {
            const payload: GitLabPipelineWebhookPayload = createGitLabPipelinePayload({
                status: 'running',
            });

            await adapter.onWebhook(payload);

            expect(mockTestRunRepository.findByPipelineId).not.toHaveBeenCalled();
            expect(mockHandleResultUC.execute).not.toHaveBeenCalled();
        });

        it('should ignore pending pipeline webhook', async () => {
            const payload: GitLabPipelineWebhookPayload = createGitLabPipelinePayload({
                status: 'pending',
            });

            await adapter.onWebhook(payload);

            expect(mockTestRunRepository.findByPipelineId).not.toHaveBeenCalled();
            expect(mockHandleResultUC.execute).not.toHaveBeenCalled();
        });

        it('should ignore created pipeline webhook', async () => {
            const payload: GitLabPipelineWebhookPayload = createGitLabPipelinePayload({
                status: 'created',
            });

            await adapter.onWebhook(payload);

            expect(mockTestRunRepository.findByPipelineId).not.toHaveBeenCalled();
            expect(mockHandleResultUC.execute).not.toHaveBeenCalled();
        });

        it('should skip processing if test run is not found for pipeline ID', async () => {
            const pipelineId = '2201272647';
            const payload: GitLabPipelineWebhookPayload = createGitLabPipelinePayload({
                status: 'success',
                id: Number(pipelineId),
            });

            (mockTestRunRepository.findByPipelineId as ReturnType<typeof vi.fn>)
                .mockResolvedValue(null);

            await adapter.onWebhook(payload);

            expect(mockTestRunRepository.findByPipelineId).toHaveBeenCalledWith(pipelineId);
            expect(mockHandleResultUC.execute).not.toHaveBeenCalled();
        });

        it('should skip processing if test run is not found', async () => {
            const pipelineId = '999999999';
            const payload: GitLabPipelineWebhookPayload = createGitLabPipelinePayload({
                status: 'success',
                id: Number(pipelineId),
            });

            (mockTestRunRepository.findByPipelineId as ReturnType<typeof vi.fn>)
                .mockResolvedValue(null);

            await adapter.onWebhook(payload);

            expect(mockTestRunRepository.findByPipelineId).toHaveBeenCalledWith(pipelineId);
            expect(mockHandleResultUC.execute).not.toHaveBeenCalled();
        });

        it('should handle pipeline lookup correctly', async () => {
            const testRun = createTestRun();
            const pipelineId = '2201272647';
            const payload: GitLabPipelineWebhookPayload = createGitLabPipelinePayload({
                status: 'success',
                id: Number(pipelineId),
            });

            (mockTestRunRepository.findByPipelineId as ReturnType<typeof vi.fn>)
                .mockResolvedValue(testRun);

            await adapter.onWebhook(payload);

            expect(mockTestRunRepository.findByPipelineId).toHaveBeenCalledWith(pipelineId);
            expect(mockHandleResultUC.execute).toHaveBeenCalledWith({
                testRunID: testRun.id,
                passed: true,
            });
        });
    });

    describe('payload validation', () => {
        it('should throw error if payload is null', async () => {
            await expect(adapter.onWebhook(null)).rejects.toThrow(
                'GitLab webhook payload must be an object'
            );
        });

        it('should throw error if payload is not an object', async () => {
            await expect(adapter.onWebhook('invalid')).rejects.toThrow(
                'GitLab webhook payload must be an object'
            );
        });

        it('should throw error if object_kind is not pipeline', async () => {
            const invalidPayload = {
                object_kind: 'push',
                object_attributes: {},
            };

            await expect(adapter.onWebhook(invalidPayload)).rejects.toThrow(
                "Expected webhook object_kind to be 'pipeline'"
            );
        });

        it('should throw error if object_attributes is missing', async () => {
            const invalidPayload = {
                object_kind: 'pipeline',
            };

            await expect(adapter.onWebhook(invalidPayload)).rejects.toThrow(
                'GitLab webhook payload must contain object_attributes'
            );
        });

        it('should throw error if pipeline ID is not a number', async () => {
            const invalidPayload = {
                object_kind: 'pipeline',
                object_attributes: {
                    id: 'not-a-number',
                    status: 'success',
                    variables: [],
                },
            };

            await expect(adapter.onWebhook(invalidPayload)).rejects.toThrow(
                'Pipeline ID must be a number'
            );
        });

        it('should throw error if status is missing', async () => {
            const invalidPayload = {
                object_kind: 'pipeline',
                object_attributes: {
                    id: 12345,
                    variables: [],
                },
            };

            await expect(adapter.onWebhook(invalidPayload)).rejects.toThrow(
                'Pipeline status must be a string'
            );
        });

        it('should throw error if variables is not an array', async () => {
            const invalidPayload = {
                object_kind: 'pipeline',
                object_attributes: {
                    id: 12345,
                    status: 'success',
                    variables: 'not-an-array',
                },
            };

            await expect(adapter.onWebhook(invalidPayload)).rejects.toThrow(
                'Pipeline variables must be an array'
            );
        });
    });

    describe('edge cases', () => {
        it('should handle pipeline with finished_at null', async () => {
            const testRun = createTestRun();
            const pipelineId = '2201272647';
            const payload: GitLabPipelineWebhookPayload = createGitLabPipelinePayload({
                status: 'success',
                id: Number(pipelineId),
            });
            payload.object_attributes.finished_at = null;

            (mockTestRunRepository.findByPipelineId as ReturnType<typeof vi.fn>)
                .mockResolvedValue(testRun);

            await adapter.onWebhook(payload);

            expect(mockTestRunRepository.findByPipelineId).toHaveBeenCalledWith(pipelineId);
            expect(mockHandleResultUC.execute).toHaveBeenCalled();
        });

        it('should handle pipeline with duration null', async () => {
            const testRun = createTestRun();
            const pipelineId = '2201272647';
            const payload: GitLabPipelineWebhookPayload = createGitLabPipelinePayload({
                status: 'success',
                id: Number(pipelineId),
            });
            payload.object_attributes.duration = null;

            (mockTestRunRepository.findByPipelineId as ReturnType<typeof vi.fn>)
                .mockResolvedValue(testRun);

            await adapter.onWebhook(payload);

            expect(mockTestRunRepository.findByPipelineId).toHaveBeenCalledWith(pipelineId);
            expect(mockHandleResultUC.execute).toHaveBeenCalled();
        });

        it('should handle pipeline with builds array', async () => {
            const testRun = createTestRun();
            const pipelineId = '2201272647';
            const payload: GitLabPipelineWebhookPayload = createGitLabPipelinePayload({
                status: 'success',
                id: Number(pipelineId),
            });
            payload.builds = [
                {
                    id: 123,
                    stage: 'test',
                    name: 'test_job',
                    status: 'success',
                    created_at: '2025-12-08 05:17:25 UTC',
                    started_at: '2025-12-08 05:17:57 UTC',
                    finished_at: '2025-12-08 05:18:28 UTC',
                    duration: 31.4,
                    queued_duration: 0.3,
                    failure_reason: null,
                    when: 'on_success',
                    manual: false,
                    allow_failure: false,
                },
            ];

            (mockTestRunRepository.findByPipelineId as ReturnType<typeof vi.fn>)
                .mockResolvedValue(testRun);

            await adapter.onWebhook(payload);

            expect(mockTestRunRepository.findByPipelineId).toHaveBeenCalledWith(pipelineId);
            expect(mockHandleResultUC.execute).toHaveBeenCalled();
        });
    });
});

/**
 * Helper function to create a GitLab pipeline webhook payload with defaults
 */
function createGitLabPipelinePayload(overrides?: {
    status?: GitLabPipelineWebhookPayload['object_attributes']['status'];
    variables?: GitLabPipelineWebhookPayload['object_attributes']['variables'];
    id?: number;
}): GitLabPipelineWebhookPayload {
    return {
        object_kind: 'pipeline',
        object_attributes: {
            id: overrides?.id ?? 2201272647,
            iid: 5,
            name: null,
            ref: 'main',
            tag: false,
            sha: 'cc8283423ee4ad5119ab0df0e3dacd15415c0eab',
            before_sha: '0000000000000000000000000000000000000000',
            source: 'api',
            status: overrides?.status ?? 'success',
            detailed_status: 'passed',
            stages: ['build', 'test', 'deploy'],
            created_at: '2025-12-08 05:17:25 UTC',
            finished_at: '2025-12-08 05:18:59 UTC',
            duration: 91,
            queued_duration: 1,
            protected_ref: true,
            variables: overrides?.variables ?? [],
            url: 'https://gitlab.com/tms-app1/integration-1/-/pipelines/2201272647',
        },
        merge_request: null,
        user: {
            id: 30908734,
            name: 'Aleksandr Petrunin',
            username: 'aleksandr.petrunin',
            avatar_url: 'https://secure.gravatar.com/avatar/bad4ac2608357f7ab68a3a7c624255365a3d9a1605cc1522087eeab4349efc9f?s=80&d=identicon',
            email: 'test@example.com',
        },
        project: {
            id: 75214400,
            name: 'integration-1',
            description: null,
            web_url: 'https://gitlab.com/tms-app1/integration-1',
            avatar_url: null,
            git_ssh_url: 'git@gitlab.com:tms-app1/integration-1.git',
            git_http_url: 'https://gitlab.com/tms-app1/integration-1.git',
            namespace: 'tms-app',
            visibility_level: 20,
            path_with_namespace: 'tms-app1/integration-1',
            default_branch: 'main',
            ci_config_path: '',
        },
        commit: {
            id: 'cc8283423ee4ad5119ab0df0e3dacd15415c0eab',
            message: 'Add new file',
            title: 'Add new file',
            timestamp: '2025-11-24T08:33:58+00:00',
            url: 'https://gitlab.com/tms-app1/integration-1/-/commit/cc8283423ee4ad5119ab0df0e3dacd15415c0eab',
            author: {
                name: 'Aleksandr Petrunin',
                email: 'aleksandr.petrunin@jetbrains.com',
            },
        },
    };
}

