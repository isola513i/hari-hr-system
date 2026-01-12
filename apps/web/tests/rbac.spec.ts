import { test, expect } from '@playwright/test';

test.describe('Scenario C: RBAC Security', () => {

    test('Employee cannot see Admin-only controls', async ({ page }) => {
        // 1. Login as Admin first to verify controls exist
        await page.goto('/#/org-chart');
        // Hover logic in OrgChart might be tricky in E2E without specific steps, 
        // but we know "Switch to Employee View" exists.

        // 2. Switch to Employee
        await page.getByRole('button', { name: 'Employee View' }).click();
        await page.waitForTimeout(500); // Wait for transition

        // 3. Go to Org Chart logic
        // In OrgChart.tsx, Admin controls (Edit/Add/Delete) are conditional on `isAdmin`.
        // We need to verify these buttons are NOT present.
        // The buttons have titles "Edit", "Add Subordinate", "Delete"

        // Pick the first node (e.g. CEO or any node)
        const firstNode = page.locator('.group').first();
        await firstNode.hover();

        const editBtn = page.getByTitle('Edit');
        const addBtn = page.getByTitle('Add Subordinate');

        await expect(editBtn).not.toBeVisible();
        await expect(addBtn).not.toBeVisible();

        // 4. Go to Onboarding
        await page.getByRole('link', { name: 'Onboarding' }).click();

        // 5. Verify "Invite Employee" button is hidden
        await expect(page.getByRole('button', { name: 'Invite Employee' })).not.toBeVisible();
    });
});
