export type BookingNotificationRole = "client" | "site" | "driver";

export type BookingNotificationRecipient = {
  role: BookingNotificationRole;
  email: string;
};

type ResolveRecipientsInput = {
  clientEmail?: string | null;
  siteEmail?: string | null;
  driverEmail?: string | null;
  includeDriver?: boolean;
};

const normalizeEmail = (email?: string | null): string | null => {
  if (!email) return null;
  const normalized = email.trim().toLowerCase();
  return normalized.length ? normalized : null;
};

export function resolveBookingNotificationRecipients({
  clientEmail,
  siteEmail,
  driverEmail,
  includeDriver = false,
}: ResolveRecipientsInput): BookingNotificationRecipient[] {
  const seen = new Set<string>();
  const recipients: BookingNotificationRecipient[] = [];

  const append = (role: BookingNotificationRole, raw?: string | null) => {
    const email = normalizeEmail(raw);
    if (!email || seen.has(email)) return;
    seen.add(email);
    recipients.push({ role, email });
  };

  append("client", clientEmail);
  append("site", siteEmail);
  if (includeDriver) append("driver", driverEmail);

  return recipients;
}
