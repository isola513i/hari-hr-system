import { test, expect } from '@playwright/test';

test.describe('Scenario B: Employee Onboarding -> Org Chart', () => {

    test('Invited employee appears in Org Chart', async ({ page }) => {
        // 1. Login as Admin (Default)
        await page.goto('/');

        // 2. Go to Onboarding
        await page.getByRole('link', { name: 'Onboarding' }).click();

        // 3. Invite Employee
        await page.getByRole('button', { name: 'Invite Employee' }).click();

        await page.getByPlaceholder('e.g. Sarah Connor').fill('Test New Hire');
        await page.getByPlaceholder('e.g. sarah@example.com').fill('test@newhire.com');
        await page.getByPlaceholder('e.g. Developer').fill('Junior Dev');
        await page.getByPlaceholder('e.g. Engineering').fill('Engineering');
        // Start date
        await page.locator('input[type="date"]').fill('2024-09-01');

        // Handle Alert
        page.on('dialog', dialog => dialog.dismiss());
        await page.getByRole('button', { name: 'Send Invitation' }).click();

        // 4. Go to Org Chart
        await page.getByRole('link', { name: 'Org Chart' }).click();

        // 5. Verify New Hire exists
        // NOTE: This IS EXPECTED TO FAIL because backend logic is missing
        const newHireNode = page.getByText('Test New Hire');
        await expect(newHireNode).toBeVisible({ timeout: 5000 });
    });
});
