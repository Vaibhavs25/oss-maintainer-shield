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

## Verified maintainer contacts

These are documented maintainers/owners for the first outreach pass, verified on 2026-09-19:

| Repository | Maintainer / owner | GitHub handle | Contact route |
|---|---|---|---|
| ag2ai/ag2 | Qingyun Wu; Chi Wang | @qingyun-wu; @sonichi | Project README lists project administrators and `support@ag2.ai` |
| DefectDojo/django-DefectDojo | Greg Anderson; Matt Tesauro | @devGregA; @mtesauro | Repository README identifies both as maintainers |
| parca-dev/parca | Frederic Branczyk; Matthias Loibl | @brancz; @metalmatze | Repository `MAINTAINERS.md` identifies maintainers; project also lists `parca-team@googlegroups.com` |
| tobymao/sqlglot | Toby Mao | @tobymao | Repository is owned by `tobymao`; public project contact is available through the repository |

Use the documented project contact route where one exists. Do not mass-message every listed maintainer; start with one relevant contact per project and personalize the message around a concrete maintenance problem MaintainerShield addresses.

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
      - uses: Vaibhavs25/oss-maintainer-shield@<reviewed-release-tag-or-commit-sha>
        with:
          github-token: \${{ secrets.GITHUB_TOKEN }}
```

For beta testing and production use, pin the Action to a reviewed release tag or commit SHA rather than tracking `main`.

## What we want to learn

- Did the PR signals save review time?
- Which duplicate-issue suggestions were useful or wrong?
- What false positives or false negatives did you encounter?
- What repository conventions should the default rules understand?

## What to report

Please report concrete false positives, false negatives, duplicate suggestions that are incorrect, or repository-specific conventions the defaults miss.

Include the event type (`pull_request` or `issues`) and, where relevant, the rule or signal that fired.

## Scope and expectations

MaintainerShield is advisory. It does not replace human review and does not block contributors by default.

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
