const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");

test("project documents advisory-first design", () => {
  const readme = fs.readFileSync("README.md", "utf8");
  assert.match(readme, /Advisory by default/i);
});

test("action targets Node 20", () => {
  const action = fs.readFileSync("action.yml", "utf8");
  assert.match(action, /using:\s*"node20"/i);
});
