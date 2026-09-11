type NotificationEmail = {
  to: string;
  subject: string;
  body: string;
  url?: string | null;
};

const RESEND_API_URL = 'https://api.resend.com';
const DEFAULT_FROM_EMAIL = 'info@clubhualas.com.ar';

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function absoluteUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  const origin = process.env.APP_BASE_URL || process.env.NEXTAUTH_URL;
  if (!origin) return null;
  return `${origin.replace(/\/$/, '')}/${url.replace(/^\//, '')}`;
}

function renderNotificationHtml(email: NotificationEmail): string {
  const link = absoluteUrl(email.url);
  const button = link
    ? `<p><a href="${escapeHtml(link)}" style="display:inline-block;padding:10px 16px;background:#0f766e;color:#fff;border-radius:6px;text-decoration:none">Ver en Hualas</a></p>`
    : '';

  return `<!doctype html><html lang="es"><body style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.5"><h2>${escapeHtml(email.subject)}</h2><p>${escapeHtml(email.body).replaceAll('\n', '<br />')}</p>${button}<p style="color:#6b7280;font-size:12px">Club Hualas Patagónico</p></body></html>`;
}

export async function sendNotificationEmails(
  emails: NotificationEmail[]
): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey || emails.length === 0) return;

  const fromName = process.env.RESEND_FROM_NAME || 'Club Hualas';
  const fromEmail = process.env.RESEND_FROM_EMAIL || DEFAULT_FROM_EMAIL;
  const payload = emails.map((email) => ({
    from: `${fromName} <${fromEmail}>`,
    to: [email.to],
    subject: email.subject,
    html: renderNotificationHtml(email),
  }));

  for (let index = 0; index < payload.length; index += 100) {
    const response = await fetch(`${RESEND_API_URL}/emails/batch`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload.slice(index, index + 100)),
    });

    if (!response.ok) {
      const details = await response.text().catch(() => '');
      throw new Error(
        `Resend returned ${response.status}${details ? `: ${details.slice(0, 300)}` : ''}`
      );
    }
  }
}
