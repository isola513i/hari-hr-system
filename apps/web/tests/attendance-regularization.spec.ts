import { test, expect, type Page, type Locator } from '@playwright/test';

/**
 * E2E: Attendance Regularization ("Request Attendance Correction") date-picker blocking.
 *
 * Verifies the modal's custom DatePicker disables dates a correction can't be filed on:
 *   1. the employee's non-working weekdays (default Mon–Fri → weekends disabled)
 *   2. public holidays (fed from GET /holidays via useHolidayDateSet)
 *
 * REQUIREMENTS to run (this suite drives the REAL app + API, no mocks):
 *   - Web dev server on http://localhost:5173 and API on http://localhost:3001
 *   - A seeded DB with the login accounts below
 *
 * Configurable via env (defaults match apps/api/src/scripts/seed-demo.ts):
 *   EMPLOYEE_EMAIL / EMPLOYEE_PASSWORD  — an EMPLOYEE-role account (sees the dashboard "Fix Time" button)
 *   ADMIN_EMAIL    / ADMIN_PASSWORD     — an HR_ADMIN account (seeds/cleans up the test holiday)
 *   E2E_API_URL                         — API base, default http://localhost:3001/api
 *
 * Accounts must not have 2FA enabled. The UI is forced to English for stable selectors.
 */

const EMPLOYEE_EMAIL = process.env.EMPLOYEE_EMAIL ?? 'somchai@aiya.ai';
const EMPLOYEE_PASSWORD = process.env.EMPLOYEE_PASSWORD ?? 'Demo123!';
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@aiya.ai';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'Welcome123!';
const API_URL = process.env.E2E_API_URL ?? 'http://localhost:3001/api';
const ORIGIN = 'http://localhost:5173';

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const monthYearLabel = (d: Date) => `${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
const todayTriggerLabel = () =>
  new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

/** Most recent date in [minBack, maxBack] days ago whose weekday matches. */
function recentDate(match: (dow: number) => boolean, maxBack = 27, minBack = 1): Date {
  for (let i = minBack; i <= maxBack; i++) {
    const d = new Date();
    d.setHours(12, 0, 0, 0);
    d.setDate(d.getDate() - i);
    if (match(d.getDay())) return d;
  }
  throw new Error('no matching recent date found');
}
const iso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

// Before any app code runs: force English UI (stable selectors) and employee view
// (so admin-role accounts still land on the EmployeeDashboard where the modal lives).
test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    window.localStorage.setItem('language', 'en');
    window.sessionStorage.setItem('viewMode', 'employee'); // AuthContext reads this
  });
});

async function login(page: Page, email: string, password: string) {
  await page.goto('/');
  await page.locator('input[type="email"]').fill(email);
  await page.locator('input[type="password"]').fill(password);
  await page.getByRole('button', { name: 'Sign In' }).click();
  // "Fix Time" (open correction modal) lives on the EmployeeDashboard.
  await expect(page.getByRole('button', { name: 'Fix Time' })).toBeVisible({ timeout: 15000 });
}

/** Open the correction modal, open its date picker, and return the calendar popover locator. */
async function openPickerCalendar(page: Page): Promise<Locator> {
  await page.getByRole('button', { name: 'Fix Time' }).click();
  const modal = page.locator('div.bg-card-light', {
    has: page.getByRole('heading', { name: 'Request Attendance Correction' }),
  });
  await expect(modal).toBeVisible();
  // Hint that documents the feature is present.
  await expect(modal.getByText('Days off and public holidays cannot be selected.')).toBeVisible();
  // The DatePicker trigger shows today's formatted date by default.
  await modal.getByRole('button', { name: todayTriggerLabel() }).click();
  // The calendar renders in a portal (document.body), identified by its month-nav buttons.
  const calendar = page.locator('div.shadow-xl', { has: page.getByRole('button', { name: 'Previous month' }) });
  await expect(calendar).toBeVisible();
  return calendar;
}

/** Navigate the calendar (either direction) until its header shows the target month. */
async function navigateToMonth(calendar: Locator, target: Date) {
  const header = calendar.locator('span.font-semibold').first();
  const targetIdx = target.getFullYear() * 12 + target.getMonth();
  for (let i = 0; i < 36; i++) {
    const [mName, yStr] = (await header.innerText()).trim().split(' ');
    const curIdx = parseInt(yStr, 10) * 12 + MONTHS.indexOf(mName);
    if (curIdx === targetIdx) return;
    await calendar.getByRole('button', { name: curIdx < targetIdx ? 'Next month' : 'Previous month' }).click();
  }
  throw new Error(`could not navigate to ${monthYearLabel(target)}`);
}

/** The day-number cell button within the calendar's day grid (not the weekday-name row). */
function dayCell(calendar: Locator, d: Date): Locator {
  const dayGrid = calendar.locator('.grid.grid-cols-7').last();
  return dayGrid.getByRole('button', { name: String(d.getDate()), exact: true });
}

test.describe.configure({ mode: 'serial' });

test.describe('Attendance regularization — date picker blocking', () => {
  test('disables weekends (non-working days) but allows working weekdays', async ({ page }) => {
    const sunday = recentDate((dow) => dow === 0);
    const weekday = recentDate((dow) => dow >= 1 && dow <= 5);

    await login(page, EMPLOYEE_EMAIL, EMPLOYEE_PASSWORD);
    const calendar = await openPickerCalendar(page);

    // Weekend → disabled
    await navigateToMonth(calendar, sunday);
    await expect(dayCell(calendar, sunday)).toBeDisabled();

    // Working weekday within range → selectable (assumes it is not itself a public holiday)
    await navigateToMonth(calendar, weekday);
    await expect(dayCell(calendar, weekday)).toBeEnabled();
  });

  test('disables a public holiday that falls on a working weekday', async ({ page, request }) => {
    // A recent weekday within the selectable window (kept ≥6 days back so it doesn't
    // collide with the weekday used by the previous test); seed a one-off holiday on it.
    const holidayDate = recentDate((dow) => dow >= 1 && dow <= 5, 20, 6);

    // --- seed: admin login + create holiday ---
    const loginRes = await request.post(`${API_URL}/auth/login`, {
      headers: { Origin: ORIGIN },
      data: { email: ADMIN_EMAIL, password: ADMIN_PASSWORD },
    });
    expect(loginRes.ok(), 'admin login for holiday seeding').toBeTruthy();
    const token: string = (await loginRes.json()).token;

    const createRes = await request.post(`${API_URL}/holidays`, {
      headers: { Origin: ORIGIN, Authorization: `Bearer ${token}` },
      data: { date: iso(holidayDate), name: `E2E Test Holiday ${Date.now()}`, isRecurring: false },
    });
    expect(createRes.ok(), 'create test holiday').toBeTruthy();
    const holidayId: string = (await createRes.json()).id;

    try {
      await login(page, EMPLOYEE_EMAIL, EMPLOYEE_PASSWORD);
      const calendar = await openPickerCalendar(page);
      await navigateToMonth(calendar, holidayDate);
      // The seeded holiday day (a weekday) must be disabled — proving holiday blocking, not weekend blocking.
      await expect(dayCell(calendar, holidayDate)).toBeDisabled();
    } finally {
      // --- cleanup ---
      await request.delete(`${API_URL}/holidays/${holidayId}`, {
        headers: { Origin: ORIGIN, Authorization: `Bearer ${token}` },
      });
    }
  });
});
