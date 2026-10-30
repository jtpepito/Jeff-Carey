import nodemailer from "nodemailer";

/** Plain-text email, sent through a Gmail (or other SMTP) account set in the environment. Same setup as Bake Hub. */
export type EmailMessage = { to: string; subject: string; text: string };
export type SendResult = { ok: true } | { ok: false; reason: string };
export type EmailSender = (m: EmailMessage) => Promise<SendResult>;

type Env = Record<string, string | undefined>;

/** A short, secret-free reason for the log and the admin (never the transport's message, which can echo credentials). */
function shortReason(err: unknown): string {
  const code = (err as { code?: string } | null)?.code ?? "";
  if (code === "EAUTH") return "auth failed";
  if (["ETIMEDOUT", "ECONNECTION", "ESOCKET", "EDNS", "ECONNREFUSED"].includes(code)) return "connection failed";
  if (code === "EENVELOPE") return "bad recipient";
  return "send failed";
}

export function emailConfigured(env: Env = process.env): boolean {
  return Boolean(env.SMTP_USER?.trim() && env.SMTP_PASSWORD?.trim());
}

export function createSender(env: Env): EmailSender {
  const user = env.SMTP_USER?.trim();
  // Gmail shows app passwords in groups of four; the spaces are not part of the password.
  const pass = env.SMTP_PASSWORD?.replace(/\s+/g, "");
  if (!user || !pass) return async () => ({ ok: false, reason: "not_configured" });

  const port = Number(env.SMTP_PORT) || 465;
  const transport = nodemailer.createTransport({
    host: env.SMTP_HOST?.trim() || "smtp.gmail.com",
    port,
    secure: port === 465,
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 20_000,
    auth: { user, pass },
  });
  const name = (env.SMTP_FROM_NAME?.trim() || "Jef&Carey").replace(/["\r\n]/g, "");
  return async (m) => {
    try {
      await transport.sendMail({ from: { name, address: user }, to: m.to, subject: m.subject, text: m.text });
      return { ok: true };
    } catch (err) {
      return { ok: false, reason: shortReason(err) };
    }
  };
}

let cached: EmailSender | null = null;
export function defaultSender(): EmailSender {
  cached ??= createSender(process.env);
  return cached;
}
