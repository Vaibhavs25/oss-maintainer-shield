# Adoption Playbook

MaintainerShield grows through real use in repositories that have active maintenance queues.

## First-wave targets

| Repository | Why it fits | Recent activity observed |
|---|---|---|
| ag2ai/ag2 | Active AI/agent project with both PR and issue traffic | 10 open PR results + 8 open issue results updated since 2026-08-19 |
| Agenta-AI/agenta | AI platform with frequent bugs and release work | 10 + 10 |
| DefectDojo/django-DefectDojo | Large security project with dependency and workflow activity | 10 + 10 |
| parca-dev/parca | Active systems/observability project with dependency PRs | 10 + 1 |
| apache/iggy | Apache project with connector/feature PR flow | 10 + 10 |
| agentgateway/agentgateway | Fast-moving gateway project with policy/config changes | 10 + 10 |
| boto/boto3 | Widely used Python SDK with dependency/documentation PRs | 5 + 5 |
| tobymao/sqlglot | Active parser/compiler library with semantic bug reports | 5 + 4 |
| Kozea/WeasyPrint | Mature Python project with active fixes | 5 + 5 |
| webdriverio/webdriverio | Large JavaScript automation project with active bugfix queue | 5 + 5 |
| SeaQL/sea-orm | Active Rust database library with feature/bug traffic | 5 + 5 |
| reviewdog/reviewdog | GitHub/CI-focused project directly adjacent to MaintainerShield | 4 + 4 |

These counts are search snapshots, not claims about total project activity.

## Outreach rule

Do not open promotional issues in repositories just to advertise MaintainerShield.

Prefer:
1. a maintainer's documented contact channel;
2. GitHub Discussions when the project explicitly welcomes tool announcements;
3. a relevant community forum;
4. a direct, personalized message to a maintainer who has public contact information.

Only send one message initially. Follow up only when appropriate.

## Personalize the message

Reference one concrete repository signal:

- active dependency PRs → emphasize dependency/workflow review signals;
- many bug reports → emphasize duplicate issue suggestions;
- large feature PRs → emphasize change-size and missing-test signals;
- CI-heavy project → emphasize JSON outputs and GitHub Action integration.

## Beta setup

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
          github-token: \${{ secrets.GITHUB_TOKEN }}
```

## What to record

For each external adopter, record only facts they are comfortable sharing:

- repository name;
- date installed;
- Action version/ref;
- number of PRs/issues evaluated;
- useful detections;
- false positives;
- fixes contributed;
- whether the maintainer wants their repository listed as an adopter.

Never invent adoption numbers.

## Adoption milestones

### Milestone A
3 external repositories using the Action.

### Milestone B
10 external repositories.

### Milestone C
20+ unique external contributors with merged PRs, or meaningful downstream dependency/adoption.

These are project-growth milestones, not guarantees of eligibility for any program.
