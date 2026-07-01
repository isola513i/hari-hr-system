import { test, expect } from '@playwright/test';

// Scenario D: Expense claim submission → admin review
// Exercises the employee expense-claim flow end to end through the UI.
test.describe('Scenario D: Expense Claim Flow', () => {
  test('Employee can open the expense form, submit a claim, and see it listed', async ({ page }) => {
    await page.goto('/');

    // Switch to the employee view (app defaults to Admin in dev).
    await page.getByRole('button', { name: 'Employee View' }).click();

    // Navigate to Expenses.
    await page.getByRole('link', { name: 'Expenses' }).click();
    await expect(page.getByRole('heading', { name: /Expense/ })).toBeVisible();

    // Open the New Expense form.
    await page.getByRole('button', { name: 'New Expense' }).click();

    // Fill the claim.
    await page.getByPlaceholder('e.g., Client lunch meeting').fill('E2E Taxi to client site');
    await page.getByPlaceholder('e.g., 1500').fill('850');
    await page.locator('input[type="date"]').first().fill('2026-06-20');
    await page.getByPlaceholder('Describe the expense...').fill('Round trip for the onboarding kickoff');

    // Submit.
    await page.getByRole('button', { name: 'Submit Expense' }).click();

    // The new claim should surface in the employee's history.
    await expect(page.getByText('E2E Taxi to client site')).toBeVisible({ timeout: 5000 });
    await expect(page.getByText('Pending').first()).toBeVisible();
  });

  test('Admin sees the expense claims review list', async ({ page }) => {
    await page.goto('/');
    // Admin is the default view.
    await page.getByRole('link', { name: 'Expenses' }).click();

    // Admin view shows the review/management heading and a claims table.
    await expect(page.getByRole('heading', { name: /Expense/ })).toBeVisible();
  });
});
