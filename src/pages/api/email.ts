import { type APIRoute } from "astro";

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const formData = await request.formData()
  const name = formData.get('name')
  const email = formData.get('email')
  const message = formData.get('message')

  console.log({
    name,
    email,
    message
  })

  if (!name || !email || !message) {
    return new Response(
      JSON.stringify({
        message: `Missing required field`
      }),
      {
        status: 400
      }
    )
  }
  return new Response(
    JSON.stringify({
      message: `Success!`,
    }),
    {
      status: 200
    }
  );
}