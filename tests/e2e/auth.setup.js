const { test: setup, expect } = require('@playwright/test');

const authFile = 'tests/e2e/.auth/user.json';

setup('authenticate via Auth0', async ({ page }) => {
  const email = process.env.E2E_AUTH0_EMAIL;
  const password = process.env.E2E_AUTH0_PASSWORD;

  if (!email || !password) {
    throw new Error(
      'E2E_AUTH0_EMAIL and E2E_AUTH0_PASSWORD must be set in .env'
    );
  }

  // Navigate to the app
  await page.goto('/');

  // Wait for the login modal to be visible
  await expect(page.locator('#loginModal')).toBeVisible();

  // Wait for Auth0 SDK to load (button text changes from generic to "Login")
  await expect(page.locator('#auth0LoginBtn')).toBeEnabled({ timeout: 15_000 });

  // Click the login button - this redirects to Auth0 Universal Login
  await page.locator('#auth0LoginBtn').click();

  // Wait for Auth0 login page to load
  await page.waitForURL(/auth0\.com|\.auth0\.com/, { timeout: 15_000 });

  // Fill in credentials on Auth0 Universal Login page
  // Auth0 Universal Login has different layouts; try common selectors
  const emailInput = page.locator(
    'input[name="email"], input[name="username"], input[id="username"], input[type="email"]'
  ).first();
  await emailInput.waitFor({ state: 'visible', timeout: 10_000 });
  await emailInput.fill(email);

  const passwordInput = page.locator(
    'input[name="password"], input[id="password"], input[type="password"]'
  ).first();
  await passwordInput.waitFor({ state: 'visible', timeout: 10_000 });
  await passwordInput.fill(password);

  // Submit the login form
  await page.locator(
    'button[type="submit"], button[name="submit"], button[data-action-button-primary]'
  ).first().click();

  // Wait for redirect back to the app
  await page.waitForURL('http://localhost:3000/**', { timeout: 30_000 });

  // After login, the app might show the username modal (first-time user)
  // or go straight to the room selection modal.
  // Wait for either to appear.
  const usernameModal = page.locator('#usernameModal');
  const roomModal = page.locator('#roomModal');

  await expect(
    usernameModal.or(roomModal)
  ).toBeVisible({ timeout: 20_000 });

  // Handle username setup if it appears
  if (await usernameModal.isVisible()) {
    const desiredUsername = process.env.E2E_AUTH0_USERNAME || 'TestPlayer1';
    await page.locator('#displayUsername').fill(desiredUsername);
    await page.locator('#usernameForm button[type="submit"]').click();

    // Wait for room modal after username setup
    await expect(roomModal).toBeVisible({ timeout: 15_000 });
  }

  // Room modal is now visible - auth is complete
  await expect(roomModal).toBeVisible();

  // Save the authenticated state
  await page.context().storageState({ path: authFile });
});
