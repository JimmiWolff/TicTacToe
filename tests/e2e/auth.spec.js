const { test, expect } = require('@playwright/test');

test.describe('Authentication', () => {
  test('authenticated user sees room selection modal', async ({ page }) => {
    await page.goto('/');

    // With saved auth state, the app should skip login and show room modal
    // Allow time for Auth0 SDK to restore session and Socket.IO to connect
    await expect(page.locator('#roomModal')).toBeVisible({ timeout: 20_000 });
  });

  test('login modal is not visible when authenticated', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#roomModal')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('#loginModal')).toBeHidden();
  });

  test('room selection has Create Room button', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#roomModal')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('#createRoomBtn')).toBeVisible();
  });

  test('room selection has Quick Play button', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#roomModal')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('#quickPlayBtn')).toBeVisible();
  });

  test('room selection has Join Room form', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#roomModal')).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('#joinRoomForm')).toBeVisible();
    await expect(page.locator('#roomCodeInput')).toBeVisible();
  });

  test('logout returns to login modal', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#roomModal')).toBeVisible({ timeout: 20_000 });

    // Join a room first so the game container (with logout button) is visible
    await page.locator('#createRoomBtn').click();
    await expect(page.locator('#gameContainer')).toBeVisible({ timeout: 10_000 });

    // Click logout
    await page.locator('#logoutBtn').click();

    // Should return to login modal
    await expect(page.locator('#loginModal')).toBeVisible({ timeout: 15_000 });
  });
});
