import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

// SSL: explicit DATABASE_SSL wins ('true'/'false'); otherwise default to SSL in
// production only. Lets a self-hosted/Docker Postgres (no SSL) run in prod mode.
const sslSetting =
    process.env.DATABASE_SSL === 'false'
        ? false
        : process.env.DATABASE_SSL === 'true'
            ? { rejectUnauthorized: false }
            : process.env.NODE_ENV === 'production'
                ? { rejectUnauthorized: false }
                : false;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: sslSetting,
    max: 20,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 30000,
    statement_timeout: 30000,
});

pool.on('error', (err) => {
    console.error('Unexpected error on idle client', err);
    process.exit(-1);
});

export const query = (text: string, params?: any[]) => pool.query(text, params);
export default pool;
