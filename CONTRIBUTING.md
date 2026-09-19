# Contributing to MaintainerShield

Thank you for helping improve MaintainerShield.

## Good first contributions

- Add a test case for a false positive.
- Improve a rule explanation.
- Add support for a common lockfile.
- Improve documentation.
- Add a language-specific heuristic.

## Development

The core is intentionally dependency-light and uses Node.js 20.

```bash
node --test
```

Please keep detection rules deterministic, explainable, and independently testable.

## Pull requests

A good PR should explain:
1. what maintainer problem it addresses;
2. what repository signal is used;
3. how false positives are handled;
4. what tests were added.
