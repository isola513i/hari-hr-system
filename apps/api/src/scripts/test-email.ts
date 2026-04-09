import dotenv from "dotenv";
dotenv.config();

import emailService from "../services/EmailService";

const TARGET_EMAIL = process.argv[2] || "nattapat@aiya.ai";
const LANG = process.argv[3] || "en";

async function main() {
  console.log("=== HARI Email Test ===");
  console.log(`Sending test emails to: ${TARGET_EMAIL} (lang: ${LANG})`);
  console.log(`AWS_SES_REGION: ${process.env.AWS_SES_REGION}`);
  console.log(`AWS_SES_FROM_EMAIL: ${process.env.AWS_SES_FROM_EMAIL}`);
  console.log();

  // Test 1: Notification email
  console.log("[1/3] Sending notification email...");
  await emailService.sendNotificationEmail(
    TARGET_EMAIL,
    "Test Notification",
    "This is a test email from HARI HR System to verify AWS SES integration is working correctly.",
    "/dashboard",
    LANG,
  );
  console.log("[1/3] Done!\n");

  // Test 2: Password reset email
  console.log("[2/3] Sending password reset email...");
  await emailService.sendPasswordResetEmail(
    TARGET_EMAIL,
    "fake-test-token-12345",
    "Nattapat",
    LANG,
  );
  console.log("[2/3] Done!\n");

  // Test 3: Password reset confirmation
  console.log("[3/3] Sending password reset confirmation...");
  await emailService.sendPasswordResetConfirmation(TARGET_EMAIL, "Nattapat", LANG);
  console.log("[3/3] Done!\n");

  console.log("=== All 3 test emails sent successfully! ===");
  console.log(`Check inbox: ${TARGET_EMAIL}`);
}

main().catch((err) => {
  console.error("Failed to send email:", err.message);
  process.exit(1);
});
