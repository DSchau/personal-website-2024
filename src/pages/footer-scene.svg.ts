import type { APIRoute } from 'astro'
import { renderStaticScene } from '@/components/footer/scene'

export const prerender = true

export const GET: APIRoute = () =>
  new Response(renderStaticScene(), {
    headers: { 'Content-Type': 'image/svg+xml' },
  })
