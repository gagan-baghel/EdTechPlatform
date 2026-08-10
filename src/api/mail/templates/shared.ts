/**
 * Shared chrome for every transactional email — logo, header/footer, support
 * address. Previously each of the six templates duplicated ~40 lines of this
 * HTML with the origin tutorial project's own domain, support inbox, and a
 * logo hot-linked from a free third-party image host baked in. Centralising
 * it here means there is exactly one place that ever needs the brand again.
 */

function getEmailBaseUrl() {
  const configured =
    process.env.APP_BASE_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "")

  if (configured) {
    const withProtocol = /^https?:\/\//i.test(configured)
      ? configured
      : `https://${configured}`
    return withProtocol.replace(/\/+$/, "")
  }

  if (process.env.NODE_ENV === "production") {
    console.error("APP_BASE_URL is not configured — email links will be wrong")
  }

  return "http://localhost:3000"
}

function getSupportEmail() {
  return process.env.SUPPORT_EMAIL || "support@intellecraft.com"
}

function escapeHtml(value: unknown): string {
  const replacements: Record<string, string> = {
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  }
  return String(value ?? "").replace(/[&<>"']/g, (char) => replacements[char] ?? char)
}

const STYLES = `
  body {
      background-color: #ffffff;
      font-family: Arial, sans-serif;
      font-size: 16px;
      line-height: 1.4;
      color: #333333;
      margin: 0;
      padding: 0;
  }
  .container {
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
      text-align: center;
  }
  .logo {
      max-width: 200px;
      margin-bottom: 20px;
  }
  .message {
      font-size: 18px;
      font-weight: bold;
      margin-bottom: 20px;
  }
  .body {
      font-size: 16px;
      margin-bottom: 20px;
  }
  .cta {
      display: inline-block;
      padding: 10px 20px;
      background-color: #FFD60A;
      color: #000000;
      text-decoration: none;
      border-radius: 5px;
      font-size: 16px;
      font-weight: bold;
      margin-top: 20px;
  }
  .support {
      font-size: 14px;
      color: #999999;
      margin-top: 20px;
  }
  .highlight {
      font-weight: bold;
  }
`

export interface EmailCta {
  href: string
  label: string
}

export interface EmailLayoutOptions {
  /** <title> tag text. */
  title: string
  /** Visible heading under the logo. */
  heading: string
  /**
   * Pre-built HTML for the message body. Callers are responsible for
   * escaping any user-supplied value they interpolate into it — this is the
   * one field deliberately NOT escaped, because templates need real markup.
   */
  bodyHtml: string
  cta?: EmailCta
}

function emailLayout({ title, heading, bodyHtml, cta }: EmailLayoutOptions): string {
  const baseUrl = getEmailBaseUrl()
  const supportEmail = getSupportEmail()

  return `<!DOCTYPE html>
<html>

<head>
    <meta charset="UTF-8">
    <title>${escapeHtml(title)}</title>
    <style>${STYLES}</style>
</head>

<body>
    <div class="container">
        <a href="${baseUrl}"><img class="logo" src="${baseUrl}/logo.png" alt="IntelleCraft logo"></a>
        <div class="message">${escapeHtml(heading)}</div>
        <div class="body">
            ${bodyHtml}
        </div>
        ${cta ? `<a class="cta" href="${cta.href}">${escapeHtml(cta.label)}</a>` : ""}
        <div class="support">If you have any questions or need assistance, please feel free to reach out to us at <a href="mailto:${supportEmail}">${supportEmail}</a>. We are here to help!</div>
    </div>
</body>

</html>`
}
export { emailLayout, getEmailBaseUrl, getSupportEmail, escapeHtml }