import assert from "node:assert/strict";
import test from "node:test";
import {
  applyLanguagePreferences,
  canonicalizeLanguage,
  languagesMatch,
} from "./preferences.js";

test("canonicalizeLanguage maps fre/fra and ger/deu aliases", () => {
  assert.equal(canonicalizeLanguage("fra"), "fre");
  assert.equal(canonicalizeLanguage("fre"), "fre");
  assert.equal(canonicalizeLanguage("deu"), "ger");
  assert.equal(canonicalizeLanguage("GER"), "ger");
});

test("languagesMatch treats Chinese aliases as equal", () => {
  assert.equal(languagesMatch("chi", "zho"), true);
  assert.equal(languagesMatch("chi", "eng"), false);
});

test("preferredOnly keeps only preferred language tracks", () => {
  const rows = [
    { id: "1", lang: "eng" },
    { id: "2", lang: "por" },
    { id: "3", lang: "fra" },
    { id: "4", lang: "por" },
  ];

  assert.deepEqual(
    applyLanguagePreferences(rows, {
      preferredLanguage: "por",
      preferredOnly: true,
    }),
    [
      { id: "2", lang: "por" },
      { id: "4", lang: "por" },
    ],
  );
});

test("without preferredOnly preferred language is sorted first", () => {
  const rows = [
    { id: "1", lang: "eng" },
    { id: "2", lang: "por" },
    { id: "3", lang: "spa" },
  ];

  assert.deepEqual(
    applyLanguagePreferences(rows, {
      preferredLanguage: "por",
      preferredOnly: false,
    }).map((row) => row.id),
    ["2", "1", "3"],
  );
});

test("missing preference leaves list unchanged", () => {
  const rows = [
    { id: "1", lang: "eng" },
    { id: "2", lang: "por" },
  ];
  assert.deepEqual(applyLanguagePreferences(rows, undefined), rows);
});
