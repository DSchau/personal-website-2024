import { type APIRoute } from "astro";
import arcjet, { validateEmail, type ArcjetNodeRequest } from "@arcjet/node";
import { Resend } from 'resend'

const resend = new Resend(import.meta.env.RESEND_API_KEY)

export const prerender = false;

const aj = arcjet({
  key: import.meta.env.ARCJET_KEY!,
  rules: [
    validateEmail({
      mode: "LIVE",
      block: ["DISPOSABLE", "INVALID", "NO_MX_RECORDS"],
    }),
  ],
});


export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData()
    const name = formData.get('name')
    const email = formData.get('email') as string
    const message = formData.get('message')

    const decision = await aj.protect(request as any, {
      email,
    });

    console.log("Arcjet decision", decision);
  
    if (decision.isDenied()) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403
      })
    }
  
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
    const { error } = await resend.emails.send({
      from: `Website Contact Form <website@dschau.dev>`,
      to: ['website@dustinschau.com'],
      subject: `Hello from website | ${name}`,
      html: `
        <h2>Received an e-mail from dustinschau.com</h2>
        <h3>From: <a href="mailto:${email}">${name} (${email})</h3>
        <p>${message}</p>
      `
    })
  
    if (error) {
      throw error
    }
    return new Response(
      JSON.stringify({
        message: `I received your response. Thanks! Go ahead and navigate back now.`,
      }),
      {
        status: 200
      }
    );
  } catch (e: any) {
    return new Response(
      JSON.stringify({
        message: e.message,
        stack: e.stack
      }),
      {
        status: 500
      }
    )
  }
}