import { test, expect } from '@playwright/test';

// Scenario F: Onboarding checklist — admin reviews onboarding tasks/documents.
// (Complements onboarding-org.spec.ts which covers the invite → org-chart path.)
test.describe('Scenario F: Onboarding Checklist', () => {
  test('Admin can open Onboarding and see the checklist/overview', async ({ page }) => {
    await page.goto('/');
    // Admin is the default view.
    await page.getByRole('link', { name: 'Onboarding' }).click();

    // The onboarding page renders its overview + an admin-only invite action.
    await expect(page.getByRole('button', { name: 'Invite Employee' })).toBeVisible();

    // A task checklist or document checklist section should be present.
    await expect(
      page.getByText(/Task|Checklist|Document|Onboarding/i).first()
    ).toBeVisible();
  });

  test('Employee does not see the admin invite control on Onboarding', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('button', { name: 'Employee View' }).click();

    await page.getByRole('link', { name: 'Onboarding' }).click();

    // Invite is admin-only.
    await expect(page.getByRole('button', { name: 'Invite Employee' })).not.toBeVisible();
  });
});
