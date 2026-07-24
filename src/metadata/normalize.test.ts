import assert from "node:assert/strict";
import test from "node:test";
import {
  bestTitleMatch,
  normalizeTitle,
  titleMatchScore,
} from "./normalize.js";
import { buildImdbMappingIndex, lookupMappingByKitsuId, lookupMappingByTitle } from "./imdb-mapping.js";
import { MetadataResolver } from "./resolver.js";

test("normalizeTitle strips accents punctuation and case", () => {
  assert.equal(normalizeTitle("  MédaLIST!! "), "medalist");
  assert.equal(normalizeTitle("Spy×Family"), "spy family");
  assert.equal(normalizeTitle("Foo & Bar"), "foo and bar");
});

test("titleMatchScore prefers exact normalized matches", () => {
  assert.equal(titleMatchScore("Medalist", "Medalist"), 100);
  assert.ok(titleMatchScore("Medalist", "Medalist 2nd Season") >= 70);
  assert.equal(titleMatchScore("Medalist", "Cowboy Bebop"), 0);
});

test("bestTitleMatch picks the strongest candidate", () => {
  const match = bestTitleMatch(
    "Medalist",
    [
      { id: "a", titles: ["Medalist Movie"] },
      { id: "b", titles: ["Medalist"] },
      { id: "c", titles: ["Medalist 2nd Season"] },
    ],
    (row) => row.titles,
    70,
  );
  assert.equal(match?.id, "b");
});

test("imdb mapping indexes by kitsu and title", () => {
  const index = buildImdbMappingIndex([
    {
      kitsu_id: 47454,
      imdb_id: "tt33310730",
      title: "Medarisuto",
      fromSeason: 1,
    },
    {
      kitsu_id: 1,
      imdb_id: "tt0213338",
      title: "Cowboy Bebop",
    },
  ]);

  assert.equal(lookupMappingByKitsuId(index, "47454")?.imdb_id, "tt33310730");
  assert.equal(lookupMappingByTitle(index, "Cowboy Bebop")?.kitsu_id, 1);
  assert.equal(lookupMappingByTitle(index, "Medalist"), undefined);
});

test("MetadataResolver uses mapping offline without remote calls", async () => {
  const index = buildImdbMappingIndex([
    {
      kitsu_id: 1,
      imdb_id: "tt0213338",
      title: "Cowboy Bebop",
    },
  ]);
  const resolver = new MetadataResolver({ mapping: index, offline: true });
  const resolved = await resolver.resolve("Cowboy Bebop");
  assert.deepEqual(
    {
      imdb: resolved?.imdb,
      kitsu: resolved?.kitsu,
      source: resolved?.source,
    },
    { imdb: "tt0213338", kitsu: "1", source: "imdb_mapping" },
  );
});

test("MetadataResolver returns local when both ids already exist", async () => {
  const resolver = new MetadataResolver({ offline: true });
  const resolved = await resolver.resolve("Medalist", {
    imdb: "tt33310730",
    kitsu: "47454",
    aliases: [],
    source: "local",
  });
  assert.equal(resolved?.source, "local");
  assert.equal(resolved?.imdb, "tt33310730");
});
