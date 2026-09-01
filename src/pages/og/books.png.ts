import { type APIRoute } from "astro";
import { ImageResponse } from "@cloudflare/pages-plugin-vercel-og/api";

import { BooksOG } from "../../components/og/books";
import { getRecentlyReadFirstPage, resizeCover } from "../../lib/goodreads";

// Rendering this card takes more CPU than a Worker request is allowed
// (satori + resvg with six embedded rasters intermittently dies with
// Cloudflare error 1102, or truncates the PNG mid-stream). The data is
// build-time data anyway — the daily scheduled rebuild refreshes it — so
// bake the PNG as a static asset instead of rendering per request.
export const prerender = true;

const COVER_TIMEOUT_MS = 8000;
const AVATAR_URL =
  "https://dschau-website.imgix.net/me.jpeg?w=64&h=64&fit=min&fm=jpg";

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function sniffRasterType(
  bytes: Uint8Array
): "image/jpeg" | "image/png" | "image/gif" | null {
  if (bytes.length < 12) {
    return null;
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "image/png";
  }
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return "image/gif";
  }
  return null;
}

// Prefetch as a data URI so satori never does its own remote fetch.
// Unsupported formats (webp/avif) and hung CDNs become an empty string —
// the book mockup falls back to a title plate.
async function toDataUri(url: string): Promise<string> {
  if (!url) {
    return "";
  }

  try {
    const response = await fetch(url, {
      headers: {
        Accept: "image/jpeg,image/png,image/gif",
        "User-Agent":
          "Mozilla/5.0 (compatible; dustinschau.com/books; +https://www.dustinschau.com)",
      },
      signal: AbortSignal.timeout(COVER_TIMEOUT_MS),
    });

    if (!response.ok) {
      return "";
    }

    const bytes = new Uint8Array(await response.arrayBuffer());
    const rasterType = sniffRasterType(bytes);
    if (!rasterType) {
      return "";
    }

    return `data:${rasterType};base64,${bytesToBase64(bytes)}`;
  } catch {
    return "";
  }
}

export const GET: APIRoute = async function GET() {
  const recent = await getRecentlyReadFirstPage(5);
  const [covers, avatarUrl] = await Promise.all([
    Promise.all(recent.map((book) => toDataUri(resizeCover(book.imageUrl, 240)))),
    toDataUri(AVATAR_URL),
  ]);
  const books = recent.map((book, index) => ({
    title: book.title,
    author: book.author,
    imageUrl: covers[index] ?? "",
  }));

  const [rockwell, rockwellBold, sfPro] = await Promise.all([
    import("../../assets/fonts/Rockwell.ttf").then((mod) => mod.default),
    import("../../assets/fonts/Rockwell-Bold.ttf").then((mod) => mod.default),
    import("../../assets/fonts/SFPro.otf").then((mod) => mod.default),
  ]);

  const response = new ImageResponse(BooksOG({ books, avatarUrl }), {
    width: 1200,
    height: 630,
    fonts: [
      { name: "Rockwell Bold", data: rockwellBold, style: "normal" },
      { name: "Rockwell", data: rockwell, style: "normal" },
      { name: "SFPro", data: sfPro, style: "normal" },
    ],
  });

  // Buffer the stream so Astro writes a complete file at build time.
  return new Response(await response.arrayBuffer(), {
    headers: { "Content-Type": "image/png" },
  });
};
