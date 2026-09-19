const test = require("node:test");
const assert = require("node:assert/strict");

const { findExistingReportComment } = require("../src/index.js");

test("comment lookup continues paging until marker is found", async () => {
  const originalFetch = global.fetch;
  const pagesRequested = [];
  global.fetch = async url => {
    const page = Number(new URL(url).searchParams.get("page"));
    pagesRequested.push(page);
    const comments = page < 4
      ? Array.from({ length: 100 }, (_, index) => ({ id: page * 1000 + index, user: { type: "User" }, body: "no marker" }))
      : [{ id: 4040, user: { type: "Bot" }, body: "<!-- maintainer-shield-report --> existing" }];
    return { ok: true, json: async () => comments };
  };

  try {
    const found = await findExistingReportComment("owner/repo", 1, 10);
    assert.equal(found.id, 4040);
    assert.deepEqual(pagesRequested, [1, 2, 3, 4]);
  } finally {
    global.fetch = originalFetch;
  }
});

test("comment lookup stops when there are no more pages", async () => {
  const originalFetch = global.fetch;
  const pagesRequested = [];
  global.fetch = async url => {
    const page = Number(new URL(url).searchParams.get("page"));
    pagesRequested.push(page);
    const comments = page === 1
      ? [{ id: 1, user: { type: "User" }, body: "not the marker" }]
      : [];
    return { ok: true, json: async () => comments };
  };

  try {
    const found = await findExistingReportComment("owner/repo", 1, 10);
    assert.equal(found, null);
    assert.deepEqual(pagesRequested, [1]);
  } finally {
    global.fetch = originalFetch;
  }
});
