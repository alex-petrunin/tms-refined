import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GitLabExecutionAdapter, GitLabConfig } from '@infra/adapters/GitLabExecutionAdapter';
import { TestRun } from '@domain/entities/TestRun';
import { ExecutionTargetSnapshot } from '@domain/valueObjects/ExecutionTarget';
import { ExecutionTargetType } from '@domain/enums/ExecutionTargetType';
import { createTestRun, createExecutionTargetSnapshot } from '../utils/test-factories';

describe('GitLabExecutionAdapter', () => {
    let adapter: GitLabExecutionAdapter;
    let config: GitLabConfig;

    beforeEach(() => {
        config = {
            baseUrl: 'https://gitlab.com',
            apiToken: 'test-token',
            projectId: '12345',
        };
        adapter = new GitLabExecutionAdapter(config);
    });

    describe('constructor', () => {
        it('should create adapter with valid config', () => {
            expect(adapter).toBeInstanceOf(GitLabExecutionAdapter);
        });

        it('should throw error if baseUrl is missing', () => {
            expect(() => {
                new GitLabExecutionAdapter({
                    apiToken: 'token',
                    projectId: '123',
                } as GitLabConfig);
            }).toThrow('GitLabExecutionAdapter requires baseUrl, apiToken, and projectId');
        });

        it('should throw error if apiToken is missing', () => {
            expect(() => {
                new GitLabExecutionAdapter({
                    baseUrl: 'https://gitlab.com',
                    projectId: '123',
                } as GitLabConfig);
            }).toThrow('GitLabExecutionAdapter requires baseUrl, apiToken, and projectId');
        });

        it('should throw error if projectId is missing', () => {
            expect(() => {
                new GitLabExecutionAdapter({
                    baseUrl: 'https://gitlab.com',
                    apiToken: 'token',
                } as GitLabConfig);
            }).toThrow('GitLabExecutionAdapter requires baseUrl, apiToken, and projectId');
        });
    });

    describe('trigger', () => {
        it('should successfully trigger GitLab pipeline', async () => {
            const testRun = createTestRun({
                executionTarget: createExecutionTargetSnapshot({
                    type: ExecutionTargetType.GITLAB,
                    ref: 'main',
                }),
            });

            const mockPipelineResponse = {
                id: 12345,
                status: 'pending',
                ref: 'main',
                web_url: 'https://gitlab.com/project/-/pipelines/12345',
            };

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => mockPipelineResponse,
            } as Response);

            await adapter.trigger(testRun);

            expect(global.fetch).toHaveBeenCalledWith(
                'https://gitlab.com/api/v4/projects/12345/pipeline',
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'PRIVATE-TOKEN': 'test-token',
                    }),
                    body: JSON.stringify({
                        ref: 'main',
                        variables: [
                            {
                                key: 'TEST_RUN_ID',
                                value: testRun.id,
                            },
                        ],
                    }),
                })
            );
        });

        it('should throw error if execution target type is not GITLAB', async () => {
            const testRun = createTestRun({
                executionTarget: createExecutionTargetSnapshot({
                    type: ExecutionTargetType.GITHUB,
                    ref: 'main',
                }),
            });

            await expect(adapter.trigger(testRun)).rejects.toThrow(
                "GitLabExecutionAdapter cannot handle execution target of type 'GITHUB'"
            );
        });

        it('should throw error if ref is missing', async () => {
            const testRun = createTestRun({
                executionTarget: createExecutionTargetSnapshot({
                    type: ExecutionTargetType.GITLAB,
                    ref: '',
                }),
            });

            await expect(adapter.trigger(testRun)).rejects.toThrow(
                'ExecutionTargetSnapshot.ref is required for GitLab pipeline trigger'
            );
        });

        it('should handle GitLab API errors', async () => {
            const testRun = createTestRun({
                executionTarget: createExecutionTargetSnapshot({
                    type: ExecutionTargetType.GITLAB,
                    ref: 'main',
                }),
            });

            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 400,
                statusText: 'Bad Request',
                text: async () => JSON.stringify({ message: 'Invalid ref' }),
            } as Response);

            await expect(adapter.trigger(testRun)).rejects.toThrow(
                'Failed to trigger GitLab CI pipeline: Invalid ref'
            );
        });

        it('should handle network errors', async () => {
            const testRun = createTestRun({
                executionTarget: createExecutionTargetSnapshot({
                    type: ExecutionTargetType.GITLAB,
                    ref: 'main',
                }),
            });

            global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

            await expect(adapter.trigger(testRun)).rejects.toThrow(
                'Failed to trigger GitLab CI pipeline: Network error'
            );
        });

        it('should encode project ID with special characters', async () => {
            const adapterWithEncodedProject = new GitLabExecutionAdapter({
                ...config,
                projectId: 'group/subgroup/project',
            });

            const testRun = createTestRun({
                executionTarget: createExecutionTargetSnapshot({
                    type: ExecutionTargetType.GITLAB,
                    ref: 'main',
                }),
            });

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                json: async () => ({ id: 12345, status: 'pending', ref: 'main', web_url: '' }),
            } as Response);

            await adapterWithEncodedProject.trigger(testRun);

            expect(global.fetch).toHaveBeenCalledWith(
                'https://gitlab.com/api/v4/projects/group%2Fsubgroup%2Fproject/pipeline',
                expect.any(Object)
            );
        });
    });
});

