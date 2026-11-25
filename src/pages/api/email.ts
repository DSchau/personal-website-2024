import { type APIRoute } from "astro";
import { Resend } from 'resend'
import { RESEND_API_KEY } from "astro:env/server";
import { validateSender } from "../../lib/contact-email";

const resend = new Resend(RESEND_API_KEY)

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData()
    const name = String(formData.get('name') ?? '').trim()
    const email = String(formData.get('email') ?? '').trim()
    const message = String(formData.get('message') ?? '').trim()

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

    const sender = await validateSender(email)

    if (!sender.ok) {
      return new Response(JSON.stringify({
        error: sender.error
      }), {
        status: sender.status
      })
    }
    const { error } = await resend.emails.send({
      from: `Website Contact Form <website@dschau.dev>`,
      to: ['website@dustinschau.com'],
      replyTo: sender.email,
      subject: `Hello from website | ${name}`,
      html: `
        <h2>Received an e-mail from dustinschau.com</h2>
        <h3>From: <a href="mailto:${sender.email}">${name} (${sender.email})</h3>
        <p>${message}</p>
      `
    })
  
    if (error) {
      return new Response(JSON.stringify({
        error: 'Unable to send message right now'
      }), {
        status: 502
      })
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