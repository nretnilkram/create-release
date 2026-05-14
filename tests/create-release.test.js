import { jest, describe, beforeEach, test, expect } from '@jest/globals';

const mockGetInput = jest.fn();
const mockSetOutput = jest.fn();
const mockSetFailed = jest.fn();
const mockCreateRelease = jest.fn();
const mockGetOctokit = jest.fn();
const mockReadFileSync = jest.fn();

jest.unstable_mockModule('@actions/core', () => ({
  getInput: mockGetInput,
  setOutput: mockSetOutput,
  setFailed: mockSetFailed
}));

jest.unstable_mockModule('@actions/github', () => ({
  getOctokit: mockGetOctokit,
  context: {
    repo: {
      owner: 'owner',
      repo: 'repo'
    },
    sha: 'sha'
  }
}));

jest.unstable_mockModule('node:fs', () => ({
  readFileSync: mockReadFileSync,
  promises: { access: jest.fn() },
  constants: { O_RDONLY: 0 }
}));

const { default: run } = await import('../src/create-release.js');

describe('Create Release', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    mockCreateRelease.mockReturnValueOnce({
      data: {
        id: 'releaseId',
        html_url: 'htmlUrl',
        upload_url: 'uploadUrl'
      }
    });
    mockGetOctokit.mockImplementation(() => ({
      rest: {
        repos: {
          createRelease: mockCreateRelease
        }
      }
    }));
  });

  test('Create release endpoint is called', async () => {
    mockGetInput
      .mockReturnValueOnce('refs/tags/v1.0.0')
      .mockReturnValueOnce('myRelease')
      .mockReturnValueOnce('myBody')
      .mockReturnValueOnce('false')
      .mockReturnValueOnce('false');

    await run();

    expect(mockCreateRelease).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      tag_name: 'v1.0.0',
      name: 'myRelease',
      body: 'myBody',
      draft: false,
      prerelease: false,
      target_commitish: 'sha'
    });
  });

  test('Draft release is created', async () => {
    mockGetInput
      .mockReturnValueOnce('refs/tags/v1.0.0')
      .mockReturnValueOnce('myRelease')
      .mockReturnValueOnce('myBody')
      .mockReturnValueOnce('true')
      .mockReturnValueOnce('false');

    await run();

    expect(mockCreateRelease).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      tag_name: 'v1.0.0',
      name: 'myRelease',
      body: 'myBody',
      draft: true,
      prerelease: false,
      target_commitish: 'sha'
    });
  });

  test('Pre-release release is created', async () => {
    mockGetInput
      .mockReturnValueOnce('refs/tags/v1.0.0')
      .mockReturnValueOnce('myRelease')
      .mockReturnValueOnce('myBody')
      .mockReturnValueOnce('false')
      .mockReturnValueOnce('true');

    await run();

    expect(mockCreateRelease).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      tag_name: 'v1.0.0',
      name: 'myRelease',
      body: 'myBody',
      draft: false,
      prerelease: true,
      target_commitish: 'sha'
    });
  });

  test('Release with empty body is created', async () => {
    mockGetInput
      .mockReturnValueOnce('refs/tags/v1.0.0')
      .mockReturnValueOnce('myRelease')
      .mockReturnValueOnce('') // default value for body in action.yml
      .mockReturnValueOnce('false')
      .mockReturnValueOnce('false');

    await run();

    expect(mockCreateRelease).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      tag_name: 'v1.0.0',
      name: 'myRelease',
      body: '',
      draft: false,
      prerelease: false,
      target_commitish: 'sha'
    });
  });

  test('Release body based on file', async () => {
    mockGetInput
      .mockReturnValueOnce('refs/tags/v1.0.0')
      .mockReturnValueOnce('myRelease')
      .mockReturnValueOnce('') // default value for body in action.yml
      .mockReturnValueOnce('false')
      .mockReturnValueOnce('false')
      .mockReturnValueOnce(null)
      .mockReturnValueOnce('notes.md');

    mockReadFileSync.mockReturnValueOnce('# this is a release\nThe markdown is strong in this one.');

    await run();

    expect(mockCreateRelease).toHaveBeenCalledWith({
      owner: 'owner',
      repo: 'repo',
      tag_name: 'v1.0.0',
      name: 'myRelease',
      body: '# this is a release\nThe markdown is strong in this one.',
      draft: false,
      prerelease: false,
      target_commitish: 'sha'
    });
  });

  test('Outputs are set', async () => {
    mockGetInput
      .mockReturnValueOnce('refs/tags/v1.0.0')
      .mockReturnValueOnce('myRelease')
      .mockReturnValueOnce('myBody')
      .mockReturnValueOnce('false')
      .mockReturnValueOnce('false');

    await run();

    expect(mockSetOutput).toHaveBeenNthCalledWith(1, 'id', 'releaseId');
    expect(mockSetOutput).toHaveBeenNthCalledWith(2, 'html_url', 'htmlUrl');
    expect(mockSetOutput).toHaveBeenNthCalledWith(3, 'upload_url', 'uploadUrl');
  });

  test('Action fails elegantly', async () => {
    mockGetInput
      .mockReturnValueOnce('refs/tags/v1.0.0')
      .mockReturnValueOnce('myRelease')
      .mockReturnValueOnce('myBody')
      .mockReturnValueOnce('false')
      .mockReturnValueOnce('false');

    mockCreateRelease.mockReset();
    mockCreateRelease.mockImplementation(() => {
      throw new Error('Error creating release');
    });

    await run();

    expect(mockCreateRelease).toHaveBeenCalled();
    expect(mockSetFailed).toHaveBeenCalledWith('Error creating release');
    expect(mockSetOutput).toHaveBeenCalledTimes(0);
  });
});
