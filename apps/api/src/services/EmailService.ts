import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

type Lang = "en" | "th";

const t: Record<string, Record<Lang, string>> = {
  tagline:            { en: "HR Intelligence by AIYA",                                                              th: "HR Intelligence by AIYA" },
  copyright:          { en: "&copy; 2026 AIYA Technology. All rights reserved.",                                    th: "&copy; 2026 AIYA Technology สงวนลิขสิทธิ์" },
  // Password reset request
  resetTitle:         { en: "Password Reset Request",                                                               th: "คำขอรีเซ็ตรหัสผ่าน" },
  resetSubject:       { en: "HARI - Password Reset Request",                                                        th: "HARI - คำขอรีเซ็ตรหัสผ่าน" },
  resetBody:          { en: "We received a request to reset your password. Click the button below to set a new password. This link will expire in <strong>30 minutes</strong>.", th: "เราได้รับคำขอรีเซ็ตรหัสผ่านของคุณ คลิกปุ่มด้านล่างเพื่อตั้งรหัสผ่านใหม่ ลิงก์นี้จะหมดอายุใน <strong>30 นาที</strong>" },
  resetButton:        { en: "Reset Password",                                                                       th: "รีเซ็ตรหัสผ่าน" },
  resetIgnore:        { en: "If you didn't request this, you can safely ignore this email. Your password will remain unchanged.", th: "หากคุณไม่ได้ส่งคำขอนี้ คุณสามารถเพิกเฉยอีเมลนี้ได้ รหัสผ่านของคุณจะไม่ถูกเปลี่ยนแปลง" },
  resetFallback:      { en: "If the button doesn't work, copy and paste this link into your browser:",               th: "หากปุ่มไม่ทำงาน ให้คัดลอกลิงก์นี้ไปวางในเบราว์เซอร์:" },
  // Password changed
  changedTitle:       { en: "Password Changed Successfully",                                                        th: "เปลี่ยนรหัสผ่านสำเร็จ" },
  changedSubject:     { en: "HARI - Password Changed Successfully",                                                 th: "HARI - เปลี่ยนรหัสผ่านสำเร็จ" },
  changedBody:        { en: "Your password has been successfully reset. You can now log in with your new password.",  th: "รหัสผ่านของคุณถูกรีเซ็ตเรียบร้อยแล้ว คุณสามารถเข้าสู่ระบบด้วยรหัสผ่านใหม่ได้" },
  changedWarning:     { en: "If you did not make this change, please contact your HR administrator immediately.",    th: "หากคุณไม่ได้ทำการเปลี่ยนแปลงนี้ กรุณาติดต่อ HR ของคุณทันที" },
  // Notification
  viewButton:         { en: "View in HARI",                                                                          th: "ดูใน HARI" },
  notifFooter:        { en: "You can turn off email notifications in",                                               th: "คุณสามารถปิดการแจ้งเตือนอีเมลได้ที่" },
  settings:           { en: "Settings",                                                                              th: "ตั้งค่า" },
  // Greeting
  hi:                 { en: "Hi",                                                                                    th: "สวัสดี" },
};

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

  private resolveLang(lang?: string): Lang {
    return lang === "th" ? "th" : "en";
  }

  /** Shared HTML wrapper matching HARI CI — primary #3498db, font LINE Seed Sans TH */
  private wrapHtml(body: string, lang: Lang): string {
    return `
<!DOCTYPE html>
<html lang="${lang}">
<head><meta charset="UTF-8" /></head>
<body style="margin:0;padding:0;background:#f8f9fa;">
  <div style="font-family:'LINE Seed Sans TH','Segoe UI',Tahoma,Geneva,Verdana,sans-serif;max-width:600px;margin:0 auto;padding:40px 20px;">
    <!-- Header -->
    <div style="background:linear-gradient(135deg,#2c3e50 0%,#101922 100%);border-radius:12px 12px 0 0;padding:36px 40px;text-align:center;">
      <h1 style="color:#ffffff;margin:0;font-size:32px;font-weight:700;letter-spacing:1px;">HARI</h1>
      <p style="color:#a0aec0;margin:6px 0 0;font-size:13px;">${t.tagline[lang]}</p>
    </div>

    <!-- Accent bar -->
    <div style="height:4px;background:linear-gradient(90deg,#3498db,#1abc9c);"></div>

    <!-- Body -->
    <div style="background:#ffffff;padding:32px 36px;border:1px solid #e2e8f0;border-top:none;border-radius:0 0 12px 12px;">
      ${body}
    </div>

    <!-- Footer -->
    <p style="color:#617589;font-size:12px;text-align:center;margin-top:24px;line-height:1.5;">
      ${t.copyright[lang]}
    </p>
  </div>
</body>
</html>`;
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
    lang?: string,
  ): Promise<void> {
    const l = this.resolveLang(lang);
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const resetLink = `${frontendUrl}/#/reset-password?token=${resetToken}`;
    const safeName = userName ? this.escapeHtml(userName) : "";
    const greeting = safeName ? `${t.hi[l]} ${safeName},` : `${t.hi[l]},`;

    const body = `
      <h2 style="color:#2c3e50;margin-top:0;font-size:22px;">${t.resetTitle[l]}</h2>
      <p style="color:#4a5568;line-height:1.7;">${greeting}</p>
      <p style="color:#4a5568;line-height:1.7;">${t.resetBody[l]}</p>
      <div style="text-align:center;margin:28px 0;">
        <a href="${resetLink}"
           style="background:#3498db;color:#ffffff;padding:14px 36px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;font-size:15px;">
          ${t.resetButton[l]}
        </a>
      </div>
      <p style="color:#617589;font-size:13px;line-height:1.6;">${t.resetIgnore[l]}</p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0;" />
      <p style="color:#a0aec0;font-size:12px;">
        ${t.resetFallback[l]}<br/>
        <a href="${resetLink}" style="color:#3498db;word-break:break-all;">${resetLink}</a>
      </p>`;

    await this.sendEmail(to, t.resetSubject[l], this.wrapHtml(body, l));
  }

  async sendPasswordResetConfirmation(
    to: string,
    userName?: string,
    lang?: string,
  ): Promise<void> {
    const l = this.resolveLang(lang);
    const safeName = userName ? this.escapeHtml(userName) : "";
    const greeting = safeName ? `${t.hi[l]} ${safeName},` : `${t.hi[l]},`;

    const body = `
      <h2 style="color:#2c3e50;margin-top:0;font-size:22px;">${t.changedTitle[l]}</h2>
      <p style="color:#4a5568;line-height:1.7;">${greeting}</p>
      <p style="color:#4a5568;line-height:1.7;">${t.changedBody[l]}</p>
      <p style="color:#e74c3c;font-size:13px;line-height:1.6;margin-top:20px;">${t.changedWarning[l]}</p>`;

    await this.sendEmail(to, t.changedSubject[l], this.wrapHtml(body, l));
  }

  async sendNotificationEmail(
    to: string,
    title: string,
    message: string,
    link?: string,
    lang?: string,
  ): Promise<void> {
    const l = this.resolveLang(lang);
    const frontendUrl = process.env.FRONTEND_URL || "http://localhost:5173";
    const actionUrl = link ? `${frontendUrl}/#${link}` : frontendUrl;

    const body = `
      <h2 style="color:#2c3e50;margin-top:0;font-size:22px;">${this.escapeHtml(title)}</h2>
      <p style="color:#4a5568;line-height:1.7;">${this.escapeHtml(message)}</p>
      ${link ? `
      <div style="text-align:center;margin:24px 0;">
        <a href="${actionUrl}"
           style="background:#3498db;color:#ffffff;padding:12px 32px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block;font-size:15px;">
          ${t.viewButton[l]}
        </a>
      </div>` : ""}
      <p style="color:#617589;font-size:12px;text-align:center;margin-top:20px;">
        ${t.notifFooter[l]} <a href="${frontendUrl}/#/settings" style="color:#3498db;">${t.settings[l]}</a>
      </p>`;

    await this.sendEmail(to, `HARI — ${title}`, this.wrapHtml(body, l));
  }
}

export default new EmailService();
