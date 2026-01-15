import nodemailer from 'nodemailer';
import { readFileSync } from 'fs';
import { join } from 'path';

// SMTP Configuration from environment variables (IONOS email hosting)
const SMTP_CONFIG = {
  host: process.env.SMTP_HOST || 'smtp.ionos.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true', // false for 587 (STARTTLS), true for 465 (SSL)
  auth: {
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
  },
  // IONOS requires STARTTLS for port 587
  requireTLS: !process.env.SMTP_SECURE || process.env.SMTP_SECURE === 'false',
};

// Create transporter
export const createEmailTransporter = () => {
  const config = {
    ...SMTP_CONFIG,
    // Ensure proper TLS configuration for IONOS
    tls: {
      rejectUnauthorized: false, // Some IONOS configurations may need this
    },
  };
  
  return nodemailer.createTransport(config);
};

// Verify SMTP connection
export const verifySMTPConnection = async () => {
  const transporter = createEmailTransporter();
  try {
    await transporter.verify();
    console.log('✅ SMTP server is ready to send emails');
    return true;
  } catch (error) {
    console.error('❌ SMTP connection error:', error);
    return false;
  }
};

// Send email helper
export const sendEmail = async (options: {
  to: string | string[];
  subject: string;
  html: string;
  from?: string;
  attachFooterImage?: boolean; // If true, embed footer image as attachment
}) => {
  const transporter = createEmailTransporter();
  const fromEmail = options.from || process.env.SMTP_FROM || process.env.SMTP_USER || 'abiola@kewve.com';

  try {
    const mailOptions: any = {
      from: `"Kewve" <${fromEmail}>`,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      subject: options.subject,
      html: options.html,
    };

    // Attach footer image if requested (for inline display)
    if (options.attachFooterImage) {
      try {
        // Try to read from public/images first (Next.js public folder)
        const publicImagePath = join(process.cwd(), 'public', 'images', 'email-footer.png');
        const footerImage = readFileSync(publicImagePath);
        
        mailOptions.attachments = [
          {
            filename: 'email-footer.png',
            content: footerImage,
            cid: 'footer-image', // Content-ID for inline image
          },
        ];
      } catch (error) {
        // Fallback: try backend assets folder
        try {
          const backendImagePath = join(process.cwd(), 'backend', 'src', 'assets', 'email footer.png');
          const footerImage = readFileSync(backendImagePath);
          
          mailOptions.attachments = [
            {
              filename: 'email-footer.png',
              content: footerImage,
              cid: 'footer-image',
            },
          ];
        } catch (backendError) {
          console.warn('⚠️ Could not attach footer image, email will use URL fallback');
        }
      }
    }

    const info = await transporter.sendMail(mailOptions);

    console.log('✅ Email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending email:', error);
    throw error;
  }
};
