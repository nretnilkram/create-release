import * as core from '@actions/core';
import { getOctokit, context } from '@actions/github';
import { readFileSync } from 'node:fs';

async function run() {
  try {
    const octokit = new getOctokit(process.env.GITHUB_TOKEN);

    const { owner: currentOwner, repo: currentRepo } = context.repo;

    const tagName = core.getInput('tag_name', { required: true });

    const tag = tagName.replace('refs/tags/', '');
    const releaseName = core.getInput('release_name', { required: false }).replace('refs/tags/', '');
    const body = core.getInput('body', { required: false });
    const draft = core.getInput('draft', { required: false }) === 'true';
    const prerelease = core.getInput('prerelease', { required: false }) === 'true';
    const commitish = core.getInput('commitish', { required: false }) || context.sha;

    const bodyPath = core.getInput('body_path', { required: false });
    const owner = core.getInput('owner', { required: false }) || currentOwner;
    const repo = core.getInput('repo', { required: false }) || currentRepo;
    let bodyFileContent = null;
    if (bodyPath !== '' && !!bodyPath) {
      try {
        bodyFileContent = readFileSync(bodyPath, { encoding: 'utf8' });
      } catch (error) {
        core.setFailed(error.message);
      }
    }

    const createReleaseResponse = await octokit.rest.repos.createRelease({
      owner,
      repo,
      tag_name: tag,
      name: releaseName,
      body: bodyFileContent || body,
      draft,
      prerelease,
      target_commitish: commitish
    });

    const {
      data: { id: releaseId, html_url: htmlUrl, upload_url: uploadUrl }
    } = createReleaseResponse;

    core.setOutput('id', releaseId);
    core.setOutput('html_url', htmlUrl);
    core.setOutput('upload_url', uploadUrl);
  } catch (error) {
    core.setFailed(error.message);
  }
}

export default run;
