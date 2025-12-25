import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GitHubExecutionAdapter, GitHubConfig } from '@infra/adapters/GitHubExecutionAdapter';
import { TestRun } from '@domain/entities/TestRun';
import { ExecutionTargetSnapshot } from '@domain/valueObjects/ExecutionTarget';
import { ExecutionTargetType } from '@domain/enums/ExecutionTargetType';
import { createTestRun, createExecutionTargetSnapshot } from '../utils/test-factories';

describe('GitHubExecutionAdapter', () => {
    let adapter: GitHubExecutionAdapter;
    let config: GitHubConfig;

    beforeEach(() => {
        config = {
            apiToken: 'test-token',
            owner: 'test-owner',
            repo: 'test-repo',
        };
        adapter = new GitHubExecutionAdapter(config);
    });

    describe('constructor', () => {
        it('should create adapter with valid config', () => {
            expect(adapter).toBeInstanceOf(GitHubExecutionAdapter);
        });

        it('should use default GitHub API URL when not provided', () => {
            const adapterWithDefault = new GitHubExecutionAdapter(config);
            expect(adapterWithDefault).toBeInstanceOf(GitHubExecutionAdapter);
        });

        it('should use custom base URL for GitHub Enterprise', () => {
            const enterpriseConfig = {
                ...config,
                baseUrl: 'https://github.example.com/api/v3',
            };
            const enterpriseAdapter = new GitHubExecutionAdapter(enterpriseConfig);
            expect(enterpriseAdapter).toBeInstanceOf(GitHubExecutionAdapter);
        });

        it('should throw error if apiToken is missing', () => {
            expect(() => {
                new GitHubExecutionAdapter({
                    owner: 'owner',
                    repo: 'repo',
                } as GitHubConfig);
            }).toThrow('GitHubExecutionAdapter requires apiToken, owner, and repo');
        });

        it('should throw error if owner is missing', () => {
            expect(() => {
                new GitHubExecutionAdapter({
                    apiToken: 'token',
                    repo: 'repo',
                } as GitHubConfig);
            }).toThrow('GitHubExecutionAdapter requires apiToken, owner, and repo');
        });

        it('should throw error if repo is missing', () => {
            expect(() => {
                new GitHubExecutionAdapter({
                    apiToken: 'token',
                    owner: 'owner',
                } as GitHubConfig);
            }).toThrow('GitHubExecutionAdapter requires apiToken, owner, and repo');
        });
    });

    describe('trigger', () => {
        it('should successfully trigger GitHub workflow with workflow file only', async () => {
            const testRun = createTestRun({
                executionTarget: createExecutionTargetSnapshot({
                    type: ExecutionTargetType.GITHUB,
                    ref: 'ci.yml',
                }),
            });

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 204,
            } as Response);

            await adapter.trigger(testRun);

            expect(global.fetch).toHaveBeenCalledWith(
                'https://api.github.com/repos/test-owner/test-repo/actions/workflows/ci.yml/dispatches',
                expect.objectContaining({
                    method: 'POST',
                    headers: expect.objectContaining({
                        'Authorization': 'Bearer test-token',
                    }),
                    body: JSON.stringify({
                        ref: 'main',
                        inputs: {
                            test_run_id: testRun.id,
                        },
                    }),
                })
            );
        });

        it('should successfully trigger GitHub workflow with workflow file and branch', async () => {
            const testRun = createTestRun({
                executionTarget: createExecutionTargetSnapshot({
                    type: ExecutionTargetType.GITHUB,
                    ref: 'ci.yml:develop',
                }),
            });

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 204,
            } as Response);

            await adapter.trigger(testRun);

            expect(global.fetch).toHaveBeenCalledWith(
                'https://api.github.com/repos/test-owner/test-repo/actions/workflows/ci.yml/dispatches',
                expect.objectContaining({
                    body: JSON.stringify({
                        ref: 'develop',
                        inputs: {
                            test_run_id: testRun.id,
                        },
                    }),
                })
            );
        });

        it('should handle workflow file path with subdirectories', async () => {
            const testRun = createTestRun({
                executionTarget: createExecutionTargetSnapshot({
                    type: ExecutionTargetType.GITHUB,
                    ref: '.github/workflows/test.yml:feature/branch',
                }),
            });

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 204,
            } as Response);

            await adapter.trigger(testRun);

            expect(global.fetch).toHaveBeenCalledWith(
                'https://api.github.com/repos/test-owner/test-repo/actions/workflows/.github%2Fworkflows%2Ftest.yml/dispatches',
                expect.any(Object)
            );
        });

        it('should handle branch names with colons', async () => {
            const testRun = createTestRun({
                executionTarget: createExecutionTargetSnapshot({
                    type: ExecutionTargetType.GITHUB,
                    ref: 'ci.yml:feature:test:branch',
                }),
            });

            global.fetch = vi.fn().mockResolvedValue({
                ok: true,
                status: 204,
            } as Response);

            await adapter.trigger(testRun);

            const callBody = JSON.parse(
                (global.fetch as ReturnType<typeof vi.fn>).mock.calls[0][1].body
            );
            expect(callBody.ref).toBe('feature:test:branch');
        });

        it('should throw error if execution target type is not GITHUB', async () => {
            const testRun = createTestRun({
                executionTarget: createExecutionTargetSnapshot({
                    type: ExecutionTargetType.GITLAB,
                    ref: 'ci.yml',
                }),
            });

            await expect(adapter.trigger(testRun)).rejects.toThrow(
                "GitHubExecutionAdapter cannot handle execution target of type 'GITLAB'"
            );
        });

        it('should throw error if ref is missing', async () => {
            const testRun = createTestRun({
                executionTarget: createExecutionTargetSnapshot({
                    type: ExecutionTargetType.GITHUB,
                    ref: '',
                }),
            });

            await expect(adapter.trigger(testRun)).rejects.toThrow(
                'ExecutionTargetSnapshot.ref is required for GitHub Actions workflow dispatch'
            );
        });

        it('should handle GitHub API errors', async () => {
            const testRun = createTestRun({
                executionTarget: createExecutionTargetSnapshot({
                    type: ExecutionTargetType.GITHUB,
                    ref: 'ci.yml',
                }),
            });

            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 404,
                statusText: 'Not Found',
                text: async () => JSON.stringify({ message: 'Workflow not found' }),
            } as Response);

            await expect(adapter.trigger(testRun)).rejects.toThrow(
                'Failed to trigger GitHub Actions workflow: Workflow not found'
            );
        });

        it('should handle GitHub API errors with multiple error messages', async () => {
            const testRun = createTestRun({
                executionTarget: createExecutionTargetSnapshot({
                    type: ExecutionTargetType.GITHUB,
                    ref: 'ci.yml',
                }),
            });

            global.fetch = vi.fn().mockResolvedValue({
                ok: false,
                status: 400,
                statusText: 'Bad Request',
                text: async () => JSON.stringify({
                    errors: [
                        { message: 'Invalid ref' },
                        { message: 'Workflow file not found' },
                    ],
                }),
            } as Response);

            await expect(adapter.trigger(testRun)).rejects.toThrow(
                'Failed to trigger GitHub Actions workflow: Invalid ref, Workflow file not found'
            );
        });

        it('should handle network errors', async () => {
            const testRun = createTestRun({
                executionTarget: createExecutionTargetSnapshot({
                    type: ExecutionTargetType.GITHUB,
                    ref: 'ci.yml',
                }),
            });

            global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

            await expect(adapter.trigger(testRun)).rejects.toThrow(
                'Failed to trigger GitHub Actions workflow: Network error'
            );
        });
    });
});

