const USER_ID = "7210735-dustin-schau";

export interface GoodreadsBook {
  title: string;
  author: string;
  rating: number;
  averageRating: number;
  imageUrl: string;
  link: string;
  dateRead: string | null;
  pageCount: number;
  yearPublished: string;
}

export type CompletedRead = GoodreadsBook & { dateRead: string };

export interface ReadsByYear {
  year: number;
  books: CompletedRead[];
}

function extractTag(xml: string, tag: string): string {
  const match = xml.match(
    new RegExp(`<${tag}><!\\[CDATA\\[(.+?)\\]\\]></${tag}>|<${tag}>(.+?)</${tag}>`, "s")
  );
  return (match?.[1] ?? match?.[2] ?? "").trim();
}

function parseItems(xml: string): GoodreadsBook[] {
  const items: GoodreadsBook[] = [];
  const itemBlocks = xml.split("<item>").slice(1);

  for (const block of itemBlocks) {
    const itemXml = block.split("</item>")[0];

    const smallUrl = extractTag(itemXml, "book_large_image_url") ||
      extractTag(itemXml, "book_medium_image_url") ||
      extractTag(itemXml, "book_image_url");

    const numPagesMatch = itemXml.match(/<num_pages>(\d+)<\/num_pages>/);
    const ratingStr = extractTag(itemXml, "user_rating");
    const dateRead = extractTag(itemXml, "user_read_at");

    items.push({
      title: extractTag(itemXml, "title"),
      author: extractTag(itemXml, "author_name"),
      rating: parseInt(ratingStr, 10) || 0,
      averageRating: parseFloat(extractTag(itemXml, "average_rating")) || 0,
      imageUrl: smallUrl,
      link: `https://www.goodreads.com/book/show/${extractTag(itemXml, "book_id")}`,
      dateRead: dateRead || null,
      pageCount: numPagesMatch ? parseInt(numPagesMatch[1], 10) : 0,
      yearPublished: extractTag(itemXml, "book_published"),
    });
  }

  return items;
}

// A browser-like User-Agent reduces Goodreads' intermittent anti-bot
// "404 - invalid user_id" responses on the RSS endpoints.
const USER_AGENT =
  "Mozilla/5.0 (compatible; dustinschau.com/favorites; +https://www.dustinschau.com)";

// Verified against the live RSS: `page` advances the read shelf; `per_page`
// is ignored (Goodreads always returns up to 100 items). An empty later page
// is a valid end-of-list channel, not an anti-bot miss.
const PAGE_SIZE = 100;
const MAX_PAGES = 20;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function bookKey(book: GoodreadsBook): string {
  return book.link || `${book.title}::${book.author}`;
}

interface FetchShelfOptions {
  page?: number;
  retries?: number;
  extraParams?: Record<string, string>;
  /**
   * When true (the default, and the right choice for a first page), a 200
   * with zero `<item>`s is treated as a transient anti-bot response and
   * retried. When false, zero items means end-of-list and we return [].
   */
  emptyMeansRetry?: boolean;
}

// Goodreads' RSS endpoints intermittently return a 404 (or a 200 with no
// items) as an anti-scraping measure. Because /favorites and /books are
// prerendered at build time, a single failed first-page fetch would bake an
// empty section into the static page until the next rebuild, so we retry
// with a short backoff. Empty *later* pages during pagination are expected
// and must not retry-loop.
async function fetchShelf(
  shelf: string,
  options: FetchShelfOptions = {}
): Promise<GoodreadsBook[]> {
  const page = options.page ?? 1;
  const retries = options.retries ?? 3;
  const emptyMeansRetry = options.emptyMeansRetry ?? true;
  const params = new URLSearchParams({
    shelf,
    page: String(page),
    per_page: String(PAGE_SIZE),
    ...options.extraParams,
  });
  const url = `https://www.goodreads.com/review/list_rss/${USER_ID}?${params}`;

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const response = await fetch(url, {
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "application/rss+xml, application/xml, text/xml",
        },
      });

      if (response.ok) {
        const items = parseItems(await response.text());
        if (items.length > 0) {
          return items;
        }
        if (!emptyMeansRetry) {
          return [];
        }
        // A 200 with zero items is almost always a transient anti-bot
        // response for a first page, so fall through and retry.
        console.error(
          `Goodreads shelf "${shelf}" page ${page} returned 0 items (attempt ${attempt}/${retries})`
        );
      } else {
        console.error(
          `Goodreads shelf "${shelf}" page ${page} returned ${response.status} (attempt ${attempt}/${retries})`
        );
      }
    } catch (error) {
      console.error(
        `Goodreads shelf "${shelf}" page ${page} fetch failed (attempt ${attempt}/${retries}):`,
        error
      );
    }

    if (attempt < retries) {
      await sleep(attempt * 500);
    }
  }

  console.error(
    `Goodreads shelf "${shelf}" page ${page} unavailable after ${retries} attempts`
  );
  return [];
}

async function fetchAllShelfPages(
  shelf: string,
  extraParams?: Record<string, string>
): Promise<GoodreadsBook[]> {
  const first = await fetchShelf(shelf, {
    page: 1,
    emptyMeansRetry: true,
    extraParams,
  });

  if (first.length === 0) {
    return [];
  }

  const all = [...first];
  const seen = new Set(first.map(bookKey));

  if (first.length < PAGE_SIZE) {
    return all;
  }

  for (let page = 2; page <= MAX_PAGES; page++) {
    // HTTP / network failures still retry a couple of times; an empty
    // channel is the end of the shelf and must not be treated as anti-bot.
    const items = await fetchShelf(shelf, {
      page,
      retries: 2,
      emptyMeansRetry: false,
      extraParams,
    });

    if (items.length === 0) {
      break;
    }

    let added = 0;
    for (const book of items) {
      const key = bookKey(book);
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      all.push(book);
      added += 1;
    }

    if (added === 0 || items.length < PAGE_SIZE) {
      break;
    }
  }

  return all;
}

let cachedReadBooks: Promise<GoodreadsBook[]> | undefined;

export async function getReadBooks(): Promise<GoodreadsBook[]> {
  cachedReadBooks ??= fetchAllShelfPages("read", {
    sort: "date_read",
    order: "d",
  });

  const books = await cachedReadBooks;
  if (books.length === 0) {
    cachedReadBooks = undefined;
  }
  return books;
}

export async function getCurrentlyReading(): Promise<GoodreadsBook[]> {
  return fetchShelf("currently-reading");
}

export async function getFavoriteBooks(): Promise<GoodreadsBook[]> {
  const books = await fetchShelf("favorites");
  return books.filter((book) => book.rating > 0);
}

export function isCompletedRead(book: GoodreadsBook): book is CompletedRead {
  return typeof book.dateRead === "string" && book.dateRead.length > 0;
}

export function sortByDateReadDesc(books: GoodreadsBook[]): CompletedRead[] {
  return books
    .filter(isCompletedRead)
    .sort((a, b) => new Date(b.dateRead).getTime() - new Date(a.dateRead).getTime());
}

export async function getCompletedReads(): Promise<CompletedRead[]> {
  return sortByDateReadDesc(await getReadBooks());
}

export async function getRecentlyRead(count = 10): Promise<GoodreadsBook[]> {
  const books = await getCompletedReads();
  return books.slice(0, count);
}

export function groupReadsByYear(books: CompletedRead[]): ReadsByYear[] {
  const groups = new Map<number, CompletedRead[]>();

  for (const book of books) {
    const year = new Date(book.dateRead).getUTCFullYear();
    if (Number.isNaN(year)) {
      continue;
    }
    const list = groups.get(year);
    if (list) {
      list.push(book);
    } else {
      groups.set(year, [book]);
    }
  }

  return [...groups.entries()]
    .sort((a, b) => b[0] - a[0])
    .map(([year, yearBooks]) => ({ year, books: yearBooks }));
}

export function toFavoriteItem(book: GoodreadsBook) {
  return {
    key: book.title.toLowerCase().replace(/\s+/g, "-"),
    title: book.title,
    subtitle: book.author,
    hyperlink: book.link,
    image: book.imageUrl,
  };
}
