// Adds newly finished books to src/data/books.json from public Goodreads
// pages, so the read history stays current without a library export.
//
// Usage: pnpm run sync-books
//
// Goodreads hides shelf pages from signed-out visitors, but two public pages
// cover what /books needs:
//   * Year in Books (/user/year_in_books/<year>/<id>) lists every book read in
//     a year, with covers. It has no per-book dates or ratings, so a new book
//     is dated the day this script first sees it (run it daily:
//     .github/workflows/sync-books.yml).
//   * The embeddable shelf widget (/review/custom_widget/<id>) lists the 100
//     most recent read and currently-reading books with their star ratings
//     (it ignores its shelf parameter), so it's used to fill in ratings.
// Page counts come from Open Library: Goodreads' book pages now answer
// scripted requests with a bot challenge.
//
// Only the current year is checked (and last year during January, for books
// finished on New Year's Eve). Earlier years are already in books.json.

import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const OUTPUT = fileURLToPath(new URL("../src/data/books.json", import.meta.url));
const USER_ID = "7210735";
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36";
const FETCH_TIMEOUT_MS = 15000;

function decodeEntities(text) {
  return text
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .trim();
}

async function fetchHtml(url) {
  const response = await fetch(url, {
    headers: { "User-Agent": USER_AGENT },
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
  });
  // 202 is Goodreads' bot challenge, not the page.
  if (!response.ok || response.status === 202) {
    throw new Error(`${url} returned ${response.status}`);
  }
  // Signed-out requests for private pages are redirected to the sign-in page.
  if (new URL(response.url).pathname.startsWith("/user/sign_in")) {
    throw new Error(`${url} needs a Goodreads login`);
  }
  return response.text();
}

// The cover grid on the Year in Books page: one tooltip per book, carrying
// the book id, with an <img alt="Title by Author" src="cover">.
function parseYearInBooks(html) {
  const start = html.indexOf("class='bookCovers'");
  if (start === -1) {
    return [];
  }
  const books = new Map();
  const pattern =
    /data-resource-id='(\d+)' data-resource-type='Book'>\s*<a href="[^"]*"><img alt="([^"]*)"[^>]*src="([^"]*)"/g;
  for (const [, id, alt, cover] of html.slice(start).matchAll(pattern)) {
    const text = decodeEntities(alt);
    const split = text.lastIndexOf(" by ");
    books.set(id, {
      id,
      title: split === -1 ? text : text.slice(0, split),
      author: split === -1 ? "" : text.slice(split + 4),
      // Stored with a size token so resizeCover() can ask the CDN for smaller ones.
      imageUrl: /nophoto/.test(cover)
        ? ""
        : cover.replace(/(\._S[XY]\d+_)?\.(jpe?g|png)$/i, "._SY475_.$2"),
    });
  }
  return [...books.values()];
}

// Star ratings by book id. The widget links to reviews, not books, but each
// cover's file name is the book id.
function parseWidgetRatings(js) {
  const html = js.replace(/\\n/g, "\n").replace(/\\"/g, '"').replace(/\\\//g, "/");
  const ratings = new Map();
  for (const block of html.split('class="gr_custom_each_container').slice(1)) {
    const id = block.match(/\/books\/\d+[a-z]?\/(\d+)\./)?.[1];
    if (id) {
      ratings.set(id, (block.match(/gr_flat_red_star_active/g) ?? []).length);
    }
  }
  return ratings;
}

async function fetchPageCount(title, author) {
  try {
    // The top match can be an edition with no page count (Make Believe by Mac
    // Barnett): take the first that has one.
    const params = new URLSearchParams({ title, author, fields: "number_of_pages_median", limit: "5" });
    const response = await fetch(`https://openlibrary.org/search.json?${params}`, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    const { docs } = await response.json();
    return docs?.find((doc) => doc.number_of_pages_median)?.number_of_pages_median ?? 0;
  } catch (error) {
    console.error(`Couldn't look up the page count of ${title}: ${error.message}`);
    return 0;
  }
}

function bookId(book) {
  return book.link.match(/\/book\/show\/(\d+)/)?.[1];
}

const library = JSON.parse(await readFile(OUTPUT, "utf8"));
const byId = new Map(library.map((book) => [bookId(book), book]));

const now = new Date();
const today = now.toISOString().slice(0, 10);
const years = [now.getUTCFullYear()];
if (now.getUTCMonth() === 0) {
  years.unshift(now.getUTCFullYear() - 1);
}

const finished = [];
for (const year of years) {
  const html = await fetchHtml(`https://www.goodreads.com/user/year_in_books/${year}/${USER_ID}`);
  const books = parseYearInBooks(html);
  if (books.length === 0 && /bookCovers/.test(html)) {
    throw new Error(`Couldn't parse the ${year} Year in Books page; has its markup changed?`);
  }
  finished.push(...books);
}

let ratings = new Map();
try {
  ratings = parseWidgetRatings(
    await fetchHtml(`https://www.goodreads.com/review/custom_widget/${USER_ID}?num_books=100&widget_id=sync`)
  );
} catch (error) {
  console.error(`Couldn't read ratings: ${error.message}`);
}

const added = [];
for (const { id, title, author, imageUrl } of finished) {
  if (byId.has(id)) {
    continue;
  }
  const book = {
    title,
    author,
    rating: 0,
    imageUrl,
    link: `https://www.goodreads.com/book/show/${id}`,
    dateRead: today,
    pageCount: await fetchPageCount(title, author),
    shelves: ["read"],
  };
  library.push(book);
  byId.set(id, book);
  added.push(book);
}

// Ratings change after the fact (a book is often rated a day or two after
// it's finished), so refresh every book the widget covers.
const rerated = [];
for (const [id, rating] of ratings) {
  const book = byId.get(id);
  if (book && rating > 0 && book.rating !== rating) {
    book.rating = rating;
    if (!added.includes(book)) {
      rerated.push(book);
    }
  }
}

if (added.length === 0 && rerated.length === 0) {
  console.log("books.json is up to date");
  process.exit(0);
}

library.sort((a, b) => (b.dateRead ?? "").localeCompare(a.dateRead ?? ""));
await writeFile(OUTPUT, `${JSON.stringify(library, null, 2)}\n`);

for (const book of added) {
  console.log(`added: ${book.title} by ${book.author}${book.rating ? ` (${book.rating}★)` : ""}`);
}
for (const book of rerated) {
  console.log(`rated: ${book.title} ${book.rating}★`);
}
