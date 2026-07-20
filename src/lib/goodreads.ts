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

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Goodreads' RSS endpoints intermittently return a 404 (or a 200 with no
// items) as an anti-scraping measure. Because /favorites is prerendered at
// build time, a single failed fetch would bake an empty Books section into
// the static page until the next rebuild, so we retry with a short backoff.
async function fetchShelf(shelf: string, retries = 3): Promise<GoodreadsBook[]> {
  const url = `https://www.goodreads.com/review/list_rss/${USER_ID}?shelf=${shelf}`;

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
        // A 200 with zero items is almost always a transient anti-bot
        // response for these shelves, so fall through and retry.
        console.error(
          `Goodreads shelf "${shelf}" returned 0 items (attempt ${attempt}/${retries})`
        );
      } else {
        console.error(
          `Goodreads shelf "${shelf}" returned ${response.status} (attempt ${attempt}/${retries})`
        );
      }
    } catch (error) {
      console.error(
        `Goodreads shelf "${shelf}" fetch failed (attempt ${attempt}/${retries}):`,
        error
      );
    }

    if (attempt < retries) {
      await sleep(attempt * 500);
    }
  }

  console.error(`Goodreads shelf "${shelf}" unavailable after ${retries} attempts`);
  return [];
}

export async function getReadBooks(): Promise<GoodreadsBook[]> {
  return fetchShelf("read");
}

export async function getCurrentlyReading(): Promise<GoodreadsBook[]> {
  return fetchShelf("currently-reading");
}

export async function getFavoriteBooks(): Promise<GoodreadsBook[]> {
  const books = await fetchShelf("favorites");
  return books.filter((book) => book.rating > 0);
}

export async function getRecentlyRead(count = 10): Promise<GoodreadsBook[]> {
  const books = await getReadBooks();
  return books
    .filter((book) => book.dateRead)
    .sort((a, b) => new Date(b.dateRead!).getTime() - new Date(a.dateRead!).getTime())
    .slice(0, count);
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
