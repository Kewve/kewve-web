import nodemailer from "nodemailer";
const EMAIL_RE = /^\S+@\S+\.\S+$/;
/**
 * Sends a single transactional email using the same SMTP_* env as admin notifications.
 * No-op when SMTP is not configured or `to` is invalid.
 */
export async function sendTransactionalEmail(options) {
    const to = String(options.to || "")
        .trim()
        .toLowerCase();
    if (!EMAIL_RE.test(to)) {
        console.warn("[smtpTransactional] invalid or missing to address; skipping:", options.subject);
        return;
    }
    const host = process.env.SMTP_HOST?.trim();
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS?.trim();
    if (!host || !user || !pass) {
        console.warn("[smtpTransactional] SMTP not configured; skipping:", options.subject);
        return;
    }
    const port = parseInt(process.env.SMTP_PORT || "587", 10);
    const secure = process.env.SMTP_SECURE === "true";
    const transporter = nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
        requireTLS: !secure,
    });
    const from = process.env.SMTP_FROM?.trim() || user || "noreply@kewve.com";
    await transporter.sendMail({
        from,
        to,
        subject: options.subject,
        text: options.text,
        html: options.html,
    });
}
