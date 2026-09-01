import { type APIRoute } from "astro";
import { ImageResponse } from "@cloudflare/pages-plugin-vercel-og/api";

import { OG } from "../../components/og/og";

export const prerender = false;

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

export const GET: APIRoute = async function GET({ request, redirect }) {
  const url = new URL(request.url);
  const urlParams = url.searchParams;

  // The books card can't be rendered inside a Worker request: satori +
  // resvg with six embedded covers blows the 10ms CPU budget (Cloudflare
  // error 1102) or truncates the PNG mid-stream. It's prerendered at
  // build time instead — send old links to the static asset.
  if (urlParams.get("type") === "books") {
    return redirect("/og/books.png", 302);
  }

  const title = urlParams.get("title") as string;
  const tags = urlParams.get("tags")?.split(",") as string[];

  const response = new ImageResponse(OG({ tags, title }), {
    width: 1200,
    height: 620,
    fonts: await loadFonts(),
  });

  response.headers.set("Content-Type", "image/png");
  response.headers.set("Cache-Control", "public, max-age=31536000");

  return response;
};
