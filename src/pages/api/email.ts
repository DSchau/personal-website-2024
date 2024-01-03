import { type APIRoute } from "astro";
import { Resend } from 'resend'
import { validate } from 'deep-email-validator'

const resend = new Resend(import.meta.env.RESEND_API_KEY)

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData()
    const name = formData.get('name') as string
    const email = formData.get('email') as string
    const message = formData.get('message') as string
  
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
    let { error } = await resend.emails.send({
      from: `Website Contact Form <website@dschau.dev>`,
      to: ['website@dustinschau.com'],
      subject: `Hello from website | ${name}`,
      html: `
        <h2>Received an e-mail from dustinschau.com</h2>
        <h3>From: <a href="mailto:${email}">${name} (${email})</h3>
        <p>${message}</p>
      `
    })

    const { valid } = await validate({
      email,
      sender: email,
      validateSMTP: false
    })

    if (!valid) {
      error = new Error(`Email ${email} may be spam. Rejecting.`) as any
    }

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