import { type APIRoute } from "astro";
import { Resend } from 'resend'
import { RESEND_API_KEY } from "astro:env/server";

const resend = new Resend(RESEND_API_KEY)

export const prerender = false;
interface ValidationResult {
  isMXValid: boolean;
  emailType: string;
  hasGravatar: boolean;
}

async function validateEmail(email: string): Promise<ValidationResult> {
  if (!email) throw new Error("Email is required");

  const isMXValid = await validateMXRecords(email);
  const emailType = checkEmailType(email);
  const hasGravatar = await checkGravatar(email);

  return {
    isMXValid,
    emailType,
    hasGravatar,
  };
}

// Helper function to check for MX records
export async function validateMXRecords(email: string): Promise<boolean> {
  const domain = email.split("@")[1];
  const dnsQuery = await fetch(`https://cloudflare-dns.com/dns-query?name=${domain}&type=MX`, {
    headers: { Accept: "application/dns-json" },
  });
  const dnsResponse = await dnsQuery.json();
  return !!(dnsResponse.Answer && dnsResponse.Answer.length > 0);
}

// Helper function to check if email is free, disposable, or role-based
export function checkEmailType(email: string): string {
  const domain = email.split("@")[1];
  const freeEmailProviders = ["gmail.com", "yahoo.com", "hotmail.com"];
  const disposableEmailProviders = ["mailinator.com", "10minutemail.com", "tempmail.com", /\.ru/] as (String | RegExp)[]
  const roleBasedKeywords = ["admin", "support", "info", "sales"];

  if (freeEmailProviders.includes(domain)) return "free";
  if (disposableEmailProviders.some(test => {
    if (typeof test === 'string') {
      return domain === test
    }
    return (test as RegExp).test(domain)
  })) return "disposable";

  const username = email.split("@")[0];
  if (roleBasedKeywords.some((role) => username.includes(role))) return "role-based";

  return "personal";
}

async function sha256Hash(text: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(text);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return hashHex;
}

// Helper function to check if an email has a Gravatar
export async function checkGravatar(email: string): Promise<boolean> {
  const hash = await sha256Hash(email)
  const gravatarUrl = `https://www.gravatar.com/avatar/${hash}?d=404`;

  const response = await fetch(gravatarUrl);
  return response.status === 200;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const formData = await request.formData()
    const name = formData.get('name')
    const email = formData.get('email') as string
    const message = formData.get('message')

    const { emailType, isMXValid, hasGravatar } = await validateEmail(email)

    const isValid = isMXValid && hasGravatar && emailType !== 'disposable'
    
    if (!isValid) {
      return new Response(JSON.stringify({
        error: 'Unable to validate e-mail'
      }), {
        status: 500
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