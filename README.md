# ![LogoMakr-2ULBLV](https://github.com/Github-Actions-Community/merge-release/assets/3071208/bb7d9b4c-04bd-41c5-9c08-0ee5c91fa4a1)

<!-- ALL-CONTRIBUTORS-BADGE:START - Do not remove or modify this section -->

[![All Contributors](https://img.shields.io/badge/all_contributors-4-orange.svg?style=flat-square)](#contributors-)

<!-- ALL-CONTRIBUTORS-BADGE:END -->

GitHub Action for automated npm publishing.

This Action publishes a package to npm. It is meant to be used on every successful merge to main but
you'll need to configure that workflow yourself. You can look to the
[`.github/workflows/push.yml`](./.github/workflows/release.yml) file in this project as an example.

### Workflow

- Check for the latest version number published to npm.
- Lookup all commits between the git commit that triggered the action and the latest publish.
  - Note: The package needs to have an initial publish in order to pull the package details.
- Based on the commit messages, increment the version from the latest release.
  - If the strings "BREAKING CHANGE" is found anywhere in any of the commit messages, or "!:" is found in the first line or a commit message starts with one of the provided major tags (optional), then the major version will be incremented.
  - If a commit message begins with the string "feat" (or a tag in the minor tags list) then the minor version will be increased. This works for most common commit metadata for feature additions: `"feat: new API"` and `"feature: new API"`.
  - All other changes will increment the patch version.
- Publish to npm (or the provided registry url) using the configured token.
- Push a tag for the new version to GitHub.

### Configuration

You can configure some aspects of merge-release action by using the `with` properties on the action or passing some environmental variables.

- **GITHUB_TOKEN (required)**
  - Github token to allow tagging the version.
- **NPM_AUTH_TOKEN (required)**
  - NPM Auth Token to publish to the registry, read [here](https://docs.github.com/en/actions/configuring-and-managing-workflows/creating-and-storing-encrypted-secrets) how to setup it as a secret.
- **DEPLOY_DIR**
  - The path where the dist `package.json` is to run npm publish. Defaults to the root dir. This is a relative file path, relative to the root of the repo.
- **SRC_PACKAGE_DIR**
  - The path where the src `package.json` is found. Defaults to the root dir. This is a relative file path, relative to the root of the repo.
- **NPM_REGISTRY_URL**
  - NPM Registry URL to use. defaults to: `https://registry.npmjs.org/`. Set it to `https://npm.pkg.github.com` for GitHub Packages.
- **NPM_PRIVATE**
  - If you wish privately publish your package please ensure you have set this to `true`
- **DISABLE_GIT_TAG**
  - If you wish to skip setting the git tag, set this to `true`
- **MAJOR_TAGS**
  - A list of tags to check for when considering whether to perform a major version update. The value is a list separated by the `|` character. i.e. `major|my-major-tag`
- **MINOR_TAGS**
  - Override the list of tags to check for when considering whether to perform a minor version update. The value is a list separated by the `|` character. i.e. `feat|minor|my-minor-tag`

Note: `merge-release` will use `npm publish` by default; but if you've defined a `publish` script in your `package.json` it will use that instead.

## Examples

```yaml
- name: Publish to NPM
  uses: Github-Actions-Community/merge-release@main
  with:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    NPM_AUTH_TOKEN: ${{ secrets.NPM_AUTH_TOKEN }}
    DEPLOY_DIR: my/deploy/dir
    SRC_PACKAGE_DIR: my/src/package
```

```yaml
- name: Publish to GitHub Packages
  uses: Github-Actions-Community/merge-release@main
  with:
    GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    NPM_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
    NPM_REGISTRY_URL: https://npm.pkg.github.com/
    MINOR_TAGS: feat|docs
```

## Contributors ✨

Thanks goes to these wonderful people ([emoji key](https://allcontributors.org/docs/en/emoji-key)):

<!-- prettier-ignore-start -->
<!-- markdownlint-disable -->
<!-- ALL-CONTRIBUTORS-LIST:START - Do not remove or modify this section -->

<table>
  <tbody>
    <tr>
      <td align="center" valign="top" width="14.28%"><a href="http://mikealrogers.com"><img src="https://avatars.githubusercontent.com/u/579?v=4?s=100" width="100px;" alt="Mikeal Rogers"/><br /><sub><b>Mikeal Rogers</b></sub></a><br /><a href="https://github.com/Github-Actions-Community/merge-release/commits?author=mikeal" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://www.achingbrain.net"><img src="https://avatars.githubusercontent.com/u/665810?v=4?s=100" width="100px;" alt="Alex Potsides"/><br /><sub><b>Alex Potsides</b></sub></a><br /><a href="https://github.com/Github-Actions-Community/merge-release/commits?author=achingbrain" title="Documentation">📖</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://www.kanekotic.com"><img src="https://avatars.githubusercontent.com/u/3071208?v=4?s=100" width="100px;" alt="Alvaro Jose"/><br /><sub><b>Alvaro Jose</b></sub></a><br /><a href="https://github.com/Github-Actions-Community/merge-release/commits?author=kanekotic" title="Code">💻</a></td>
      <td align="center" valign="top" width="14.28%"><a href="http://jonjoe.io"><img src="https://avatars.githubusercontent.com/u/2996688?v=4?s=100" width="100px;" alt="Jonjoe Whitfield"/><br /><sub><b>Jonjoe Whitfield</b></sub></a><br /><a href="https://github.com/Github-Actions-Community/merge-release/commits?author=Jonjoe" title="Code">💻</a></td>
    </tr>
  </tbody>
</table>

<!-- ALL-CONTRIBUTORS-LIST:END -->
<!-- markdownlint-restore -->
<!-- prettier-ignore-end -->

This project follows the [all-contributors](https://github.com/all-contributors/all-contributors) specification. Contributions of any kind welcome!

##### Created my free [logo](https://logomakr.com/5sISSS) at [LogoMakr.com](LogoMakr.com)
