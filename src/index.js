const fs = require("node:fs");
const path = require("node:path");

function input(name) {
  const key = "INPUT_" + String(name).replace(/ /g, "_").toUpperCase();
  return process.env[key] || "";
}

const EVENT_PATH = process.env.GITHUB_EVENT_PATH;
const REPORT_MARKER = "<!-- maintainer-shield-report -->";
const TOKEN = input("github-token") || process.env.GITHUB_TOKEN;

const DEFAULT_CONFIG = {
  pr: {
    largeChangeLines: 250,
    veryLargeChangeLines: 500,
    manyFiles: 10,
    veryManyFiles: 20,
    codeWithoutTests: 2,
    dependencyChange: 1,
    workflowChange: 1
  },
  duplicate: {
    threshold: 0.72,
    titleWeight: 2,
    maxIssues: 300
  }
};

const STOPWORDS = new Set(
  "a an and are as at be been being by can could did do does for from had has have how i if in is it its of on or our should that the their them then there this to was were what when where which who why will while with you your".split(" ")
);

function readBoolean(value, fallback) {
  if (value == null || value === "") return fallback;
  return String(value).toLowerCase() === "true";
}

function required(value, name) {
  if (!value) throw new Error("Missing required value: " + name);
  return value;
}

function readEvent() {
  required(EVENT_PATH, "GITHUB_EVENT_PATH");
  return JSON.parse(fs.readFileSync(EVENT_PATH, "utf8"));
}

function mergeConfig(userConfig) {
  return {
    ...DEFAULT_CONFIG,
    ...userConfig,
    pr: { ...DEFAULT_CONFIG.pr, ...(userConfig.pr || {}) },
    duplicate: { ...DEFAULT_CONFIG.duplicate, ...(userConfig.duplicate || {}) }
  };
}

function loadConfig() {
  const configPath = input("config") || ".maintainershield.json";
  if (!configPath || !fs.existsSync(configPath)) return structuredClone(DEFAULT_CONFIG);

  const raw = fs.readFileSync(configPath, "utf8").trim();
  if (!raw) return structuredClone(DEFAULT_CONFIG);

  try {
    return mergeConfig(JSON.parse(raw));
  } catch (error) {
    throw new Error("Invalid MaintainerShield JSON config at " + configPath + ": " + error.message);
  }
}

async function github(apiPath, options) {
  const response = await fetch("https://api.github.com" + apiPath, {
    ...(options || {}),
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: "Bearer " + TOKEN,
      "X-GitHub-Api-Version": "2022-11-28",
      ...((options && options.headers) || {})
    }
  });

  if (!response.ok) {
    throw new Error("GitHub API " + response.status + ": " + await response.text());
  }

  return response.json();
}

async function githubPaged(apiPath, maxPages) {
  const results = [];
  const pages = maxPages || 10;

  for (let page = 1; page <= pages; page++) {
    const separator = apiPath.includes("?") ? "&" : "?";
    const pageItems = await github(apiPath + separator + "per_page=100&page=" + page);
    if (!Array.isArray(pageItems) || pageItems.length === 0) break;
    results.push(...pageItems);
    if (pageItems.length < 100) break;
  }

  return results;
}

function analyze(files, config) {
  const rules = config || DEFAULT_CONFIG;
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

  const dependencyNames = new Set([
    "package-lock.json",
    "npm-shrinkwrap.json",
    "yarn.lock",
    "pnpm-lock.yaml",
    "poetry.lock",
    "uv.lock",
    "cargo.lock",
    "gemfile.lock",
    "go.sum",
    "composer.lock"
  ]);
  const testDirectoryNames = new Set(["test", "tests", "__tests__", "spec", "specs"]);
  const docDirectoryNames = new Set(["readme", "docs", "doc", "documentation"]);
  const generatedDirectoryNames = new Set(["dist", "build", "coverage", "vendor", "generated"]);

  function fileSignals(name) {
    const parts = name.toLowerCase().split("/");
    const base = parts[parts.length - 1];
    return {
      isTest: parts.some(part => testDirectoryNames.has(part)) || /\.(test|spec)\./i.test(base),
      isDoc: parts.some(part => docDirectoryNames.has(part)) || /\.(md|mdx|rst|txt)$/i.test(base),
      isDependency: dependencyNames.has(base),
      isWorkflow: name.toLowerCase().startsWith(".github/workflows/"),
      isGenerated: parts.some(part => generatedDirectoryNames.has(part)) || /\.(min|bundle)\.(js|css)$/i.test(base)
    };
  }

  for (const file of files) {
    additions += Number(file.additions || 0);
    deletions += Number(file.deletions || 0);
    const name = file.filename || "";

    const flags = fileSignals(name);
    if (flags.isTest) testFiles++;
    if (flags.isDoc) docFiles++;
    if (flags.isDependency) dependencyFiles++;
    if (flags.isWorkflow) workflowFiles++;
    if (flags.isGenerated) generatedFiles++;

    if (!flags.isTest && !flags.isDoc && !flags.isGenerated) {
      codeFiles++;
    }
  }

  const changedLines = additions + deletions;

  if (changedLines > rules.pr.veryLargeChangeLines) {
    score += 3;
    reasons.push("Very large change: " + changedLines + " changed lines");
  } else if (changedLines > rules.pr.largeChangeLines) {
    score += 2;
    reasons.push("Large change: " + changedLines + " changed lines");
  } else if (changedLines > 100) {
    score += 1;
    reasons.push("Non-trivial change: " + changedLines + " changed lines");
  }

  if (files.length > rules.pr.veryManyFiles) {
    score += 2;
    reasons.push("Many files changed: " + files.length);
  } else if (files.length > rules.pr.manyFiles) {
    score += 1;
    reasons.push("Several files changed: " + files.length);
  }

  if (codeFiles > 0 && testFiles === 0) {
    score += rules.pr.codeWithoutTests;
    reasons.push("Code changed without an obvious test-file change");
  }

  if (dependencyFiles > 0) {
    score += rules.pr.dependencyChange;
    reasons.push("Dependency or lockfile changes detected");
  }

  if (workflowFiles > 0) {
    score += rules.pr.workflowChange;
    reasons.push("GitHub Actions workflow changes detected");
  }

  if (generatedFiles > 0) signals.push("Generated/build artifacts changed: " + generatedFiles);
  if (docFiles > 0) signals.push("Documentation touched: " + docFiles + " file(s)");
  if (testFiles > 0) signals.push("Tests touched: " + testFiles + " file(s)");

  const risk = score >= 6 ? "HIGH" : score >= 3 ? "MEDIUM" : "LOW";
  const attention = risk === "HIGH" ? "REQUIRED" : risk === "MEDIUM" ? "RECOMMENDED" : "ROUTINE";

  return {
    type: "pull_request",
    version: "0.2.2",
    risk,
    attention,
    score,
    additions,
    deletions,
    changedLines,
    fileCount: files.length,
    reasons,
    signals
  };
}

function normalizeText(text) {
  return String(text || "")
    .toLowerCase()
    
    .replace(/[^a-z0-9_]+/g, " ")
    .split(/\s+/)
    .filter(token => token.length >= 3 && !STOPWORDS.has(token));
}

function tokenSet(text) {
  return new Set(normalizeText(text));
}

function cosineSimilarity(a, b) {
  const left = normalizeText(a);
  const right = normalizeText(b);
  if (left.length === 0 || right.length === 0) return 0;

  const leftCounts = new Map();
  const rightCounts = new Map();

  for (const token of left) leftCounts.set(token, (leftCounts.get(token) || 0) + 1);
  for (const token of right) rightCounts.set(token, (rightCounts.get(token) || 0) + 1);

  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;

  for (const count of leftCounts.values()) leftNorm += count * count;
  for (const count of rightCounts.values()) rightNorm += count * count;

  for (const [token, count] of leftCounts) {
    dot += count * (rightCounts.get(token) || 0);
  }

  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm));
}

function jaccard(a, b) {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const token of a) {
    if (b.has(token)) intersection++;
  }
  return intersection / (a.size + b.size - intersection);
}

function duplicateScore(current, candidate, config) {
  const titleScore = cosineSimilarity(current.title, candidate.title);
  const bodyScore = cosineSimilarity(current.body || "", candidate.body || "");
  const titleWeight = Number((config || DEFAULT_CONFIG).duplicate.titleWeight) || 2;
  return (titleWeight * titleScore + bodyScore) / (titleWeight + 1);
}

function findDuplicateIssues(current, issues, config) {
  const settings = config || DEFAULT_CONFIG;
  const threshold = Number(settings.duplicate.threshold) || DEFAULT_CONFIG.duplicate.threshold;

  return issues
    .filter(issue => issue.number !== current.number && !issue.pull_request)
    .map(issue => ({
      issue: {
        number: issue.number,
        title: issue.title,
        url: issue.html_url
      },
      similarity: Number(duplicateScore(current, issue, settings).toFixed(3))
    }))
    .filter(result => result.similarity >= threshold)
    .sort((a, b) => b.similarity - a.similarity);
}

function renderPrMarkdown(result) {
  const reasons = result.reasons.length
    ? result.reasons.map(x => "- " + x).join("\\n")
    : "- No elevated-risk signals detected by the default rules.";

  const signals = result.signals.length
    ? result.signals.map(x => "- " + x).join("\\n")
    : "- No additional repository signals.";

  return [
    REPORT_MARKER,
    "## MaintainerShield",
    "",
    "**Risk:** " + result.risk + "  ",
    "**Maintainer attention:** " + result.attention,
    "",
    "**Changed lines:** " + result.changedLines + " (+" + result.additions + " / -" + result.deletions + ")  ",
    "**Changed files:** " + result.fileCount,
    "",
    "### Why this PR was flagged",
    reasons,
    "",
    "### Positive signals",
    signals,
    "",
    "> Advisory only. MaintainerShield does not replace human review and does not block contributors by default.",
    "",
    "<sub>MaintainerShield v0.2.2</sub>"
  ].join("\\n");
}

function renderDuplicateMarkdown(duplicates) {
  const top = duplicates.slice(0, 3);
  const lines = top.map(item =>
    "- [#" + item.issue.number + " — " + item.issue.title + "](" + item.issue.url + ") — similarity " +
    Math.round(item.similarity * 100) + "%"
  );

  return [
    REPORT_MARKER,
    "## MaintainerShield — possible duplicate",
    "",
    "This issue looks similar to one or more existing open issues.",
    "",
    ...lines,
    "",
    "Please check the existing issues before opening another report. This is a suggestion, not an automatic decision.",
    "",
    "<sub>MaintainerShield v0.2.2</sub>"
  ].join("\\n");
}

function writeOutputFile(payload) {
  const outputPath = input("output-json") || "maintainer-shield.json";
  if (!outputPath) return null;

  const absolute = path.resolve(outputPath);
  fs.writeFileSync(absolute, JSON.stringify(payload, null, 2) + "\\n", "utf8");
  return absolute;
}

function setGithubOutput(name, value) {
  const outputFile = process.env.GITHUB_OUTPUT;
  if (!outputFile) return;

  fs.appendFileSync(
    outputFile,
    name + "=" + String(value) + "\n",
    "utf8"
  );
}

function setStepSummary(markdown) {
  const summaryFile = process.env.GITHUB_STEP_SUMMARY;
  if (summaryFile) fs.appendFileSync(summaryFile, markdown + "\\n", "utf8");
}


async function findExistingReportComment(repo, issueNumber, maxPages) {
  const pages = maxPages || 100;

  for (let page = 1; page <= pages; page++) {
    const comments = await github(
      "/repos/" + repo + "/issues/" + issueNumber + "/comments?per_page=100&page=" + page
    );

    if (!Array.isArray(comments) || comments.length === 0) return null;

    const existing = comments.find(comment =>
      comment.user &&
      comment.user.type === "Bot" &&
      String(comment.body || "").includes(REPORT_MARKER)
    );

    if (existing) return existing;
    if (comments.length < 100) return null;
  }

  return null;
}

async function postOrUpdateComment(repo, issueNumber, markdown) {
  const existing = await findExistingReportComment(repo, issueNumber);

  if (existing) {
    await github("/repos/" + repo + "/issues/comments/" + existing.id, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: markdown })
    });
    return { action: "updated", id: existing.id };
  }

  const created = await github("/repos/" + repo + "/issues/" + issueNumber + "/comments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ body: markdown })
  });
  return { action: "created", id: created.id };
}

async function handlePullRequest(event, config) {
  const repo = required(process.env.GITHUB_REPOSITORY, "GITHUB_REPOSITORY");
  const parts = repo.split("/");
  const owner = parts[0];
  const repoName = parts[1];
  const pr = event.pull_request;

  const files = await githubPaged(
    "/repos/" + owner + "/" + repoName + "/pulls/" + pr.number + "/files",
    5
  );

  const result = analyze(files, config);
  const markdown = renderPrMarkdown(result);

  if (readBoolean(input("comment"), true)) {
    await postOrUpdateComment(owner + "/" + repoName, pr.number, markdown);
  }

  setStepSummary(markdown);
  setGithubOutput("risk", result.risk);
  setGithubOutput("score", result.score);
  setGithubOutput("changed-lines", result.changedLines);

  return result;
}

async function handleIssue(event, config) {
  const issue = event.issue;
  if (!issue || !readBoolean(input("duplicate-issues"), true)) {
    return { type: "issue", version: "0.2.2", duplicates: [] };
  }

  const repo = required(process.env.GITHUB_REPOSITORY, "GITHUB_REPOSITORY");
  const configuredMaxIssues = Number(config.duplicate.maxIssues);
  const maxIssues = Number.isFinite(configuredMaxIssues)
    ? Math.max(0, Math.floor(configuredMaxIssues))
    : 300;
  const candidates = (await githubPaged(
    "/repos/" + repo + "/issues?state=open&sort=created&direction=desc",
    Math.ceil(maxIssues / 100)
  )).slice(0, maxIssues);

  const duplicates = findDuplicateIssues(issue, candidates, config);
  const result = {
    type: "issue",
    version: "0.2.2",
    issue: {
      number: issue.number,
      title: issue.title,
      url: issue.html_url
    },
    duplicates
  };

  if (duplicates.length) {
    const markdown = renderDuplicateMarkdown(duplicates);

    if (readBoolean(input("comment"), true)) {
      await postOrUpdateComment(repo, issue.number, markdown);
    }

    setStepSummary(markdown);
  }

  setGithubOutput("duplicate-count", duplicates.length);
  return result;
}

async function main() {
  if (!TOKEN) throw new Error("GITHUB_TOKEN/input github-token is required.");

  const event = readEvent();
  const config = loadConfig();
  let result;

  if (event.pull_request) {
    result = await handlePullRequest(event, config);

    if (readBoolean(input("fail-on-high"), false) && result.risk === "HIGH") {
      process.exitCode = 1;
    }
  } else if (event.issue) {
    result = await handleIssue(event, config);
  } else {
    console.log("MaintainerShield supports pull_request and issues events.");
    return;
  }

  writeOutputFile(result);
  console.log(JSON.stringify(result, null, 2));
}

module.exports = {
  DEFAULT_CONFIG,
  analyze,
  normalizeText,
  jaccard,
  duplicateScore,
  findDuplicateIssues,
  renderPrMarkdown,
  renderDuplicateMarkdown,
  loadConfig,
  findExistingReportComment
};

if (require.main === module) {
  main().catch(error => {
    console.error(error.stack || error.message || error);
    process.exitCode = 1;
  });
}
