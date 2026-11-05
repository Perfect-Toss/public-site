// semantic-release config. `.cjs` because package.json is `"type": "module"` and the commit parser
// needs real RegExp values, which JSON cannot express.

const parserOpts = {
  // Recognise `type(scope)!: subject` — the angular default rejects the `!` outright, which is why
  // a breaking change written that way used to be ignored entirely.
  headerPattern: /^(\w*)(?:\((.*)\))?!?: (.*)$/,
  breakingHeaderPattern: /^(\w*)(?:\((.*)\))?!: (.*)$/,
};

module.exports = {
  branches: ['main'],
  plugins: [
    [
      '@semantic-release/commit-analyzer',
      {
        // Custom rules replace the defaults, so every rule we care about is restated here.
        // The analyzer keeps the highest match per commit, so the catch-all cannot downgrade a feat.
        releaseRules: [
          { breaking: true, release: 'major' },
          { revert: true, release: 'patch' },
          { type: 'feat', release: 'minor' },
          { type: 'fix', release: 'patch' },
          { type: 'perf', release: 'patch' },
          // Catch-all: any message the rules above did not match still releases a patch.
          { release: 'patch' },
        ],
        parserOpts,
      },
    ],
    ['@semantic-release/release-notes-generator', { parserOpts }],
    ['@semantic-release/changelog', { changelogFile: 'CHANGELOG.md' }],
    '@semantic-release/npm',
    '@semantic-release/github',
    [
      '@semantic-release/git',
      {
        assets: ['package.json', 'package-lock.json', 'CHANGELOG.md'],
        message: 'chore(release): ${nextRelease.version}\n\n${nextRelease.notes}',
      },
    ],
  ],
};
