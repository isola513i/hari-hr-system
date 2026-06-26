import logger from '../utils/logger';
import webpush, { PushSubscription } from 'web-push';
import { query } from '../db';

const VAPID_PUBLIC_KEY = process.env.VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:noreply@example.com';

let vapidConfigured = false;
if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  vapidConfigured = true;
}

export interface PushPayload {
  title: string;
  body: string;
  icon?: string;
  badge?: string;
  url?: string;
}

class PushService {
  get publicKey(): string {
    return VAPID_PUBLIC_KEY;
  }

  get isConfigured(): boolean {
    return vapidConfigured;
  }

  async saveSubscription(userId: string, subscription: PushSubscription): Promise<void> {
    const { endpoint, keys } = subscription;
    await query(
      `INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (user_id, endpoint) DO UPDATE
         SET p256dh = EXCLUDED.p256dh,
             auth = EXCLUDED.auth,
             updated_at = CURRENT_TIMESTAMP`,
      [userId, endpoint, keys.p256dh, keys.auth]
    );
  }

  async removeSubscription(userId: string, endpoint: string): Promise<void> {
    await query(
      `DELETE FROM push_subscriptions WHERE user_id = $1 AND endpoint = $2`,
      [userId, endpoint]
    );
  }

  async sendToUser(userId: string, payload: PushPayload): Promise<void> {
    if (!vapidConfigured) return;

    const result = await query(
      `SELECT endpoint, p256dh, auth FROM push_subscriptions WHERE user_id = $1`,
      [userId]
    );

    const body = JSON.stringify(payload);
    const sends = result.rows.map(async (row: { endpoint: string; p256dh: string; auth: string }) => {
      const subscription: PushSubscription = {
        endpoint: row.endpoint,
        keys: { p256dh: row.p256dh, auth: row.auth },
      };
      try {
        await webpush.sendNotification(subscription, body);
      } catch (err: any) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          // Subscription expired or invalid — clean it up
          await query(
            `DELETE FROM push_subscriptions WHERE endpoint = $1`,
            [row.endpoint]
          ).catch((err) => logger.warn(err, 'Background task failed'));
        } else {
          console.error('PushService: send error', err.message);
        }
      }
    });

    await Promise.allSettled(sends);
  }
}

export default new PushService();
