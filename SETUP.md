# MaintainerShield — Setup

## 1. Enable the Action

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

The current implementation posts reports as GitHub conversation comments, so the documented setup uses `issues: write` and `pull-requests: write`.

## 2. Test

Open a pull request. MaintainerShield should run and post an advisory report.

Open a test issue. It should compare the issue against recent open issues and suggest likely duplicates when the similarity threshold is reached.

## 3. Configure

Add `.maintainershield.json` to the target repository to tune thresholds.

## 4. Local development

Requires Node.js 20.

```bash
node --test
```
