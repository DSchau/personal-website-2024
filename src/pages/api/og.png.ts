import { type APIRoute } from "astro";
import { ImageResponse } from "@cloudflare/pages-plugin-vercel-og/api";

import { OG } from "../../components/og/og";
import { BooksOG } from "../../components/og/books";
import { getRecentlyReadFirstPage } from "../../lib/goodreads";

export const prerender = false;

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
}

async function toDataUri(url: string): Promise<string> {
  if (!url) {
    return "";
  }

  try {
    // Satori can only rasterize jpeg/png/gif, so never ask for avif/webp.
    const response = await fetch(url, {
      headers: {
        Accept: "image/jpeg,image/png;q=0.9,image/gif;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (compatible; dustinschau.com/books; +https://www.dustinschau.com)",
      },
    });

    if (!response.ok) {
      return url;
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    if (!/^image\/(jpe?g|png|gif)/.test(contentType)) {
      // An unsupported format would make Satori throw; render the text
      // fallback for this book instead.
      return "";
    }

    const bytes = new Uint8Array(await response.arrayBuffer());
    return `data:${contentType};base64,${bytesToBase64(bytes)}`;
  } catch {
    return url;
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
    const recent = await getRecentlyReadFirstPage(5);
    const books = await Promise.all(
      recent.map(async (book) => ({
        title: book.title,
        author: book.author,
        imageUrl: await toDataUri(book.imageUrl),
      }))
    );

    const response = new ImageResponse(BooksOG({ books }), {
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
