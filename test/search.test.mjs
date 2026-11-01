import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { loadChurches, normalizeCity, cleanName, readPackageVersion } from "../dist/data.js";
import { ChurchIndex } from "../dist/search.js";
import { isSafeAndSecureUrl } from "../dist/security.js";
import { createFaithFinderServer } from "../dist/server.js";
import {
  CURATED_HUB_METADATA,
  FEATURE_PAGES,
  MAP_URL,
  PERSONA_PAGES,
  SERVICE_TIMES_URL,
  curatedCityHubInfo,
  personaUrl,
  quizUrl,
} from "../dist/links.js";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const churches = loadChurches();
const index = new ChurchIndex(churches);

test("security pre-flight validator enforces HTTPS and domain/TLD blocklists", () => {
  assert.equal(isSafeAndSecureUrl("http://watermark.org/about"), "https://watermark.org/about");
  assert.equal(isSafeAndSecureUrl("https://elevatelife.com/"), "https://elevatelife.com/");
  assert.equal(isSafeAndSecureUrl("http://localhost:8080/mcp"), null);
  assert.equal(isSafeAndSecureUrl("https://192.168.1.1/test"), null);
  assert.equal(isSafeAndSecureUrl("https://spam.xyz/church"), null);
  assert.equal(isSafeAndSecureUrl("https://avenuechurch.cc/"), null);
  assert.equal(isSafeAndSecureUrl("https://stlcatholic.org/"), null);
  assert.equal(isSafeAndSecureUrl("https://faithfinder.app/quiz"), null);
  assert.equal(isSafeAndSecureUrl("mailto:info@example.org"), null);
});

test("dataset integrity: all 50 states + DC covered, zero missing states/cities, zero unsafe URLs", () => {
  assert.ok(index.size >= 22000, `Expected >= 22,000 churches, got ${index.size}`);
  assert.equal(index.coverage().length, 51, "Expected 50 states + DC");
  assert.equal(churches.filter((c) => !c.stateCode).length, 0, "Expected 0 churches missing stateCode");
  assert.equal(churches.filter((c) => !c.cityKey).length, 0, "Expected 0 churches missing cityKey");
  assert.equal(
    churches.filter((c) => /local area|united states|new york city/i.test(c.city || "")).length,
    0,
    "Expected placeholder and split NYC labels to be normalized"
  );

  for (const c of churches) {
    for (const f of ["website", "youtubeUrl", "latestVideo", "statementOfFaith"]) {
      const val = c[f];
      if (!val) continue;
      assert.ok(val.startsWith("https://"), `Non-HTTPS URL in ${c.id}.${f}: ${val}`);
      assert.ok(isSafeAndSecureUrl(val), `Unsafe URL in ${c.id}.${f}: ${val}`);
    }
  }
});

test("normalizeCity and cleanName handle abbreviations and campus stutter", () => {
  assert.equal(normalizeCity("New York City"), "new york");
  assert.equal(normalizeCity("W Hartford"), "west hartford");
  assert.equal(normalizeCity("Ft. Mitchell"), "fort mitchell");
  assert.equal(normalizeCity("Saint Louis"), "st louis");

  assert.equal(cleanName("12Stone Church | Buford - Buford Campus"), "12Stone Church | Buford");
  assert.equal(cleanName("Elevate Life Church Frisco - Frisco Campus"), "Elevate Life Church Frisco");
  assert.equal(cleanName("Stonebriar Community Church - Frisco Campus"), "Stonebriar Community Church - Frisco Campus");
  assert.equal(cleanName("⛪️ ARISE Church at Brandon - Brandon Campus"), "ARISE Church at Brandon");
});

test("parseQuery avoids church-name city collisions and lowercase English word state false positives", () => {
  const stPaulAustin = index.parseQuery("st paul lutheran church in austin tx");
  assert.equal(stPaulAustin.city, "austin");
  assert.equal(stPaulAustin.stateCode, "TX");

  const austinOr = index.parseQuery("churches in Austin or Round Rock");
  assert.equal(austinOr.city, "austin");
  assert.equal(austinOr.stateCode, null);

  assert.equal(index.parseQuery("looking for a grace church").city, null);
  assert.equal(index.parseQuery("union baptist church").city, null);
  assert.equal(index.parseQuery("trinity presbyterian church").city, null);
});

test("search returns accurate NYC, Heartland flagship, and Modern/Contemporary results", () => {
  const nycReformed = index.search({ query: "Reformed church in New York" });
  assert.ok(nycReformed.results.length > 0);
  assert.equal(nycReformed.notes.length, 0, `Unexpected fallback notes for NYC Reformed: ${nycReformed.notes.join("; ")}`);

  const dallasContemporary = index.search({ city: "Dallas", state: "TX", worshipStyle: "Contemporary", limit: 10 });
  assert.ok(
    dallasContemporary.results.some((c) => c.name.includes("Watermark Community Church")),
    "Expected Modern-styled Watermark Community Church to match Contemporary filter"
  );

  const stlCathedral = index.findByName("Cathedral Basilica of Saint Louis", "St. Louis");
  assert.ok(stlCathedral);
  assert.equal(stlCathedral.stateCode, "MO");

  const kcCathedral = index.findByName("Cathedral of the Immaculate Conception KC", "Kansas City");
  assert.ok(kcCathedral);
  assert.deepEqual(kcCathedral.denomination, ["Catholic"]);
});

test("version metadata is aligned across package.json, server.json, and openai-action.json", () => {
  const pkg = JSON.parse(readFileSync(join(ROOT, "package.json"), "utf-8"));
  const lock = JSON.parse(readFileSync(join(ROOT, "package-lock.json"), "utf-8"));
  const srv = JSON.parse(readFileSync(join(ROOT, "server.json"), "utf-8"));
  const oai = JSON.parse(readFileSync(join(ROOT, "openai-action.json"), "utf-8"));

  assert.equal(pkg.version, readPackageVersion());
  assert.equal(lock.version, pkg.version);
  assert.equal(lock.packages[""].version, pkg.version);
  assert.equal(srv.version, pkg.version);
  assert.equal(srv.packages[0].version, pkg.version);
  assert.ok(srv.description.length <= 100, `server.json description exceeds 100 chars (${srv.description.length})`);
  assert.equal(oai.info.version, pkg.version);

  const mcp = createFaithFinderServer(index, pkg.version);
  assert.ok(mcp);
});

test("live website links: 36 curated metro hubs, state disambiguation, and canonical trailing slashes", () => {
  assert.equal(Object.keys(CURATED_HUB_METADATA).length, 36);

  assert.equal(curatedCityHubInfo("Arlington", "TX")?.slug, "dallas");
  assert.equal(curatedCityHubInfo("Arlington", "VA")?.slug, "dc");
  assert.equal(curatedCityHubInfo("Arlington", "MA")?.slug, "boston");
  assert.equal(curatedCityHubInfo("Portland", "OR")?.slug, "portland");
  assert.equal(curatedCityHubInfo("Portland", "ME"), null);
  assert.equal(curatedCityHubInfo("Brandon", "FL")?.slug, "tampa");
  assert.equal(curatedCityHubInfo("Brandon", "MS"), null);
  assert.equal(curatedCityHubInfo("Bakersfield", "CA")?.slug, "california");
  assert.equal(curatedCityHubInfo("St. Louis", "MO")?.slug, "st-louis");

  const urlsToCheck = [
    MAP_URL,
    SERVICE_TIMES_URL,
    quizUrl({ city: "Austin" }),
    curatedCityHubInfo("Dallas", "TX").url,
    ...Object.values(PERSONA_PAGES).map((p) => personaUrl(p)),
  ];
  for (const u of urlsToCheck) {
    const parsed = new URL(u);
    assert.equal(parsed.origin, "https://faithfinder.armornglory.com");
    assert.ok(parsed.pathname.endsWith("/"), `Expected canonical trailing slash on ${u}`);
  }
  for (const p of Object.values(FEATURE_PAGES)) {
    assert.ok(p.endsWith("/"), `Expected trailing slash on feature path ${p}`);
  }
});
