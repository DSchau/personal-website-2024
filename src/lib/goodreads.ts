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

async function fetchShelf(shelf: string): Promise<GoodreadsBook[]> {
  const url = `https://www.goodreads.com/review/list_rss/${USER_ID}?shelf=${shelf}`;
  const response = await fetch(url);
  if (!response.ok) {
    console.error(`Failed to fetch Goodreads shelf "${shelf}": ${response.status}`);
    return [];
  }
  const xml = await response.text();
  return parseItems(xml);
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
