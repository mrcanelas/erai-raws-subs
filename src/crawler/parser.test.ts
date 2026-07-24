import assert from "node:assert/strict";
import test from "node:test";
import { episodeFromPathAndFile } from "./episode.js";
import {
  detectLanguage,
  languageFromDirectories,
  languageFromFilename,
} from "./language.js";
import { DirectoryParseError, parseDirectoryListing } from "./parser.js";

test("parses directories and ASS files from Directory Lister", () => {
  const html = `
    <ul id="directory-listing">
      <li data-name=".." data-href="?dir=Sub/2025/Winter"></li>
      <li data-name="04" data-href="?dir=Sub/2025/Winter/Medalist/04"></li>
      <li data-name="[Erai-raws] Medalist - 04 [1080p].5.por.ass"
          data-href="Sub/2025/Winter/Medalist/04/file.por.ass">
        <span class="file-size">25KB</span>
        <span class="file-modified">2025-01-26 19:56:33</span>
      </li>
    </ul>`;

  assert.deepEqual(parseDirectoryListing(html), [
    {
      kind: "directory",
      name: "04",
      directory: "Sub/2025/Winter/Medalist/04",
    },
    {
      kind: "file",
      name: "[Erai-raws] Medalist - 04 [1080p].5.por.ass",
      href: "Sub/2025/Winter/Medalist/04/file.por.ass",
      size: "25KB",
      modifiedAt: "2025-01-26 19:56:33",
    },
  ]);
});

test("rejects non-directory HTML", () => {
  assert.throws(
    () => parseDirectoryListing("Security Alert: Access to this directory is denied."),
    DirectoryParseError,
  );
});

test("detects language from legacy folder before filename", () => {
  assert.equal(
    detectLanguage("subtitle.eng.ass", ["01 ~ 12", "Portuguese(Brazil)"]),
    "por",
  );
  assert.equal(languageFromDirectories(["English"]), "eng");
  assert.equal(languageFromFilename("subtitle.5.spa.ass"), "spa");
});

test("parses single, versioned, filename and range episodes", () => {
  assert.equal(episodeFromPathAndFile(["01v2"], "x.ass").episode, 1);
  assert.equal(
    episodeFromPathAndFile(["HEVC"], "[Erai-raws] Show - 04 [1080p].eng.ass")
      .episode,
    4,
  );
  assert.deepEqual(episodeFromPathAndFile(["01 ~ 12"], "batch.ass"), {
    episode: null,
    descriptor: "01 ~ 12",
  });
});
