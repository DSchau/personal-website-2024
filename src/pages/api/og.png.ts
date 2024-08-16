import { type APIRoute } from "astro";

import { ImageResponse } from '@vercel/og';

export const prerender = true

export const GET: APIRoute = async function GET() {
  return new ImageResponse({
    type: 'h1',
    key: '1234',
    props: {
      children: 'Hello World'
    }
  }, {
    width: 1200,
    height: 300
  })
}