'use server';

import { sendEmail } from '@/utils/emailConfig';

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:5000';
const BASE_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

export async function requestPasswordReset(email: string) {
  try {
    // Call backend to generate reset token
    const response = await fetch(`${BACKEND_URL}/api/auth/forgot-password`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const result = await response.json();

    if (!result.success) {
      return { success: false, error: result.message };
    }

    // If backend returned token data, send the email
    if (result.data?.resetToken) {
      const resetLink = `${BASE_URL}/reset-password?token=${result.data.resetToken}`;
      const userName = result.data.name || 'there';

      await sendEmail({
        to: email,
        subject: 'Reset Your Kewve Password',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 32px 24px;">
            <div style="text-align: center; margin-bottom: 32px;">
              <h1 style="color: #1a2e23; font-size: 24px; margin: 0;">Kewve</h1>
            </div>
            <h2 style="color: #1a2e23; font-size: 20px;">Password Reset Request</h2>
            <p style="color: #3d3935; font-size: 15px; line-height: 1.6;">
              Hi ${userName},
            </p>
            <p style="color: #3d3935; font-size: 15px; line-height: 1.6;">
              We received a request to reset your password. Click the button below to set a new password:
            </p>
            <div style="text-align: center; margin: 32px 0;">
              <a href="${resetLink}" 
                 style="display: inline-block; background-color: #1a2e23; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-size: 15px; font-weight: 600;">
                Reset Password
              </a>
            </div>
            <p style="color: #888; font-size: 13px; line-height: 1.6;">
              This link will expire in 1 hour. If you didn't request a password reset, you can safely ignore this email.
            </p>
            <hr style="border: none; border-top: 1px solid #eee; margin: 24px 0;" />
            <p style="color: #aaa; font-size: 12px; text-align: center;">
              Kewve — African Food Trade Platform
            </p>
          </div>
        `,
      });
    }

    return { success: true };
  } catch (error: any) {
    console.error('Password reset request error:', error);
    return { success: false, error: 'Failed to send reset email. Please try again.' };
  }
}
