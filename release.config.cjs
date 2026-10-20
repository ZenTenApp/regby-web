/**
 * semantic-release config. `.github/workflows/deploy.yml` runs this twice in
 * one job: first with `dry_run` to compute the next version (and decide whether
 * anything ships at all), then for real to tag and publish. Both loads use this
 * same plugin set; semantic-release verifies branch push access even in a dry
 * run, so there is no lighter read-only variant to select.
 *
 * `.cjs`, not `.js`: package.json declares `"type": "module"`, and
 * semantic-release loads a bare `release.config.js` as CommonJS.
 */
module.exports = {
  branches: ['main'],
  plugins: [
    '@semantic-release/commit-analyzer',
    '@semantic-release/release-notes-generator',
    [
      '@semantic-release/changelog',
      {
        changelogFile: 'CHANGELOG.md',
        changelogTitle:
          '# Changelog\n\nAll notable changes to this project are documented here.\n\nFormat follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versioning follows [Semantic Versioning](https://semver.org/spec/v2.0.0.html).',
      },
    ],
    // Version bump only. The package is private and never goes to a registry.
    ['@semantic-release/npm', { npmPublish: false }],
    [
      '@semantic-release/github',
      {
        // The exact bundle uploaded to regby.nostr.box, so a release can be
        // re-served or diffed against the live site without a rebuild.
        assets: [{ path: 'regby-web-v*.tar.gz', label: 'Static bundle (dist/)' }],
        successComment: false,
        failComment: false,
      },
    ],
    [
      '@semantic-release/git',
      {
        assets: ['CHANGELOG.md', 'package.json', 'package-lock.json'],
        message: 'chore(release): ${nextRelease.version} [skip ci]\n\n${nextRelease.notes}',
      },
    ],
  ],
};
