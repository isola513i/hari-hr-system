import { test, expect } from '@playwright/test';

test.describe('Scenario A: Leave Request Flow', () => {

    test('Employee can submit leave request and Admin can approve it', async ({ page }) => {
        // 1. Login as Employee
        await page.goto('/');
        // Currently defaults to Admin, so switch to Employee
        await page.getByRole('button', { name: 'Employee View' }).click();

        await expect(page.getByText(/Good Morning/)).toBeVisible();

        // 2. Go to Time Off
        await page.getByRole('link', { name: 'Time Off' }).click();

        // Check Initial Balance (Vacation = 20)
        // Note: MOCK_LEAVE_REQUESTS might have prior data for '4' (Sophia), but Olivia (id 6) should be fresh or 20.
        // Let's check for "20 Days Left" or "Total 20 days" if used is 0.
        // Actually logic is: remaining = total - used.
        // If 0 used, remaining = 20.
        await expect(page.getByText('20 Days Left')).toBeVisible();

        // 3. Request Time Off
        await page.getByRole('button', { name: 'New Request' }).click();

        // Fill Form
        await page.locator('select').first().selectOption('Vacation'); // Type

        // Select dates: 2 days
        await page.locator('input[type="date"]').first().fill('2024-08-15');
        await page.locator('input[type="date"]').last().fill('2024-08-16');

        await page.locator('textarea').fill('Feeling unwell'); // Form field is Reason

        await page.getByRole('button', { name: 'Submit' }).click();

        // 4. Verify Pending in List (Employee View)
        await expect(page.getByText('Vacation').first()).toBeVisible();
        await expect(page.getByText('Pending').first()).toBeVisible();

        // 5. Switch to Admin to Approve
        await page.getByRole('button', { name: 'Admin View' }).click();

        // Ensure we are on Dashboard where the Approve button is
        await page.getByRole('link', { name: 'Dashboard' }).click();

        // 6. Approve (Admin View)
        // Open Leave Modal (The button with CheckCircle2)
        await page.getByRole('button', { name: 'Approve Leave' }).click();

        // Find the request and approve
        // Since it's the latest, it should be at the top or visible
        // We look for the one we just added (Olivia Roe, Vacation, dates)
        // For simplicity, just approve the first 'Approve' button found in the modal
        await page.locator('button[title="Approve"]').first().click();

        // Close modal
        await page.getByRole('button', { name: 'Close' }).click();

        // 7. Switch back to Employee to check Balance
        await page.getByRole('button', { name: 'Employee View' }).click();
        await page.getByRole('link', { name: 'Time Off' }).click();

        // 8. Verify Balance Decreased
        // 20 - 2 = 18
        await expect(page.getByText('18 Days Left')).toBeVisible();
    });
});
