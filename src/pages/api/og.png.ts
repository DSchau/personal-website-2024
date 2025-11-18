import { type APIRoute } from "astro";
import { ImageResponse } from "@cloudflare/pages-plugin-vercel-og/api";

import { OG } from "../../components/og/og"

export const prerender = false;

export const GET: APIRoute = async function GET({ request }) {
  const url = new URL(request.url);
  const urlParams = url.searchParams;

  const title = urlParams.get("title") as string;
  const tags = urlParams.get("tags")?.split(",") as string[];
  // const type = urlParams.get("type") as string;

  const [rockwell, rockwellBold, sfPro] = await Promise.all([
    import("../../assets/fonts/Rockwell.ttf").then((mod) => mod.default),
    import("../../assets/fonts/Rockwell-Bold.ttf").then((mod) => mod.default),
    import("../../assets/fonts/SFPro.otf").then((mod) => mod.default),
  ]).then((all) => all.map((part) => Buffer.from(part)));

  const response = new ImageResponse(
    OG({ tags, title }),
    {
      width: 1200,
      height: 620,
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
    }
  );

  response.headers.set("Content-Type", "image/png");
  response.headers.set("Cache-Control", "public, max-age=31536000");

  return response
};