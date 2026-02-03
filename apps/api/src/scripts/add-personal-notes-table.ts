import * as dotenv from "dotenv";
import * as path from "path";

const envPath = path.resolve(__dirname, "../../.env");
console.log("Loading .env from:", envPath);
dotenv.config({ path: envPath });

import pool from "../db";

const addPersonalNotesTable = async () => {
  try {
    console.log("Connecting to database...");
    console.log("Adding personal_notes table...");

    await pool.query(`
      CREATE TABLE IF NOT EXISTS personal_notes (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
          content TEXT NOT NULL,
          color VARCHAR(20) DEFAULT 'default',
          pinned BOOLEAN DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_personal_notes_user_id ON personal_notes(user_id);
      CREATE INDEX IF NOT EXISTS idx_personal_notes_pinned ON personal_notes(pinned DESC);
      CREATE INDEX IF NOT EXISTS idx_personal_notes_updated_at ON personal_notes(updated_at DESC);
    `);

    console.log("Personal notes table created successfully!");
  } catch (err) {
    console.error("Error adding personal_notes table:", err);
    throw err;
  } finally {
    await pool.end();
  }
};

addPersonalNotesTable().catch((err) => {
  console.error(err);
  process.exit(1);
});
