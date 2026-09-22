import { type APIRoute } from "astro";
import { ImageResponse } from "@cloudflare/pages-plugin-vercel-og/api";
import type { ReactElement } from "react";

import { OG } from "../../components/og/og";
import { BooksOG } from "../../components/og/books";
import { FallbackOG } from "../../components/og/fallback";
import {
  getRecentlyReadFirstPage,
  resizeCover,
} from "../../lib/goodreads";
import fallbackPng from "../../assets/og-fallback.png";

export const prerender = false;

const COVER_TIMEOUT_MS = 1500;
const MAX_COVER_BYTES = 24_000;
const MIN_PNG_BYTES = 1000;
const BOOK_COUNT = 3;
const COVER_HEIGHT = 80;
const AVATAR_URL =
  "https://dschau-website.imgix.net/me.jpeg?w=64&h=64&fit=min&fm=jpg";

const SUCCESS_CACHE_BOOKS = "public, max-age=3600, s-maxage=86400";
const SUCCESS_CACHE_POST = "public, max-age=31536000";
const FALLBACK_CACHE = "public, max-age=60";
const ERROR_CACHE = "no-store, no-cache, must-revalidate";

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
  const chunk = 0x2000;
  for (let i = 0; i < bytes.length; i += chunk) {
    const slice = bytes.subarray(i, i + chunk);
    for (let j = 0; j < slice.length; j++) {
      binary += String.fromCharCode(slice[j]);
    }
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

function isPng(bytes: Uint8Array): boolean {
  return (
    bytes.byteLength >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  );
}

function asArrayBuffer(data: ArrayBuffer | Uint8Array): ArrayBuffer {
  if (data instanceof Uint8Array) {
    return data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  }
  return data;
}

function errorResponse(message: string, status = 503): Response {
  return new Response(message, {
    status,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": ERROR_CACHE,
    },
  });
}

function pngResponse(bytes: Uint8Array, cacheControl: string): Response {
  return new Response(bytes, {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": cacheControl,
    },
  });
}

function staticFallbackPng(): Uint8Array | null {
  try {
    const bytes =
      fallbackPng instanceof Uint8Array
        ? fallbackPng
        : new Uint8Array(fallbackPng as ArrayBuffer);
    return isPng(bytes) ? bytes : null;
  } catch {
    return null;
  }
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
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_COVER_BYTES) {
      return "";
    }
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
  // Skip SFPro (~299KB). Passing three full fonts plus covers into Satori
  // was enough to trip Cloudflare error 1102 (worker resource limits).
  const [rockwell, rockwellBold] = await Promise.all([
    import("../../assets/fonts/Rockwell.ttf").then((mod) => mod.default),
    import("../../assets/fonts/Rockwell-Bold.ttf").then((mod) => mod.default),
  ]);

  return [
    {
      name: "Rockwell Bold",
      data: asArrayBuffer(rockwellBold),
      style: "normal" as const,
    },
    {
      name: "Rockwell",
      data: asArrayBuffer(rockwell),
      style: "normal" as const,
    },
  ];
}

async function renderPng(
  element: ReactElement,
  options: { width: number; height: number; fonts: Awaited<ReturnType<typeof loadFonts>> }
): Promise<Uint8Array> {
  // ImageResponse returns a streaming Response immediately. On Cloudflare
  // Pages the stream can close empty (HTTP 200, 0-byte body) if Satori/resvg
  // throws after headers are committed. Buffer first, then validate magic
  // bytes so an empty/error body can never be cached.
  const generated = new ImageResponse(element, options);
  const bytes = new Uint8Array(await generated.arrayBuffer());
  if (!isPng(bytes) || bytes.byteLength < MIN_PNG_BYTES) {
    throw new Error(`OG render produced invalid PNG (${bytes.byteLength} bytes)`);
  }
  return bytes;
}

export const GET: APIRoute = async function GET({ request }) {
  const url = new URL(request.url);
  const urlParams = url.searchParams;
  const type = urlParams.get("type");

  try {
    const fonts = await loadFonts();

    if (type === "books") {
      let books: { title: string; author: string; imageUrl: string }[] = [];

      try {
        const recent = await getRecentlyReadFirstPage(BOOK_COUNT, {
          timeoutMs: 4000,
          retries: 2,
        });
        const covers = await Promise.all(
          recent.map((book) => toDataUri(resizeCover(book.imageUrl, COVER_HEIGHT)))
        );
        books = recent.map((book, index) => ({
          title: book.title,
          author: book.author,
          imageUrl: covers[index] ?? "",
        }));
      } catch (error) {
        console.error("Books OG data failed:", error);
      }

      try {
        const usedFallback = books.length === 0;
        const bytes = await renderPng(
          usedFallback
            ? FallbackOG({
                eyebrow: "RECENTLY FINISHED",
                title: "Books",
                subtitle: "dustinschau.com/books",
              })
            : BooksOG({ books }),
          { width: 1200, height: 630, fonts }
        );
        return pngResponse(bytes, usedFallback ? FALLBACK_CACHE : SUCCESS_CACHE_BOOKS);
      } catch (error) {
        console.error("Books OG ImageResponse failed, using text fallback:", error);
        const bytes = await renderPng(
          FallbackOG({
            eyebrow: "RECENTLY FINISHED",
            title: "Books",
            subtitle: "dustinschau.com/books",
          }),
          { width: 1200, height: 630, fonts }
        );
        return pngResponse(bytes, FALLBACK_CACHE);
      }
    }

    const title = urlParams.get("title") ?? "";
    const tags = urlParams.get("tags")?.split(",").filter(Boolean) ?? [];
    const avatarUrl = await toDataUri(AVATAR_URL);

    try {
      const bytes = await renderPng(OG({ tags, title, avatarUrl }), {
        width: 1200,
        height: 620,
        fonts,
      });
      return pngResponse(bytes, SUCCESS_CACHE_POST);
    } catch (error) {
      console.error("Post OG ImageResponse failed, using text fallback:", error);
      const bytes = await renderPng(
        FallbackOG({
          eyebrow: "Blog",
          title: title || "dustinschau.com",
          subtitle: "dustinschau.com",
        }),
        { width: 1200, height: 620, fonts }
      );
      return pngResponse(bytes, FALLBACK_CACHE);
    }
  } catch (error) {
    console.error("OG route failed:", error);
    const fallback = staticFallbackPng();
    if (fallback) {
      return pngResponse(fallback, FALLBACK_CACHE);
    }
    return errorResponse("OG image generation failed");
  }
};
