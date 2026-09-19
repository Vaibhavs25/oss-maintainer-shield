# Contributing to MaintainerShield

The most valuable contributions are practical maintainer cases: false positives, missed duplicates, new repository conventions, and security-sensitive workflow examples.

## Good first contributions

- Add a regression test for a false positive.
- Improve a rule explanation.
- Add support for a common lockfile.
- Add a language-specific test convention.
- Add a benchmark case.

## Development

The project is dependency-light and uses Node.js 20.

```bash
node --test
```

Keep detection rules deterministic, explainable, and independently testable.

## Pull requests

A good PR should explain:

1. the maintainer problem it addresses;
2. the repository signal used;
3. expected false positives and false negatives;
4. tests or benchmark cases added.

Please don't add an LLM dependency to the core analyzer. Provider-specific logic belongs behind an adapter.
