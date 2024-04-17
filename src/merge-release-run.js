#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import bent from 'bent';
import { simpleGit } from 'simple-git';
import { execSync as _execSync, spawnSync as _spawnSync } from 'child_process';

const git = simpleGit();

const debug = process.env.DEBUG?.toLowerCase() === 'true';
const disableGitTag = process.env.DISABLE_GIT_TAG?.toLowerCase() === 'true';
const minorTypes = process.env.MINOR_TYPES || 'feat';
const minorTypesRegex = new RegExp(`^(${minorTypes})`);
const majorTypes = process.env.MAJOR_TAGS ?? '';
const majorTypesRegex = new RegExp(`^(${majorTypes})`);

if (debug) {
  console.debug('Environment Variables:', process.env);
}

/**
 * @param {string} command
 * @param {import("child_process").SpawnSyncOptions} options
 * @returns {ReturnType<typeof _spawnSync>}
 */
function spawnSync(command, options) {
  if (debug) {
    console.debug(`Spawning process to run command: $ ${command}`);
  }

  const [cmd, ...args] = command.split(' ');
  const ret = _spawnSync(cmd, args, { stdio: 'inherit', ...options });

  if (ret.status) {
    console.error(ret);
    console.error(`Error: "${command}" returned non-zero exit code`);
    process.exit(ret.status);
  }

  return ret;
}

/**
 * @param {Parameters<typeof _execSync>[0]} command
 * @param {Parameters<typeof _execSync>[1]} options
 * @returns {ReturnType<typeof _execSync>}
 */
function execSync(command, options) {
  try {
    if (debug) {
      console.debug(`Running command: $ ${command}.`);
    }

    return _execSync(command, options);
  } catch (e) {
    console.error(`Failed to run command: $ ${command}`, e);
    throw e;
  }
}

/**
 * @param {string} version
 * @param {string} packageDir
 */
function setVersion(version, packageDir) {
  const json = execSync(`jq '.version="${version}"' package.json`, { cwd: packageDir });
  fs.writeFileSync(path.join(packageDir, 'package.json'), json);
}

/** @param {string} message */
function isMajorChange(message) {
  const firstLine = message.split(/\r?\n/)[0].toLowerCase();
  return !!(
    firstLine.includes('!:') ||
    message.includes('BREAKING CHANGE') ||
    message.includes('BREAKING-CHANGE') ||
    (majorTypes.length && majorTypesRegex.test(firstLine))
  );
}

/** @param {string} message */
function isMinorChange(message) {
  const firstLine = message.split(/\r?\n/)[0].toLowerCase();
  return minorTypesRegex.test(firstLine);
}

let registryUrl = process.env.NPM_REGISTRY_URL || 'https://registry.npmjs.org/';
if (!registryUrl.endsWith('/')) {
  registryUrl = `${registryUrl}/`;
}
const getFromRegistry = bent('json', registryUrl);
const event = JSON.parse(fs.readFileSync('/github/workflow/event.json').toString());
const deployDir = path.join(process.cwd(), process.env.DEPLOY_DIR || '.');
const srcPackageDir = path.join(process.cwd(), process.env.SRC_PACKAGE_DIR || '.');
const access = process.env.NPM_PRIVATE?.toLowerCase() === 'true' ? 'restricted' : 'public';

console.log('Configuration:');
if (debug) {
  console.log(`                       Debug Enabled: true`);
}
console.log(`                  Using registry url: ${registryUrl}`);
console.log(`              Using deploy directory: ${deployDir}`);
console.log(`  Using src directory (package.json): ${srcPackageDir}`);
console.log(`           Deploy to NPM with access: ${access}`);
console.log(`                         Git Tagging: ${disableGitTag ? 'Disabled' : 'Enabled'}`);
console.log(`                         Minor Types: ${minorTypes}`);
console.log(`                         Major Types: ${majorTypes}`);

async function run() {
  const pkg = JSON.parse(fs.readFileSync(path.join(deployDir, 'package.json')));

  if (!process.env.NPM_AUTH_TOKEN) {
    throw new Error('Merge-release requires NPM_AUTH_TOKEN');
  }

  let latest;

  try {
    const path = `${pkg.name}/latest`;
    if (debug) {
      console.debug(`Attempting to get the latest with path "${path}"`);
    }
    latest = await getFromRegistry(path);
    if (debug) {
      console.debug('Successfully retrieved latest:', { gitHead: latest.gitHead });
    }
  } catch (e) {
    // Unpublished
    if (debug) {
      console.debug('Failed to get the latest package. Error:', e);
    }
  }

  /** @type {string[] | undefined} */
  let messages;

  if (latest) {
    if (latest.gitHead === process.env.GITHUB_SHA) {
      console.log('SHA matches latest release, skipping.');
      return;
    }

    if (latest.gitHead) {
      if (debug) {
        console.debug('latest.gitHead is truthy');
      }

      try {
        const logs = await git.log({ from: latest.gitHead, to: process.env.GITHUB_SHA });
        if (debug) {
          console.debug('git logs retrieved:', logs);
        }

        messages = logs.all.map((r) => r.message + '\n' + r.body);
      } catch (e) {
        if (debug) {
          console.debug('git log failed. Error:', e);
        }
        latest = null;
      }
    } else {
      latest = null;
    }
  }

  // Re-check latest incase it was set to null above
  if (!latest) {
    if (debug) {
      console.debug('Log retrieval using latest failed, using event commits instead:', event.commits);
    }

    messages = (event.commits || []).map((commit) => `${commit.message}\n'${commit.body ?? ''}`);
  }

  if (debug) {
    console.debug('messages:', messages);
  }

  let incrementType = 'patch';
  if (messages.map(isMajorChange).includes(true)) {
    incrementType = 'major';
  } else if (messages.map(isMinorChange).includes(true)) {
    incrementType = 'minor';
  }

  if (debug) {
    console.debug('version incrementType type:', incrementType);
  }

  const currentVersion = execSync(`npm view ${pkg.name} version`, { cwd: srcPackageDir }).toString().trim();

  setVersion(currentVersion, srcPackageDir);
  if (srcPackageDir !== deployDir) {
    setVersion(currentVersion, deployDir);
  }

  console.log('Version Info:');
  console.log('   Current Version:', `v${currentVersion}`);
  console.log('   Version Increment Type:', incrementType);

  const newVersion = execSync(`npm version --git-tag-version=false ${incrementType}`, { cwd: srcPackageDir })
    .toString()
    .trim();

  setVersion(newVersion.slice(1), srcPackageDir);
  if (srcPackageDir !== deployDir) {
    setVersion(newVersion.slice(1), deployDir);
  }

  console.log('   New Version:', newVersion);

  if (pkg?.scripts?.publish) {
    spawnSync(`npm run publish`, { cwd: deployDir });
  } else {
    const verbose = debug ? ' --verbose' : '';
    spawnSync(`npm publish --access=${access}${verbose}`, { cwd: deployDir });
  }

  spawnSync('git restore .'); // Cleanup changes in the git workspace
  spawnSync(`echo "version=${newVersion}" >> "$GITHUB_OUTPUT"`, { shell: true });

  if (disableGitTag) {
    console.log('Git tagging disabled... Skipping');
  } else {
    spawnSync(`git tag ${newVersion}`);
    const remote = `https://${process.env.GITHUB_ACTOR}:${process.env.GITHUB_TOKEN}@github.com/${process.env.GITHUB_REPOSITORY}.git`;
    spawnSync(`git push ${remote} --tags`);
  }
}

run();
