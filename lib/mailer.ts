const {
  SMTP_HOST,
  SMTP_PORT,
  SMTP_USER,
  SMTP_PASS,
  SMTP_FROM = "no-reply@taxi-tignieu-charvieu.fr",
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

type BookingMailStatus = "pending" | "confirmed" | "cancelled";

type BookingEmailInput = {
  status: BookingMailStatus;
  badgeLabel?: string;
  statusLabel?: string;
  title: string;
  intro: string;
  blockTitle?: string;
  bookingRef?: string;
  pickupDateTime: string;
  pickupAddress: string;
  dropoffAddress: string;
  passengers: string;
  luggage: string;
  paymentMethod?: string;
  manageUrl?: string;
  contactName?: string;
  contactEmail?: string;
  contactPhone?: string;
  changes?: string[];
  phone?: string;
  email?: string;
  brandCity?: string;
  preheader?: string;
  siteUrl?: string;
  privacyUrl?: string;
  legalUrl?: string;
};

function renderBookingHtml(input: BookingEmailInput) {
  const {
    status,
    badgeLabel = status === "confirmed"
      ? "Réservation confirmée"
      : status === "cancelled"
        ? "Réservation annulée"
        : "Réservation reçue",
    title,
    intro,
    blockTitle = "Détails de votre trajet",
    bookingRef = "—",
    pickupDateTime,
    pickupAddress,
    dropoffAddress,
    passengers,
    luggage,
    paymentMethod = "À confirmer",
    manageUrl = "#",
    phone = "",
    email = "",
    brandCity = "Tignieu-Jameyzieu",
    preheader = "",
    siteUrl = "",
    privacyUrl = "",
    legalUrl = "",
    contactName = "",
    contactEmail = "",
    contactPhone = "",
    changes = [],
    statusLabel = "",
  } = input;

  const changesHtml =
    statusLabel || changes.length
      ? `<tr>
            <td style="padding:0 20px 12px 20px;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#e8f4ff;border-radius:14px;padding:14px;border:1px solid rgba(11,60,107,0.18);">
                ${statusLabel ? `<tr><td style="color:#0b3c6b;font-weight:800;font-size:13px;">${statusLabel}</td></tr>` : ""}
                ${
                  changes.length
                    ? `<tr><td style="padding-top:6px;">
                        <ul style="margin:0;padding-left:16px;color:#0b1220;font-size:13px;line-height:1.5;">
                          ${changes.map((c) => `<li>${c}</li>`).join("")}
                        </ul>
                      </td></tr>`
                    : ""
                }
              </table>
            </td>
          </tr>`
      : "";

  return {
    html: `<!doctype html>
<html lang="fr">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>Taxi Tignieu Charvieu — Email</title>
  </head>
  <body style="margin:0;padding:0;background:#f4f6fb;font-family:Arial,Helvetica,sans-serif;color:#0b1220;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${preheader}</div>
    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f4f6fb;padding:24px 12px;">
      <tr>
        <td align="center">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="max-width:680px;background:#ffffff;border-radius:18px;overflow:hidden;box-shadow:0 12px 30px rgba(11,60,107,0.12);">
            <tr>
              <td style="background:#0b3c6b;padding:18px 20px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="width:100%;">
                  <tr>
                    <td valign="middle">
                      <table role="presentation" cellspacing="0" cellpadding="0" style="width:auto;">
                        <tr>
                          <td style="background:#f6c431;border-radius:14px;padding:10px 12px;display:inline-block;">
                            <span style="display:inline-block;font-size:14px;font-weight:700;color:#0b3c6b;letter-spacing:0.2px;">
                              🚕
                            </span>
                          </td>
                          <td style="padding-left:12px;">
                            <div style="font-size:18px;font-weight:800;color:#ffffff;line-height:1.1;">Taxi Tignieu Charvieu</div>
                            <div style="font-size:12px;color:rgba(255,255,255,0.85);margin-top:2px;">À votre service 24/7</div>
                          </td>
                        </tr>
                      </table>
                    </td>
                    <td align="right" valign="middle">
                      <a href="${phone ? `tel:${phone}` : "#"}" style="display:inline-block;background:transparent;border:1px solid rgba(246,196,49,0.7);color:#ffffff;text-decoration:none;padding:10px 14px;border-radius:12px;font-size:13px;font-weight:700;">Appeler</a>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:22px 20px 0 20px;">
                <div style="display:inline-block;background:rgba(11,60,107,0.06);color:#0b3c6b;padding:6px 10px;border-radius:999px;font-size:12px;font-weight:700;letter-spacing:0.12em;text-transform:uppercase;">
                  ${badgeLabel}
                </div>
                <h1 style="margin:14px 0 6px 0;font-size:28px;line-height:1.15;color:#0b1220;">
                  ${title}
                </h1>
                <p style="margin:0 0 14px 0;color:#334155;font-size:15px;line-height:1.5;">
                  ${intro}
                </p>
              </td>
            </tr>
            <tr>
              <td style="padding:0 20px 12px 20px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#e5f1ff;border-radius:14px;padding:14px;">
                  <tr>
                    <td style="font-size:14px;color:#0b3c6b;line-height:1.5;font-weight:700;padding-bottom:6px;">
                      Vos coordonnées
                    </td>
                  </tr>
                  <tr>
                    <td style="font-size:13px;color:#0b1220;line-height:1.5;">
                      ${contactName ? `👤 ${contactName}<br/>` : ""}
                      ${contactPhone ? `📞 ${contactPhone}<br/>` : ""}
                      ${contactEmail ? `✉️ ${contactEmail}` : ""}
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            ${changesHtml}
            <tr>
              <td style="padding:0 20px 18px 20px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#0b3c6b;border-radius:16px;padding:16px 16px 14px 16px;">
                  <tr>
                    <td style="color:#ffffff;">
                      <div style="font-size:16px;font-weight:800;margin-bottom:10px;">${blockTitle}</div>
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="font-size:14px;line-height:1.4;">
                        <tr><td style="padding:6px 0;color:rgba(255,255,255,0.85);width:160px;">Référence</td><td style="padding:6px 0;color:#ffffff;font-weight:700;">${bookingRef}</td></tr>
                        <tr><td style="padding:6px 0;color:rgba(255,255,255,0.85);">Date & heure</td><td style="padding:6px 0;color:#ffffff;font-weight:700;">${pickupDateTime}</td></tr>
                        <tr><td style="padding:6px 0;color:rgba(255,255,255,0.85);">Départ</td><td style="padding:6px 0;color:#ffffff;font-weight:700;">${pickupAddress}</td></tr>
                        <tr><td style="padding:6px 0;color:rgba(255,255,255,0.85);">Destination</td><td style="padding:6px 0;color:#ffffff;font-weight:700;">${dropoffAddress}</td></tr>
                        <tr><td style="padding:6px 0;color:rgba(255,255,255,0.85);">Passagers</td><td style="padding:6px 0;color:#ffffff;font-weight:700;">${passengers}</td></tr>
                        <tr><td style="padding:6px 0;color:rgba(255,255,255,0.85);">Bagages</td><td style="padding:6px 0;color:#ffffff;font-weight:700;">${luggage}</td></tr>
                        <tr><td style="padding:6px 0;color:rgba(255,255,255,0.85);">Paiement</td><td style="padding:6px 0;color:#ffffff;font-weight:700;">${paymentMethod}</td></tr>
                      </table>
                      <div style="margin-top:14px;">
                        <a href="${manageUrl}" style="display:inline-block;background:#f6c431;color:#0b3c6b;text-decoration:none;padding:12px 16px;border-radius:14px;font-size:14px;font-weight:900;">Modifier / Annuler</a>
                        <span style="display:inline-block;margin-left:10px;color:rgba(255,255,255,0.85);font-size:13px;">
                          Besoin d’aide ? <a href="${phone ? `tel:${phone}` : "#"}" style="color:#ffffff;font-weight:800;text-decoration:underline;">${phone}</a>
                        </span>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:0 20px 18px 20px;">
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                  <tr>
                    <td style="padding:0 6px 0 0;" width="33%">
                      <div style="background:#ffffff;border:1px solid #e8eef7;border-radius:16px;padding:12px 12px;">
                        <div style="font-weight:800;color:#0b1220;">Ponctualité</div>
                        <div style="color:#475569;font-size:13px;line-height:1.4;margin-top:4px;">Confirmation rapide et suivi.</div>
                      </div>
                    </td>
                    <td style="padding:0 6px;" width="33%">
                      <div style="background:#ffffff;border:1px solid #e8eef7;border-radius:16px;padding:12px 12px;">
                        <div style="font-weight:800;color:#0b1220;">Confort</div>
                        <div style="color:#475569;font-size:13px;line-height:1.4;margin-top:4px;">Trajet serein, véhicule propre.</div>
                      </div>
                    </td>
                    <td style="padding:0 0 0 6px;" width="33%">
                      <div style="background:#ffffff;border:1px solid #e8eef7;border-radius:16px;padding:12px 12px;">
                        <div style="font-weight:800;color:#0b1220;">24/7</div>
                        <div style="color:#475569;font-size:13px;line-height:1.4;margin-top:4px;">Disponibles jour & nuit.</div>
                      </div>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
            <tr>
              <td style="padding:16px 20px;background:#f8fafc;border-top:1px solid #eef2f7;">
                <div style="font-size:13px;color:#475569;line-height:1.5;">
                  <strong>Taxi Tignieu</strong> — ${brandCity}<br/>
                  📞 <a href="${phone ? `tel:${phone}` : "#"}" style="color:#0b3c6b;font-weight:800;text-decoration:none;">${phone}</a>
                  &nbsp;•&nbsp; ✉️ <a href="${email ? `mailto:${email}` : "#"}" style="color:#0b3c6b;font-weight:800;text-decoration:none;">${email}</a>
                  &nbsp;•&nbsp; 🌐 <a href="${siteUrl}" style="color:#0b3c6b;font-weight:800;text-decoration:none;">taxi-tignieu-charvieu.fr</a>
                </div>
                <div style="margin-top:10px;font-size:12px;color:#64748b;line-height:1.4;">
                  Vous recevez cet email suite à votre demande sur notre site.<br/>
                  <a href="${privacyUrl || siteUrl}" style="color:#64748b;text-decoration:underline;">Politique de confidentialité</a>
                  &nbsp;•&nbsp;
                  <a href="${legalUrl || siteUrl}" style="color:#64748b;text-decoration:underline;">Mentions légales</a>
                </div>
              </td>
            </tr>
          </table>
          <div style="max-width:680px;margin:10px auto 0 auto;font-size:11px;color:#94a3b8;text-align:center;">
            © ${new Date().getFullYear()} Taxi Tignieu. Tous droits réservés.
          </div>
        </td>
      </tr>
    </table>
  </body>
</html>`,
    text: [
      `${badgeLabel} - ${title}`,
      intro,
      "",
      `${blockTitle}`,
      `Référence : ${bookingRef}`,
      `Date & heure : ${pickupDateTime}`,
      `Départ : ${pickupAddress}`,
      `Destination : ${dropoffAddress}`,
      `Passagers : ${passengers}`,
      `Bagages : ${luggage}`,
      `Paiement : ${paymentMethod}`,
      contactName ? `Nom : ${contactName}` : "",
      contactPhone ? `Téléphone : ${contactPhone}` : "",
      contactEmail ? `Email : ${contactEmail}` : "",
      manageUrl ? `Gestion : ${manageUrl}` : "",
      statusLabel ? `Statut : ${statusLabel}` : "",
      ...changes.map((c) => `Changement : ${c}`),
      phone ? `Assistance : ${phone}` : "",
      email ? `Contact : ${email}` : "",
    ]
      .filter(Boolean)
      .join("\n"),
  };
}

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

export function buildBookingEmail(params: BookingEmailInput & { to: string }) {
  const { html, text } = renderBookingHtml(params);
  const subject =
    params.status === "confirmed"
      ? "Votre réservation est confirmée"
      : params.status === "cancelled"
        ? "Votre réservation est annulée"
        : params.badgeLabel || params.statusLabel || "Nous avons bien reçu votre réservation";

  return {
    to: params.to,
    subject,
    html,
    text,
  };
}
