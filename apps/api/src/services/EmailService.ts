import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

class EmailService {
  private client: SESClient | null = null;
  private fromEmail: string = "";

  constructor() {
    this.initClient();
  }

  private initClient(): void {
    const region = process.env.AWS_SES_REGION;
    const accessKeyId = process.env.AWS_SES_ACCESS_KEY_ID;
    const secretAccessKey = process.env.AWS_SES_SECRET_ACCESS_KEY;
    this.fromEmail = process.env.AWS_SES_FROM_EMAIL || "";

    if (!region || !accessKeyId || !secretAccessKey || !this.fromEmail) {
      console.warn(
        "EmailService: AWS SES not configured (AWS_SES_REGION, AWS_SES_ACCESS_KEY_ID, AWS_SES_SECRET_ACCESS_KEY, AWS_SES_FROM_EMAIL required). Emails will be logged to console.",
      );
      return;
    }

    this.client = new SESClient({
      region,
      credentials: { accessKeyId, secretAccessKey },
    });
  }

  private escapeHtml(str: string): string {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  private async sendEmail(
    to: string,
    subject: string,
    html: string,
  ): Promise<void> {
    if (!this.client) {
      console.log(`EmailService [DEV]: Would send "${subject}" to ${to}`);
      return;
    }

    const command = new SendEmailCommand({
      Source: this.fromEmail,
      Destination: { ToAddresses: [to] },
      Message: {
        Subject: { Data: subject, Charset: "UTF-8" },
        Body: { Html: { Data: html, Charset: "UTF-8" } },
      },
    });

    try {
      await this.client.send(command);
      console.log(`EmailService: Email sent to ${to} — "${subject}"`);
    } catch (error: unknown) {
      const msg = error instanceof Error ? error.message : String(error);
      console.error(`EmailService: Failed to send to ${to} — ${msg}`);
      throw error;
    }
  }

  async sendPasswordResetEmail(
    to: string,
    resetToken: string,
    userName?: string,
  ): Promise<void> {
    const frontendUrl =
      process.env.FRONTEND_URL || "http://localhost:5173";
    const resetLink = `${frontendUrl}/#/reset-password?token=${resetToken}`;
    const safeGreeting = userName ? `Hi ${this.escapeHtml(userName)},` : "Hi,";

    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: linear-gradient(135deg, #2d3748 0%, #1a202c 100%); border-radius: 12px; padding: 40px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px;">HARI</h1>
          <p style="color: #a0aec0; margin: 5px 0 0; font-size: 14px;">HR Intelligence by AIYA</p>
        </div>
        <div style="background: #ffffff; border-radius: 12px; padding: 32px; border: 1px solid #e2e8f0;">
          <h2 style="color: #2d3748; margin-top: 0;">Password Reset Request</h2>
          <p style="color: #4a5568; line-height: 1.6;">${safeGreeting}</p>
          <p style="color: #4a5568; line-height: 1.6;">
            We received a request to reset your password. Click the button below to set a new password.
            This link will expire in <strong>30 minutes</strong>.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}"
               style="background: linear-gradient(135deg, #2d3748 0%, #4a5568 100%); color: #ffffff; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p style="color: #718096; font-size: 13px; line-height: 1.6;">
            If you didn't request this, you can safely ignore this email. Your password will remain unchanged.
          </p>
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="color: #a0aec0; font-size: 12px;">
            If the button doesn't work, copy and paste this link into your browser:<br/>
            <a href="${resetLink}" style="color: #4a90d9; word-break: break-all;">${resetLink}</a>
          </p>
        </div>
        <p style="color: #a0aec0; font-size: 12px; text-align: center; margin-top: 20px;">
          &copy; 2026 AIYA Technology. All rights reserved.
        </p>
      </div>
    `;

    await this.sendEmail(to, "HARI - Password Reset Request", html);
  }

  async sendPasswordResetConfirmation(
    to: string,
    userName?: string,
  ): Promise<void> {
    const safeGreeting = userName ? `Hi ${this.escapeHtml(userName)},` : "Hi,";

    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: linear-gradient(135deg, #2d3748 0%, #1a202c 100%); border-radius: 12px; padding: 40px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px;">HARI</h1>
          <p style="color: #a0aec0; margin: 5px 0 0; font-size: 14px;">HR Intelligence by AIYA</p>
        </div>
        <div style="background: #ffffff; border-radius: 12px; padding: 32px; border: 1px solid #e2e8f0;">
          <h2 style="color: #2d3748; margin-top: 0;">Password Changed Successfully</h2>
          <p style="color: #4a5568; line-height: 1.6;">${safeGreeting}</p>
          <p style="color: #4a5568; line-height: 1.6;">
            Your password has been successfully reset. You can now log in with your new password.
          </p>
          <p style="color: #e53e3e; font-size: 13px; line-height: 1.6;">
            If you did not make this change, please contact your HR administrator immediately.
          </p>
        </div>
        <p style="color: #a0aec0; font-size: 12px; text-align: center; margin-top: 20px;">
          &copy; 2026 AIYA Technology. All rights reserved.
        </p>
      </div>
    `;

    await this.sendEmail(to, "HARI - Password Changed Successfully", html);
  }

  async sendNotificationEmail(
    to: string,
    title: string,
    message: string,
    link?: string,
  ): Promise<void> {
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const actionUrl = link ? `${frontendUrl}/#${link}` : frontendUrl;

    const html = `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; padding: 40px 20px;">
        <div style="background: linear-gradient(135deg, #2d3748 0%, #1a202c 100%); border-radius: 12px; padding: 40px; text-align: center; margin-bottom: 30px;">
          <h1 style="color: #ffffff; margin: 0; font-size: 28px;">HARI</h1>
          <p style="color: #a0aec0; margin: 5px 0 0; font-size: 14px;">HR Intelligence by AIYA</p>
        </div>
        <div style="background: #ffffff; border-radius: 12px; padding: 32px; border: 1px solid #e2e8f0;">
          <h2 style="color: #2d3748; margin-top: 0;">${this.escapeHtml(title)}</h2>
          <p style="color: #4a5568; line-height: 1.6;">${this.escapeHtml(message)}</p>
          ${link ? `
          <div style="text-align: center; margin: 24px 0;">
            <a href="${actionUrl}"
               style="background: linear-gradient(135deg, #2d3748 0%, #4a5568 100%); color: #ffffff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 600; display: inline-block;">
              View in HARI
            </a>
          </div>` : ''}
        </div>
        <p style="color: #a0aec0; font-size: 12px; text-align: center; margin-top: 20px;">
          You can turn off email notifications in <a href="${frontendUrl}/#/settings" style="color: #4a90d9;">Settings</a>.
        </p>
      </div>
    `;

    await this.sendEmail(to, `HARI — ${title}`, html);
  }
}

export default new EmailService();
