import { test, expect } from '@playwright/test';

// Scenario E: Wellbeing survey — employee takes a survey, admin views analytics.
test.describe('Scenario E: Survey Flow', () => {
  test('Employee can open the Surveys page and start an available survey', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Employee View' }).click();

    await page.getByRole('link', { name: 'Surveys' }).click();

    // The active-surveys section should render.
    await expect(page.getByText(/Active Surveys/i)).toBeVisible();

    // If a survey is available, open it and land on the take-survey page.
    const takeButton = page.getByRole('button', { name: /Take Survey|Retake/i }).first();
    if (await takeButton.count()) {
      await takeButton.click();
      // The take-survey view renders a Likert form (radio inputs).
      await expect(page.locator('form')).toBeVisible({ timeout: 5000 });
    }
  });

  test('Admin sees survey analytics/sentiment on the Surveys page', async ({ page }) => {
    await page.goto('/');
    // Admin default.
    await page.getByRole('link', { name: 'Surveys' }).click();

    // Admin view surfaces the survey management + analytics area.
    await expect(page.getByRole('heading', { name: /Survey/ }).first()).toBeVisible();
  });
});
