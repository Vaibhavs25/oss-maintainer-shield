const fs = require("node:fs");

const EVENT_PATH = process.env.GITHUB_EVENT_PATH;
const TOKEN = process.env.INPUT_GITHUB_TOKEN || process.env.GITHUB_TOKEN;
const FAIL_ON_HIGH = (process.env.INPUT_FAIL_ON_HIGH || "false").toLowerCase() === "true";

function required(value, name) {
  if (!value) throw new Error(`Missing required value: ${name}`);
  return value;
}

function readEvent() {
  required(EVENT_PATH, "GITHUB_EVENT_PATH");
  return JSON.parse(fs.readFileSync(EVENT_PATH, "utf8"));
}

async function github(path, options = {}) {
  const response = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${TOKEN}`,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers || {}),
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub API ${response.status}: ${await response.text()}`);
  }
  return response.json();
}

function analyze(files) {
  let score = 0;
  let additions = 0;
  let deletions = 0;
  let codeFiles = 0;
  let testFiles = 0;
  let docFiles = 0;
  let dependencyFiles = 0;
  let workflowFiles = 0;
  let generatedFiles = 0;
  const reasons = [];
  const signals = [];

  const testPattern = /(^|\/)(test|tests|__tests__|spec|specs)(\/|$)|\.(test|spec)\./i;
  const docPattern = /(^|\/)(readme|docs?|documentation)(\/|$)|\.(md|mdx|rst|txt)$/i;
  const dependencyPattern = /(^|\/)(package-lock\.json|npm-shrinkwrap\.json|yarn\.lock|pnpm-lock\.yaml|poetry\.lock|uv\.lock|Cargo\.lock|Gemfile\.lock|go\.sum|composer\.lock)$/i;
  const workflowPattern = /^\.github\/workflows\//i;
  const generatedPattern = /(^|\/)(dist|build|coverage|vendor|generated)(\/|$)|\.(min|bundle)\.(js|css)$/i;

  for (const file of files) {
    additions += Number(file.additions || 0);
    deletions += Number(file.deletions || 0);
    const name = file.filename || "";

    if (testPattern.test(name)) testFiles++;
    if (docPattern.test(name)) docFiles++;
    if (dependencyPattern.test(name)) dependencyFiles++;
    if (workflowPattern.test(name)) workflowFiles++;
    if (generatedPattern.test(name)) generatedFiles++;

    if (!testPattern.test(name) && !docPattern.test(name) && !generatedPattern.test(name)) {
      codeFiles++;
    }
  }

  const changedLines = additions + deletions;

  if (changedLines > 500) {
    score += 3;
    reasons.push(`Large change: ${changedLines} changed lines`);
  } else if (changedLines > 250) {
    score += 2;
    reasons.push(`Moderately large change: ${changedLines} changed lines`);
  } else if (changedLines > 100) {
    score += 1;
    reasons.push(`Non-trivial change: ${changedLines} changed lines`);
  }

  if (files.length > 20) {
    score += 2;
    reasons.push(`Many files changed: ${files.length}`);
  } else if (files.length > 10) {
    score += 1;
    reasons.push(`Several files changed: ${files.length}`);
  }

  if (codeFiles > 0 && testFiles === 0) {
    score += 2;
    reasons.push("Code changed without an obvious test-file change");
  }

  if (dependencyFiles > 0) {
    score += 1;
    reasons.push("Dependency or lockfile changes detected");
  }

  if (workflowFiles > 0) {
    score += 1;
    reasons.push("GitHub Actions workflow changes detected");
  }

  if (generatedFiles > 0) signals.push(`Generated/build artifacts changed: ${generatedFiles}`);
  if (docFiles > 0) signals.push(`Documentation touched: ${docFiles} file(s)`);
  if (testFiles > 0) signals.push(`Tests touched: ${testFiles} file(s)`);

  const risk = score >= 6 ? "HIGH" : score >= 3 ? "MEDIUM" : "LOW";
  const attention = risk === "HIGH" ? "REQUIRED" : risk === "MEDIUM" ? "RECOMMENDED" : "ROUTINE";

  return { risk, attention, score, additions, deletions, changedLines, fileCount: files.length, reasons, signals };
}

function markdown(result) {
  const reasons = result.reasons.length
    ? result.reasons.map(x => `- ${x}`).join("\n")
    : "- No elevated-risk signals detected by the default rules.";
  const signals = result.signals.length
    ? result.signals.map(x => `- ${x}`).join("\n")
    : "- No additional repository signals.";

  return [
    "## MaintainerShield",
    "",
    `**Risk:** ${result.risk}  `,
    `**Maintainer attention:** ${result.attention}`,
    "",
    `**Changed lines:** ${result.changedLines} (+${result.additions} / -${result.deletions})  `,
    `**Changed files:** ${result.fileCount}`,
    "",
    "### Why this PR was flagged",
    reasons,
    "",
    "### Positive signals",
    signals,
    "",
    "> Advisory only. MaintainerShield does not replace human review and does not block contributors by default.",
  ].join("\n");
}

async function main() {
  if (!TOKEN) throw new Error("GITHUB_TOKEN/input github-token is required.");

  const event = readEvent();
  const repo = required(process.env.GITHUB_REPOSITORY, "GITHUB_REPOSITORY");
  const [owner, repoName] = repo.split("/");
  const pr = event.pull_request;

  if (!pr) {
    console.log("MaintainerShield currently expects a pull_request event.");
    return;
  }

  const files = await github(`/repos/${owner}/${repoName}/pulls/${pr.number}/files?per_page=100`);
  const result = analyze(files);
  const body = markdown(result);

  await github(`/repos/${owner}/${repoName}/issues/${pr.number}/comments`, {
    method: "POST",
    body: JSON.stringify({ body }),
    headers: { "Content-Type": "application/json" },
  });

  console.log(JSON.stringify(result, null, 2));

  if (FAIL_ON_HIGH && result.risk === "HIGH") process.exitCode = 1;
}

main().catch(error => {
  console.error(error.stack || error.message || error);
  process.exitCode = 1;
});
