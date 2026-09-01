import { type APIRoute } from "astro";

import {
  getCurrentlyReading,
  getFavoriteBooks,
  getReadBooks,
  type GoodreadsBook,
} from "../../lib/goodreads";

export const prerender = false;

// Browsers revalidate hourly; the Cloudflare edge holds the response for a
// day. Combined with the day-long edge cache inside src/lib/goodreads.ts,
// Goodreads itself is only hit about once a day per shelf.
const CACHE_CONTROL = "public, max-age=3600, s-maxage=86400";

const SHELVES: Record<string, () => Promise<GoodreadsBook[]>> = {
  read: getReadBooks,
  "currently-reading": getCurrentlyReading,
  favorites: getFavoriteBooks,
};

export const GET: APIRoute = async function GET({ url }) {
  const shelf = url.searchParams.get("shelf") ?? "read";
  const loadShelf = SHELVES[shelf];

  if (!loadShelf) {
    return new Response(
      JSON.stringify({
        error: `Unknown shelf "${shelf}". Valid shelves: ${Object.keys(SHELVES).join(", ")}.`,
      }),
      {
        status: 400,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const books = await loadShelf();

  return new Response(JSON.stringify({ shelf, count: books.length, books }), {
    status: books.length > 0 ? 200 : 503,
    headers: {
      "Content-Type": "application/json",
      // Don't let an empty anti-bot response get cached for a day.
      "Cache-Control": books.length > 0 ? CACHE_CONTROL : "no-store",
    },
  });
};
