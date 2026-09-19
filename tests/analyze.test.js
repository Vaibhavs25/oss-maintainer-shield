const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

const {
  analyze,
  duplicateScore,
  findDuplicateIssues,
  renderPrMarkdown,
  DEFAULT_CONFIG
} = require("../src/index.js");

test("high-risk PRs are explainable", () => {
  const result = analyze(
    [
      { filename: "src/a.js", additions: 400, deletions: 50 },
      { filename: "package-lock.json", additions: 20, deletions: 5 },
      { filename: ".github/workflows/release.yml", additions: 10, deletions: 2 }
    ],
    DEFAULT_CONFIG
  );

  assert.equal(result.risk, "HIGH");
  assert.ok(result.reasons.length >= 2);
});

test("tests are recognized as a positive signal", () => {
  const result = analyze(
    [
      { filename: "src/a.js", additions: 25, deletions: 5 },
      { filename: "tests/a.test.js", additions: 15, deletions: 0 }
    ],
    DEFAULT_CONFIG
  );

  assert.match(result.signals.join("\n"), /Tests touched/i);
});

test("similar issues receive a high duplicate score", () => {
  const current = {
    number: 10,
    title: "CLI crashes when loading config file",
    body: "The command crashes while loading the configuration file on startup."
  };

  const candidate = {
    number: 4,
    title: "CLI crashes while loading config",
    body: "The command crashes when the configuration file is loaded on startup."
  };

  assert.ok(duplicateScore(current, candidate, DEFAULT_CONFIG) >= 0.72);
});

test("duplicate detector ranks likely duplicates first", () => {
  const current = {
    number: 10,
    title: "CLI crashes when loading config",
    body: "Configuration loading crashes the command."
  };

  const issues = [
    { number: 1, title: "Add Docker docs", body: "Documentation for containers." },
    { number: 2, title: "CLI crashes while loading configuration", body: "Configuration loading crashes the CLI.", html_url: "https://example.com/2" }
  ];

  const result = findDuplicateIssues(current, issues, DEFAULT_CONFIG);
  assert.equal(result[0].issue.number, 2);
});

test("PR reports include a stable marker for idempotent comments", () => {
  const markdown = renderPrMarkdown(analyze(
    [{ filename: "README.md", additions: 3, deletions: 0 }],
    DEFAULT_CONFIG
  ));
  assert.match(markdown, /<!-- maintainer-shield-report -->/);
  assert.match(markdown, /MaintainerShield v0\.2\.2/);
});

test("action file documents a GitHub token input", () => {
  const action = fs.readFileSync("action.yml", "utf8");
  assert.match(action, /github-token:/);
});
