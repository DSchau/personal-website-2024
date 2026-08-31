import { type APIRoute } from "astro";
import { ImageResponse } from "@cloudflare/pages-plugin-vercel-og/api";

import { BooksOG } from "../../../components/og/books";
import { getRecentlyRead } from "../../../lib/goodreads";

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
    const response = await fetch(url, {
      headers: {
        Accept: "image/avif,image/webp,image/*,*/*;q=0.8",
        "User-Agent":
          "Mozilla/5.0 (compatible; dustinschau.com/books; +https://www.dustinschau.com)",
      },
    });

    if (!response.ok) {
      return url;
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";
    if (!contentType.startsWith("image/")) {
      return url;
    }

    const bytes = new Uint8Array(await response.arrayBuffer());
    return `data:${contentType};base64,${bytesToBase64(bytes)}`;
  } catch {
    return url;
  }
}

export const GET: APIRoute = async function GET() {
  const recent = await getRecentlyRead(5);
  const books = await Promise.all(
    recent.map(async (book) => ({
      title: book.title,
      author: book.author,
      imageUrl: await toDataUri(book.imageUrl),
    }))
  );

  const [rockwell, rockwellBold, sfPro] = await Promise.all([
    import("../../../assets/fonts/Rockwell.ttf").then((mod) => mod.default),
    import("../../../assets/fonts/Rockwell-Bold.ttf").then((mod) => mod.default),
    import("../../../assets/fonts/SFPro.otf").then((mod) => mod.default),
  ]);

  const response = new ImageResponse(BooksOG({ books }), {
    width: 1200,
    height: 630,
    fonts: [
      {
        name: "Rockwell Bold",
        data: rockwellBold,
        style: "normal",
      },
      {
        name: "Rockwell",
        data: rockwell,
        style: "normal",
      },
      {
        name: "SFPro",
        data: sfPro,
        style: "normal",
      },
    ],
  });

  response.headers.set("Content-Type", "image/png");
  response.headers.set(
    "Cache-Control",
    "public, max-age=3600, s-maxage=86400"
  );

  return response;
};
