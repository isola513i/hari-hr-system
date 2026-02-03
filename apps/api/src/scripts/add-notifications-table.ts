import * as dotenv from "dotenv";
import * as path from "path";

// Load env vars from the correct location
const envPath = path.resolve(__dirname, "../../.env");
console.log("Loading .env from:", envPath);
dotenv.config({ path: envPath });

import pool from "../db";

const addNotificationsTable = async () => {
  try {
    console.log("Connecting to database...");
    console.log("Adding notifications table...");

    await pool.query(`
      -- Create notifications table if it doesn't exist
      CREATE TABLE IF NOT EXISTS notifications (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          title VARCHAR(255) NOT NULL,
          message TEXT NOT NULL,
          type VARCHAR(50) DEFAULT 'info',
          read BOOLEAN DEFAULT FALSE,
          link VARCHAR(255),
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      -- Create indexes if they don't exist
      CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
      CREATE INDEX IF NOT EXISTS idx_notifications_read ON notifications(read);
      CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at DESC);
    `);

    console.log("Notifications table created successfully!");
  } catch (err) {
    console.error("Error adding notifications table:", err);
    throw err;
  } finally {
    await pool.end();
  }
};

addNotificationsTable().catch((err) => {
  console.error(err);
  process.exit(1);
});
