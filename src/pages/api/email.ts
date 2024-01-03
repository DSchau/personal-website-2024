import { type APIRoute } from "astro";
import { Resend } from 'resend'
import { AkismetClient } from "akismet-api";

const resend = new Resend(import.meta.env.RESEND_API_KEY)
const client = new AkismetClient({
  key: import.meta.env.AKISMET_API_KEY,
  blog: 'https://dustinschau.com'
})

export const prerender = false;

export const POST: APIRoute = async ({ clientAddress, request }) => {
  try {
    const formData = await request.formData()
    const name = formData.get('name')
    const email = formData.get('email')
    const message = formData.get('message')

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
    const comment: any = {
      ip: clientAddress,
      useragent: request.headers.get('user-agent'),
      content: message,
      email,
      name
    }

    const isSpam = await client.checkSpam(comment)

    if (isSpam) {
      throw new Error(`Likely spam`)
    }

    const { data, error } = await resend.emails.send({
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
        isSpam,
        data
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