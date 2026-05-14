import cron from 'node-cron';
import { query } from '../db';
import NotificationService from './NotificationService';

async function checkBirthdays(): Promise<void> {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
  const [, month, day] = today.split('-');

  try {
    // Find employees whose birthday is today (ignore year)
    const result = await query(
      `SELECT e.id, e.name, e.user_id, e.manager_id,
              m.user_id AS manager_user_id
       FROM employees e
       LEFT JOIN employees m ON m.id = e.manager_id
       WHERE e.status = 'Active'
         AND e.birth_date IS NOT NULL
         AND EXTRACT(MONTH FROM e.birth_date) = $1
         AND EXTRACT(DAY   FROM e.birth_date) = $2`,
      [parseInt(month, 10), parseInt(day, 10)]
    );

    for (const emp of result.rows) {
      // Notify the employee
      if (emp.user_id) {
        await NotificationService.create({
          user_id: emp.user_id,
          title: '🎂 Happy Birthday!',
          message: `Wishing you a wonderful birthday, ${emp.name}! 🎉`,
          type: 'info',
          link: '/my-profile',
        });
      }

      // Notify the manager
      if (emp.manager_user_id) {
        await NotificationService.create({
          user_id: emp.manager_user_id,
          title: `🎂 ${emp.name}'s Birthday Today`,
          message: `Today is ${emp.name}'s birthday. Don't forget to wish them well!`,
          type: 'info',
          link: `/employees/${emp.id}`,
        });
      }

      // Notify HR admins
      await NotificationService.notifyAdmins({
        title: `🎂 ${emp.name}'s Birthday Today`,
        message: `Today is ${emp.name}'s birthday.`,
        type: 'info',
        link: `/employees/${emp.id}`,
      });
    }

    if (result.rows.length > 0) {
      console.log(`[MilestoneScheduler] Birthday notifications sent for ${result.rows.length} employee(s)`);
    }
  } catch (err) {
    console.error('[MilestoneScheduler] Birthday check error:', err);
  }
}

async function checkWorkAnniversaries(): Promise<void> {
  const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Bangkok' });
  const [year, month, day] = today.split('-');

  try {
    const result = await query(
      `SELECT e.id, e.name, e.user_id, e.manager_id,
              e.join_date,
              m.user_id AS manager_user_id,
              ($1::int - EXTRACT(YEAR FROM e.join_date)::int) AS years
       FROM employees e
       LEFT JOIN employees m ON m.id = e.manager_id
       WHERE e.status = 'Active'
         AND e.join_date IS NOT NULL
         AND EXTRACT(MONTH FROM e.join_date) = $2
         AND EXTRACT(DAY   FROM e.join_date) = $3
         AND EXTRACT(YEAR  FROM e.join_date) < $1::int`,
      [parseInt(year, 10), parseInt(month, 10), parseInt(day, 10)]
    );

    for (const emp of result.rows) {
      const years: number = emp.years;
      const suffix = years === 1 ? 'year' : 'years';

      // Notify the employee
      if (emp.user_id) {
        await NotificationService.create({
          user_id: emp.user_id,
          title: `🎉 ${years}-${suffix} Work Anniversary!`,
          message: `Congratulations on ${years} ${suffix} with the company, ${emp.name}! Thank you for your dedication. 🏆`,
          type: 'info',
          link: '/my-profile',
        });
      }

      // Notify the manager
      if (emp.manager_user_id) {
        await NotificationService.create({
          user_id: emp.manager_user_id,
          title: `🎉 ${emp.name}'s ${years}-${suffix} Anniversary`,
          message: `${emp.name} is celebrating ${years} ${suffix} at the company today!`,
          type: 'info',
          link: `/employees/${emp.id}`,
        });
      }

      // Notify HR admins
      await NotificationService.notifyAdmins({
        title: `🎉 ${emp.name}'s ${years}-${suffix} Anniversary`,
        message: `${emp.name} is celebrating ${years} ${suffix} at the company today.`,
        type: 'info',
        link: `/employees/${emp.id}`,
      });
    }

    if (result.rows.length > 0) {
      console.log(`[MilestoneScheduler] Anniversary notifications sent for ${result.rows.length} employee(s)`);
    }
  } catch (err) {
    console.error('[MilestoneScheduler] Anniversary check error:', err);
  }
}

export function initMilestoneScheduler(): void {
  const timezone = process.env.CRON_TIMEZONE || 'Asia/Bangkok';
  const milestoneCron = process.env.CRON_MILESTONE || '0 8 * * *';

  cron.schedule(milestoneCron, async () => {
    await checkBirthdays();
    await checkWorkAnniversaries();
  }, { timezone });

  console.log(`[MilestoneScheduler] Initialized (cron: ${milestoneCron}, tz: ${timezone})`);
}
