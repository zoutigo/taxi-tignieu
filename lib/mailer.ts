const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM = "no-reply@taxitignieu.fr",
} = process.env;

const smtpPort = SMTP_PORT ? Number(SMTP_PORT) : undefined;
let cachedTransport: { sendMail: (opts: unknown) => Promise<unknown> } | null | undefined;

async function getTransport() {
  if (cachedTransport !== undefined) return cachedTransport;
  if (!SMTP_HOST || !smtpPort) {
    cachedTransport = null;
    return null;
  }

  try {
    const mod = (await import("nodemailer")) as {
      createTransport?: (opts: unknown) => { sendMail: (opts: unknown) => Promise<unknown> };
      default?: {
        createTransport?: (opts: unknown) => { sendMail: (opts: unknown) => Promise<unknown> };
      };
    };
    const factory = mod?.createTransport ?? mod?.default?.createTransport;
    if (!factory) {
      cachedTransport = null;
      return null;
    }

    cachedTransport = factory({
      host: SMTP_HOST,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: SMTP_USER && SMTP_PASS ? { user: SMTP_USER, pass: SMTP_PASS } : undefined,
    });
    return cachedTransport;
  } catch (err) {
    console.error("[mailer] nodemailer indisponible", err);
    cachedTransport = null;
    return null;
  }
}

export type BookingMailPayload = {
  to: string;
  subject: string;
  html: string;
  text: string;
};

export async function sendMail(payload: BookingMailPayload) {
  const transport = await getTransport();
  if (!transport) {
    console.warn("[mailer] Transport non configuré, email ignoré");
    return;
  }

  await transport.sendMail({
    from: SMTP_FROM,
    to: payload.to,
    subject: payload.subject,
    html: payload.html,
    text: payload.text,
  });
}
