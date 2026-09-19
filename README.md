# MaintainerShield

Open-source GitHub maintenance guardrails for busy maintainers.

MaintainerShield analyzes pull requests using transparent, deterministic checks and produces a concise maintainer-attention report. It is designed to reduce review noise without pretending that an automated score replaces human judgment.

## What it checks

- PR size and file-count changes
- presence of tests for code changes
- documentation changes for public-facing changes
- dependency and lockfile changes
- GitHub Actions workflow changes
- generated/minified file churn

The first release is deliberately **LLM-free**. AI providers can be added later through adapters without making the core dependent on a single vendor.

## Quick start

```yaml
name: MaintainerShield

on:
  pull_request:
    types: [opened, synchronize, reopened]

permissions:
  contents: read
  pull-requests: write

jobs:
  shield:
    runs-on: ubuntu-latest
    steps:
      - uses: Vaibhavs25/oss-maintainer-shield@v0.1.0
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
```

## Design principles

1. Evidence over vibes.
2. Advisory by default.
3. Vendor neutral.
4. Low operational cost.
5. Privacy conscious.
6. Open benchmarks.

## Roadmap

### v0.1
- PR size analysis
- test/documentation heuristics
- dependency/workflow detection
- markdown report
- unit tests

### v0.2
- duplicate issue suggestions
- configurable repository policy
- JSON output
- reusable core package

### v0.3
- OpenSSF/security-focused rules
- contributor-friendly explanations
- benchmark dataset

### Later
- optional AI adapters
- GitHub App
- maintainer dashboard
- ecosystem benchmark

## Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md).

## License

Apache-2.0
