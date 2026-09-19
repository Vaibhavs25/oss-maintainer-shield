# MaintainerShield

Open-source GitHub maintenance guardrails for busy maintainers.

MaintainerShield analyzes pull requests using transparent, deterministic checks and suggests possible duplicate issues. It is designed to reduce review noise without pretending that automation replaces human judgment.

## Why it exists

Maintainers spend scarce attention on repetitive repository work: oversized pull requests, missing tests, dependency churn, workflow changes, and duplicate issue reports.

MaintainerShield makes those signals visible in a small GitHub Action that is **LLM-free by default, vendor-neutral, and advisory-first**.

## Quick start

Create `.github/workflows/maintainer-shield.yml`:

```yaml
name: MaintainerShield

on:
  pull_request:
    types: [opened, synchronize, reopened]
  issues:
    types: [opened, reopened]

permissions:
  contents: read
  issues: write
  pull-requests: write

jobs:
  shield:
    runs-on: ubuntu-latest
    steps:
      - uses: Vaibhavs25/oss-maintainer-shield@main
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

For production use, pin the action to a reviewed release tag or commit SHA.

## Pull request checks

MaintainerShield currently checks:

- changed line and file counts;
- missing obvious test-file changes;
- dependency and lockfile changes;
- GitHub Actions workflow changes;
- generated/minified file churn.

The result is posted as a concise advisory comment and can also be consumed as JSON.

## Duplicate issue detection

For newly opened or reopened issues, MaintainerShield compares the issue against recent open issues using deterministic token similarity. It weights title overlap more heavily than body overlap.

Example:

```text
MaintainerShield — possible duplicate

#814 — CLI crashes while loading configuration — similarity 91%
#782 — Config loader crashes on startup — similarity 76%
```

It **suggests** duplicates; it does not close, label, or reject issues automatically.

## Configuration

Create `.maintainershield.json`:

```json
{
  "pr": {
    "largeChangeLines": 300,
    "veryLargeChangeLines": 700,
    "manyFiles": 15,
    "veryManyFiles": 30,
    "codeWithoutTests": 2,
    "dependencyChange": 1,
    "workflowChange": 2
  },
  "duplicate": {
    "threshold": 0.75,
    "titleWeight": 3,
    "maxIssues": 300
  }
}
```

The config is dependency-free JSON so the action stays lightweight.

## Outputs

The action can write `maintainer-shield.json` to the workspace and exposes GitHub Action outputs:

- `risk`
- `score`
- `changed-lines`
- `duplicate-count`

Downstream automation can consume JSON without parsing Markdown.

## Design principles

1. **Evidence over vibes.** Every flag should correspond to a repository signal.
2. **Advisory by default.** Don't punish contributors for an automated guess.
3. **Vendor neutral.** The core does not require an LLM.
4. **Low operational cost.** One workflow file is enough.
5. **Privacy conscious.** Only required GitHub metadata is inspected.
6. **Open benchmarks.** Future releases will publish reproducible benchmark cases.

## Roadmap

### v0.3 (next)
- release-tagged distribution and immutable-version guidance;
- configurable rule packs;
- stronger duplicate detection;
- OpenSSF/security-focused checks;
- benchmark dataset;
- reusable core package.

### Later
- optional Claude/OpenAI/local-model adapters;
- GitHub App;
- maintainer dashboard;
- ecosystem-wide benchmark;
- GitLab and Forgejo integrations.

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Good first contributions include false-positive tests, new lockfile patterns, language-specific test heuristics, and benchmark cases.

## License

Apache-2.0
