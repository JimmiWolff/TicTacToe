const { test, expect } = require('@playwright/test');

// These tests run without authentication (no-auth project)
test.describe('Page Load', () => {
  test('page loads with correct title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Kryds og Bolle|Tic Tac Toe/);
  });

  test('login modal is visible on fresh load', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#loginModal')).toBeVisible();
  });

  test('login button exists and is enabled', async ({ page }) => {
    await page.goto('/');
    const loginBtn = page.locator('#auth0LoginBtn');
    await expect(loginBtn).toBeVisible();
    await expect(loginBtn).toBeEnabled({ timeout: 15_000 });
  });

  test('register button exists', async ({ page }) => {
    await page.goto('/');
    const registerBtn = page.locator('#registerBtn');
    await expect(registerBtn).toBeVisible();
  });

  test('game container is hidden before login', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#gameContainer')).toBeHidden();
  });

  test('game board cells exist in the DOM', async ({ page }) => {
    await page.goto('/');
    const cells = page.locator('.cell');
    await expect(cells).toHaveCount(9);
  });
});
