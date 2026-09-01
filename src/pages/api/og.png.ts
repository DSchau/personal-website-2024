import { type APIRoute } from "astro";
import { ImageResponse } from "@cloudflare/pages-plugin-vercel-og/api";

import { OG } from "../../components/og/og";
import { BooksOG } from "../../components/og/books";
import {
  getRecentlyReadFirstPage,
  resizeCover,
} from "../../lib/goodreads";

export const prerender = false;

const COVER_TIMEOUT_MS = 2500;
const AVATAR_URL =
  "https://dschau-website.imgix.net/me.jpeg?w=64&h=64&fit=min&fm=jpg";

function abortAfter(ms: number): AbortSignal {
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(ms);
  }
  const controller = new AbortController();
  setTimeout(() => controller.abort(), ms);
  return controller.signal;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

function sniffRasterType(bytes: Uint8Array): "image/jpeg" | "image/png" | "image/gif" | null {
  if (bytes.length < 12) {
    return null;
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return "image/gif";
  }
  return null;
}

// Prefetch as a data URI so Satori never does its own unbounded remote
// fetch. Unsupported formats (webp/avif) and hung CDNs become an empty
// string — the book mockup falls back to a title plate.
async function toDataUri(url: string, timeoutMs = COVER_TIMEOUT_MS): Promise<string> {
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
      signal: abortAfter(timeoutMs),
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

async function loadFonts() {
  const [rockwell, rockwellBold, sfPro] = await Promise.all([
    import("../../assets/fonts/Rockwell.ttf").then((mod) => mod.default),
    import("../../assets/fonts/Rockwell-Bold.ttf").then((mod) => mod.default),
    import("../../assets/fonts/SFPro.otf").then((mod) => mod.default),
  ]);

  return [
    {
      name: "Rockwell Bold",
      data: rockwellBold,
      style: "normal" as const,
    },
    {
      name: "Rockwell",
      data: rockwell,
      style: "normal" as const,
    },
    {
      name: "SFPro",
      data: sfPro,
      style: "normal" as const,
    },
  ];
}

export const GET: APIRoute = async function GET({ request }) {
  const url = new URL(request.url);
  const urlParams = url.searchParams;
  const type = urlParams.get("type");
  const fonts = await loadFonts();

  if (type === "books") {
    let books: { title: string; author: string; imageUrl: string }[] = [];
    let avatarUrl = "";

    try {
      const recent = await getRecentlyReadFirstPage(5);
      const [covers, avatar] = await Promise.all([
        Promise.all(
          recent.map((book) => toDataUri(resizeCover(book.imageUrl, 240)))
        ),
        toDataUri(AVATAR_URL),
      ]);
      books = recent.map((book, index) => ({
        title: book.title,
        author: book.author,
        imageUrl: covers[index] ?? "",
      }));
      avatarUrl = avatar;
    } catch (error) {
      console.error("Books OG data failed:", error);
    }

    const response = new ImageResponse(BooksOG({ books, avatarUrl }), {
      width: 1200,
      height: 630,
      fonts,
    });

    response.headers.set("Content-Type", "image/png");
    response.headers.set(
      "Cache-Control",
      "public, max-age=3600, s-maxage=86400"
    );

    return response;
  }

  const title = urlParams.get("title") as string;
  const tags = urlParams.get("tags")?.split(",") as string[];

  const response = new ImageResponse(OG({ tags, title }), {
    width: 1200,
    height: 620,
    fonts,
  });

  response.headers.set("Content-Type", "image/png");
  response.headers.set("Cache-Control", "public, max-age=31536000");

  return response;
};
