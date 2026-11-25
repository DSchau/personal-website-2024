export type SenderValidation =
  | { ok: true; email: string }
  | { ok: false; status: 400 | 502; error: string };

export function normalizeEmail(input: string): string | null {
  const email = input.trim();
  if (/\s/.test(email)) return null;

  const parts = email.split("@");
  if (parts.length !== 2) return null;

  const [local, domain] = parts;
  if (!local || !domain || !domain.includes(".")) return null;

  return `${local}@${domain.toLowerCase()}`;
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

export async function hasMXRecords(domain: string, fetchImpl: typeof fetch = fetch): Promise<boolean> {
  const response = await fetchImpl(
    `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(domain)}&type=MX`,
    { headers: { Accept: "application/dns-json" } }
  );
  if (!response.ok) throw new Error(`DNS lookup failed with status ${response.status}`);

  const { Answer } = await response.json();
  return Array.isArray(Answer) && Answer.length > 0;
}

export async function validateSender(input: string, fetchImpl: typeof fetch = fetch): Promise<SenderValidation> {
  const email = normalizeEmail(input);
  if (!email) {
    return { ok: false, status: 400, error: "Please enter a valid e-mail address" };
  }

  if (checkEmailType(email) === "disposable") {
    return { ok: false, status: 400, error: "Please use a non-disposable e-mail address" };
  }

  let hasMX: boolean;
  try {
    hasMX = await hasMXRecords(email.split("@")[1], fetchImpl);
  } catch {
    return { ok: false, status: 502, error: "Unable to verify e-mail right now" };
  }
  if (!hasMX) {
    return { ok: false, status: 400, error: "That e-mail address's domain can't receive e-mail" };
  }

  return { ok: true, email };
}
