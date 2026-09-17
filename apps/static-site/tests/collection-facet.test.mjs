// Run with the static site, IIIF server and search index available.
import assert from "node:assert/strict";
import { test } from "node:test";
import { chromium } from "playwright";

test("collection facet searches groups, filters membership and links coloured badges", async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage();
    const documents = new Map();
    page.on("response", async (response) => {
      if (!response.url().includes("multi_search")) return;
      const data = await response.json();
      for (const result of data.results || []) {
        for (const { document } of result.hits || []) documents.set(`/en/${document.slug}`, document);
      }
    });
    await page.goto(`${process.env.SITE_URL || "http://localhost:3000"}/en/search`);
    const search = page.getByRole("searchbox", { name: "Search in collections" });
    await search.waitFor();
    await page.getByRole("checkbox", { name: /^Trésor \([1-9]/ }).waitFor();
    const facet = page.locator("details").filter({ has: search });
    await search.fill("geodesie");
    assert.equal(await facet.getByRole("checkbox").count(), 2);
    assert.equal(await facet.getByRole("checkbox", { name: /Trésor/ }).count(), 0);
    await search.fill("");
    await facet.getByRole("button", { name: "Museum Collection", exact: true }).click();
    assert.ok(await facet.getByRole("checkbox", { name: /Collectie Geodesie/ }).isVisible());

    const selected = "collections/tresor";
    const responsePromise = page.waitForResponse((response) =>
      response.url().includes("multi_search") && (response.request().postData() || "").includes(selected),
    );
    await facet.getByRole("checkbox", { name: /^Trésor / }).check();
    const data = await (await responsePromise).json();
    const result = data.results[0];
    assert.ok(result.found > 0);
    assert.ok(result.hits.every(({ document }) => document.collectionSlugs.includes(selected)));
    await page.waitForFunction(() => {
      const badges = [...document.querySelectorAll("article section > p > a")];
      return badges.length > 0 && badges.every((badge) => getComputedStyle(badge).backgroundColor === "rgb(59, 130, 246)");
    });
    const article = page.locator("article").filter({ has: page.locator("section > p > a") }).first();
    const href = await article.locator("header a").getAttribute("href");
    const parent = documents.get(href).partOf.at(-1);
    const badge = article.locator("section > p > a");
    assert.equal(await badge.getAttribute("href"), `/en/${parent["hss:slug"]}`);
    assert.equal(await badge.textContent(), parent.label.en?.[0] || Object.values(parent.label).flat()[0]);
    await facet.getByRole("checkbox", { name: /^Trésor / }).uncheck();
    assert.equal(await facet.getByRole("checkbox", { name: /^Trésor / }).isChecked(), false);
    await page.setViewportSize({ width: 375, height: 800 });
    assert.ok(await facet.evaluate((element) => element.getBoundingClientRect().right <= window.innerWidth));
  } finally {
    await browser.close();
  }
});
