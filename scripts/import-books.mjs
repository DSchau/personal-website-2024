// Turns a Goodreads library export (My Books → Import/Export → Export
// Library) into src/data/books.json, which /books, /favorites and the
// books OG card build from. Goodreads retired its public shelf RSS feeds,
// so this export is the source of truth for read history.
//
// Usage: npm run import-books -- path/to/goodreads_library_export.csv
//
// Only the read shelf and the custom "favorites" shelf are kept, and no
// review text or private notes are copied. Covers aren't in the export, so
// each new book's cover is read from its public Goodreads page; covers
// already in books.json are reused rather than refetched.

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const OUTPUT = fileURLToPath(new URL("../src/data/books.json", import.meta.url));
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36";
const COVER_CONCURRENCY = 4;

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (quoted) {
      if (char === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (char === '"') {
        quoted = false;
      } else {
        field += char;
      }
    } else if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[i + 1] === "\n") {
        i++;
      }
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += char;
    }
  }
  if (field || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const [header, ...records] = rows.filter((r) => r.some((value) => value !== ""));
  return records.map((record) =>
    Object.fromEntries(header.map((name, index) => [name.trim(), (record[index] ?? "").trim()]))
  );
}

// The export writes dates as YYYY/MM/DD.
function toIsoDate(value) {
  const match = value.match(/^(\d{4})\/(\d{2})\/(\d{2})$/);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : null;
}

// Covers are stored with a size token so resizeCover() can request smaller
// variants from the CDN.
async function fetchCover(link) {
  try {
    const response = await fetch(link, { headers: { "User-Agent": USER_AGENT } });
    if (!response.ok) {
      return "";
    }
    const html = await response.text();
    const url = html.match(/<meta property="og:image" content="([^"]+)"/)?.[1] ?? "";
    if (!url || /nophoto/.test(url)) {
      return "";
    }
    return url.replace(/(\._S[XY]\d+_)?\.(jpe?g|png)$/i, "._SY475_.$2");
  } catch {
    return "";
  }
}

async function readExisting() {
  try {
    return JSON.parse(await readFile(OUTPUT, "utf8"));
  } catch {
    return [];
  }
}

const csvPath = process.argv[2];
if (!csvPath) {
  console.error("Usage: npm run import-books -- path/to/goodreads_library_export.csv");
  process.exit(1);
}

const rows = parseCsv(await readFile(csvPath, "utf8"));
if (rows.length === 0 || !("Book Id" in rows[0]) || !("Exclusive Shelf" in rows[0])) {
  console.error(`${csvPath} doesn't look like a Goodreads library export.`);
  process.exit(1);
}

const existingCovers = new Map(
  (await readExisting()).filter((book) => book.imageUrl).map((book) => [book.link, book.imageUrl])
);

const books = rows
  .map((row) => {
    const shelves = [
      row["Exclusive Shelf"],
      ...row["Bookshelves"].split(",").map((shelf) => shelf.trim()),
    ].filter(Boolean);
    return {
      title: row["Title"],
      author: row["Author"],
      rating: Number.parseInt(row["My Rating"], 10) || 0,
      imageUrl: "",
      link: `https://www.goodreads.com/book/show/${row["Book Id"]}`,
      dateRead: toIsoDate(row["Date Read"]),
      pageCount: Number.parseInt(row["Number of Pages"], 10) || 0,
      shelves: [...new Set(shelves)],
    };
  })
  .filter((book) => book.shelves.includes("read") || book.shelves.includes("favorites"))
  .sort((a, b) => (b.dateRead ?? "").localeCompare(a.dateRead ?? ""));

const missing = books.filter((book) => {
  book.imageUrl = existingCovers.get(book.link) ?? "";
  return !book.imageUrl;
});

let fetched = 0;
for (let i = 0; i < missing.length; i += COVER_CONCURRENCY) {
  await Promise.all(
    missing.slice(i, i + COVER_CONCURRENCY).map(async (book) => {
      book.imageUrl = await fetchCover(book.link);
      fetched += 1;
    })
  );
  process.stdout.write(`\rFetching covers ${fetched}/${missing.length}`);
}
if (missing.length > 0) {
  process.stdout.write("\n");
}

await writeFile(OUTPUT, `${JSON.stringify(books, null, 2)}\n`);

const withoutCover = books.filter((book) => !book.imageUrl);
console.log(`Wrote ${books.length} books to src/data/books.json`);
if (withoutCover.length > 0) {
  console.log(`No cover found for: ${withoutCover.map((book) => book.title).join("; ")}`);
}
