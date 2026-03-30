import nodemailer from "nodemailer";
/**
 * Sends an email to ADMIN_EMAIL when SMTP_* env vars are set.
 * Logs and no-ops when not configured (local dev).
 */
export async function sendAdminNotificationEmail(options) {
    const to = process.env.ADMIN_EMAIL?.trim();
    if (!to) {
        console.warn("[adminMail] ADMIN_EMAIL not set; skipping notification:", options.subject);
        return;
    }
    const host = process.env.SMTP_HOST?.trim();
    const user = process.env.SMTP_USER?.trim();
    const pass = process.env.SMTP_PASS?.trim();
    if (!host || !user || !pass) {
        console.warn("[adminMail] SMTP not configured; would notify admin:", options.subject);
        console.warn(options.text);
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
