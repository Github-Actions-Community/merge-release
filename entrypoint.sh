#!/bin/sh

set -e

# Map the GitHub actions inputs over to the environment variables and export them to support both `env` and `with` methods for backwards-compatibility
export GITHUB_TOKEN="${INPUT_GITHUB_TOKEN:-"$GITHUB_TOKEN"}"
export NPM_AUTH_TOKEN="${INPUT_NPM_AUTH_TOKEN:-"$NPM_AUTH_TOKEN"}"
export NPM_PRIVATE="${INPUT_NPM_PRIVATE:-"$NPM_PRIVATE"}"
export DEPLOY_DIR="${INPUT_DEPLOY_DIR:-"$DEPLOY_DIR"}"
export SRC_PACKAGE_DIR="${INPUT_SRC_PACKAGE_DIR:-"$SRC_PACKAGE_DIR"}"
export NPM_REGISTRY_URL="${INPUT_NPM_REGISTRY_URL:-"$NPM_REGISTRY_URL"}"
export MINOR_TYPES="${INPUT_MINOR_TYPES:-"$MINOR_TYPES"}"
export MAJOR_TYPES="${INPUT_MAJOR_TYPES:-"$MAJOR_TYPES"}"
export DISABLE_GIT_TAG="${INPUT_DISABLE_GIT_TAG:-"$DISABLE_GIT_TAG"}"
export DEBUG="${INPUT_DEBUG:-"$DEBUG"}"
export GIT_TAG_SUFFIX="${INPUT_GIT_TAG_SUFFIX:-"$GIT_TAG_SUFFIX"}"
export GITHUB_SHA="${INPUT_GITHUB_SHA:-"$GITHUB_SHA"}"
export GITHUB_ACTOR="${INPUT_GITHUB_ACTOR:-"$GITHUB_ACTOR"}"
export GITHUB_REPOSITORY="${INPUT_GITHUB_REPOSITORY:-"$GITHUB_REPOSITORY"}"
export NPM_CONFIG_USERCONFIG="${INPUT_NPM_CONFIG_USERCONFIG:-"$NPM_CONFIG_USERCONFIG"}"
export NPM_CUSTOM_NPMRC="${INPUT_NPM_CUSTOM_NPMRC:-"$NPM_CUSTOM_NPMRC"}"
export NPM_STRICT_SSL="${INPUT_NPM_STRICT_SSL:-"$NPM_STRICT_SSL"}"

# Set default values
NPM_STRICT_SSL="${NPM_STRICT_SSL:-"true"}"
NPM_REGISTRY_SCHEME="https"
if ! [ "$NPM_STRICT_SSL" = "true" ]; then NPM_REGISTRY_SCHEME="http"; fi
NPM_REGISTRY_DOMAIN="$(echo "${NPM_REGISTRY_URL:-registry.npmjs.org}" | sed -r 's/https?:\/\///' | sed -r 's/\/+$//')"
NPM_REGISTRY_URL="${NPM_REGISTRY_SCHEME}://$NPM_REGISTRY_DOMAIN"
NPM_CONFIG_USERCONFIG="${NPM_CONFIG_USERCONFIG:-"$HOME/.npmrc"}"

if [ "$DEBUG" = "true" ]; then
  echo "Debug Enabled, Printing Environment:"
  printenv
  echo ""
fi

if [ -n "$NPM_CUSTOM_NPMRC" ]; then
  # Use a fully-formed npmrc file if provided
  echo "$NPM_CUSTOM_NPMRC" > "$NPM_CONFIG_USERCONFIG"
  chmod 0600 "$NPM_CONFIG_USERCONFIG"
elif [ -n "$NPM_AUTH_TOKEN" ]; then
  printf "//%s/:_authToken=%s\\nregistry=%s\\nstrict-ssl=%s" "$NPM_REGISTRY_DOMAIN" "$NPM_AUTH_TOKEN" "${NPM_REGISTRY_URL}/" "$NPM_STRICT_SSL" > "$NPM_CONFIG_USERCONFIG"
  chmod 0600 "$NPM_CONFIG_USERCONFIG"
fi

if [ "$DEBUG" = "true" ]; then
  echo "Debug Enabled, Printing user .npmrc file '$NPM_CONFIG_USERCONFIG' contents:"
  cat "$NPM_CONFIG_USERCONFIG"
  echo "\n"
fi

# initialize git
remote_repo="https://${GITHUB_ACTOR}:${GITHUB_TOKEN}@github.com/${GITHUB_REPOSITORY}.git"
git config --global --add safe.directory "/github/workspace"
git config http.sslVerify false
git config user.name "Merge Release"
git config user.email "actions@users.noreply.github.com"
git remote add merge-release "${remote_repo}"
git remote --verbose
git show-ref # useful for debugging
git branch --verbose

# Dependencies are installed at build time
node /src/merge-release-run.js "$@" || exit 1
