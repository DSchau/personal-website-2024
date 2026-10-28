import books from "@/data/books.json";

// Goodreads retired its public shelf RSS feeds, so read history and
// favorites come from a library export checked in as src/data/books.json
// (regenerate with `npm run import-books -- <export.csv>`). Currently
// reading changes too often for that, so it's read from the public profile
// page instead.
const PROFILE_URL = "https://www.goodreads.com/user/show/7210735-dustin-schau";
const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130 Safari/537.36";
const FETCH_TIMEOUT_MS = 8000;

export interface GoodreadsBook {
  title: string;
  author: string;
  rating: number;
  imageUrl: string;
  link: string;
  dateRead: string | null;
  pageCount: number;
  shelves: string[];
}

export type CompletedRead = GoodreadsBook & { dateRead: string };

export interface ReadsByYear {
  year: number;
  books: CompletedRead[];
}

const library: GoodreadsBook[] = books;

export function getReadBooks(): GoodreadsBook[] {
  return library.filter((book) => book.shelves.includes("read"));
}

export function getFavoriteBooks(): GoodreadsBook[] {
  return library.filter((book) => book.shelves.includes("favorites") && book.rating > 0);
}

export function isCompletedRead(book: GoodreadsBook): book is CompletedRead {
  return typeof book.dateRead === "string" && book.dateRead.length > 0;
}

export function getCompletedReads(): CompletedRead[] {
  return getReadBooks()
    .filter(isCompletedRead)
    .sort((a, b) => b.dateRead.localeCompare(a.dateRead));
}

export function getRecentlyRead(count = 10): CompletedRead[] {
  return getCompletedReads().slice(0, count);
}

function decodeEntities(text: string): string {
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

async function fetchHtml(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (!response.ok) {
      console.error(`Goodreads ${url} returned ${response.status}`);
      return null;
    }
    return await response.text();
  } catch (error) {
    console.error(`Goodreads ${url} fetch failed:`, error);
    return null;
  }
}

// The profile only lists title, author and cover; the page count (used for
// the book's spine thickness) comes from the book page's JSON-LD.
async function fetchPageCount(link: string): Promise<number> {
  const html = await fetchHtml(link);
  const match = html?.match(/"numberOfPages":\s*(\d+)/);
  return match ? Number.parseInt(match[1], 10) : 0;
}

// Scrapes the "Currently Reading" box on the public profile page. If
// Goodreads changes that markup this returns [] and the homepage simply
// hides the section.
export async function getCurrentlyReading(): Promise<GoodreadsBook[]> {
  const html = await fetchHtml(PROFILE_URL);
  const start = html?.indexOf('id="currentlyReadingReviews"') ?? -1;
  if (!html || start === -1) {
    console.error("Goodreads profile has no currently reading section");
    return [];
  }
  const end = html.indexOf('class=" clearFloats bigBox"', start);
  const section = html.slice(start, end === -1 ? undefined : end);

  const entries = section
    .split('class="Updates')
    .slice(1)
    .map((block) => {
      const id = block.match(/href="\/book\/show\/(\d+)/)?.[1];
      const title = block.match(/class="bookTitle"[^>]*>([^<]+)</)?.[1];
      const author = block.match(/class="authorName"[^>]*>([^<]+)</)?.[1];
      const cover = block.match(/<img[^>]+src="([^"]+)"/)?.[1] ?? "";
      if (!id || !title || !author) {
        return null;
      }
      return {
        title: decodeEntities(title),
        author: decodeEntities(author),
        rating: 0,
        imageUrl: /nophoto/.test(cover) ? "" : resizeCover(cover, 475),
        link: `https://www.goodreads.com/book/show/${id}`,
        dateRead: null,
        pageCount: 0,
        shelves: ["currently-reading"],
      } satisfies GoodreadsBook;
    })
    .filter((book) => book !== null);

  if (entries.length === 0) {
    console.error("Couldn't parse any books from the Goodreads currently reading section");
  }

  return Promise.all(
    entries.map(async (book) => ({ ...book, pageCount: await fetchPageCount(book.link) }))
  );
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

// Goodreads/Amazon cover URLs embed the rendered size as `_SX###_` or
// `_SY###_`; swapping the token requests a smaller variant from their CDN.
export function resizeCover(url: string, height: number): string {
  if (!url) {
    return url;
  }
  return url.replace(/\._S[XY]\d+_\./, `._SY${height}_.`);
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
