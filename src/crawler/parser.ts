import { load } from "cheerio";
import type { DirectoryEntry } from "./types.js";

export class DirectoryParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "DirectoryParseError";
  }
}

function directoryFromHref(href: string): string | undefined {
  try {
    const url = new URL(href, "https://www.erai-raws.info/subs/");
    const directory = url.searchParams.get("dir");
    return directory?.replace(/\\/g, "/").replace(/\/+$/, "");
  } catch {
    return undefined;
  }
}

export function parseDirectoryListing(html: string): DirectoryEntry[] {
  const $ = load(html);
  const listing = $("#directory-listing");

  if (listing.length === 0) {
    const text = $.root().text().replace(/\s+/g, " ").trim();
    throw new DirectoryParseError(
      text.includes("Security Alert")
        ? "Erai denied access to the directory"
        : "Directory listing was not found in the HTML response",
    );
  }

  const entries: DirectoryEntry[] = [];

  listing.find("li[data-name]").each((_index, element) => {
    const row = $(element);
    const name = row.attr("data-name")?.trim();
    const href = (row.attr("data-href") ?? row.find("a").attr("href"))?.trim();

    if (!name || !href || name === "..") {
      return;
    }

    if (/\.(?:ass|ssa)$/i.test(name)) {
      entries.push({
        kind: "file",
        name,
        href,
        size: row.find(".file-size").text().trim() || undefined,
        modifiedAt: row.find(".file-modified").text().trim() || undefined,
      });
      return;
    }

    const directory = directoryFromHref(href);
    if (directory) {
      entries.push({ kind: "directory", name, directory });
    }
  });

  return entries;
}
